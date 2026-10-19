import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { API_URL } from "../services/apiConfig";
import { clearSession, ensureFreshSession, getLastActivity, getSessionTimeout, rememberSessionPath, renewSession, scheduleRenewal, setSessionTimeout, tokenLifetime, touchSession } from "../services/session";

const AuthContext = createContext();
const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000;

function extrairMensagemErro(data, fallback) {
  const detail = data?.detail;

  if (!detail) return fallback;
  if (typeof detail === "string") return detail;

  if (Array.isArray(detail)) {
    const mensagens = detail
      .map((item) => (typeof item === "string" ? item : item?.msg))
      .filter(Boolean);
    return mensagens.length ? mensagens.join(" ") : fallback;
  }

  return fallback;
}

async function fetchTimeoutMs() {
  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_URL}/configuracoes`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return null;
    const configs = await res.json();
    const entry = configs.find((c) => c.chave === "timeout_sessao");
    const minutes = entry ? parseInt(entry.valor, 10) : 30;
    return (isNaN(minutes) || minutes <= 0 ? 30 : minutes) * 60 * 1000;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const timerRef = useRef(null);

  const doLogout = useCallback((expired = false) => {
    setUser(null);
    sessionStorage.removeItem("novi-conversa-v1");
    if (expired) rememberSessionPath();
    clearSession();
    window.location.href = "/#/login";
  }, []);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const remaining = getLastActivity() + getSessionTimeout() - Date.now();
    timerRef.current = setTimeout(() => doLogout(true), Math.max(0, remaining));
  }, [doLogout]);

  useEffect(() => {
    if (!user) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    let lastCheck = 0;
    const onActivity = () => {
      if (!touchSession()) return;
      if (Date.now() - lastCheck >= 1000) {
        lastCheck = Date.now();
        ensureFreshSession().catch(() => {});
      }
    };
    const onStorage = (event) => {
      if (event.key === "token" && !event.newValue) doLogout();
      if (["session-last-activity", "session-timeout-ms"].includes(event.key)) resetTimer();
    };
    const onVisibility = () => { if (!document.hidden) resetTimer(); };
    const events = ["mousemove", "keydown", "mousedown", "touchstart", "scroll", "input", "change"];
    events.forEach((e) => window.addEventListener(e, onActivity));
    window.addEventListener("session-activity", resetTimer);
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVisibility);
    const configInterval = setInterval(() => {
      fetchTimeoutMs().then((ms) => {
        if (ms && ms !== getSessionTimeout() && localStorage.getItem("token")) {
          setSessionTimeout(ms);
          if (getLastActivity() && Date.now() - getLastActivity() < ms) renewSession().catch(() => {});
        }
      });
    }, 60000);
    resetTimer();

    return () => {
      events.forEach((e) => window.removeEventListener(e, onActivity));
      window.removeEventListener("session-activity", resetTimer);
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisibility);
      clearInterval(configInterval);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [Boolean(user), resetTimer, doLogout]);

  useEffect(() => {
    let cancelled = false;
    async function restoreSession() {
      const storedToken = localStorage.getItem("token");
      try {
        const storedUser = JSON.parse(localStorage.getItem("user") || "null");
        if (!storedToken || !storedUser) return;
        if (getLastActivity() && Date.now() - getLastActivity() >= getSessionTimeout()) {
          doLogout(true);
          return;
        }
        const endpoint = storedUser.tipo === "admin" ? "/admin/me" : "/usuario/me";
        const res = await fetch(`${API_URL}${endpoint}`, { headers: { Authorization: `Bearer ${storedToken}` } });
        if (res.status === 401 || res.status === 403) {
          if (localStorage.getItem("token") === storedToken) doLogout(true);
          return;
        }
        if (!res.ok) throw new Error("Sessão indisponível");
        const perfil = await res.json();
        // Um login iniciado enquanto a sessão antiga era validada vence a
        // restauração; a resposta atrasada não pode substituir o novo perfil.
        if (cancelled || localStorage.getItem("token") !== storedToken) return;
        const current = { ...storedUser, token: storedToken, nome: perfil.nome, email: perfil.email,
          professor: !!perfil.professor, senhaProvisoria: !!perfil.senhaProvisoria };
        if (!getLastActivity()) touchSession(); // sessão anterior à implantação
        const { timeoutMs } = tokenLifetime(storedToken);
        if (timeoutMs) setSessionTimeout(timeoutMs);
        setUser(current);
        localStorage.setItem("user", JSON.stringify(current));
        scheduleRenewal();
        // A renovação também obtém a configuração atual do servidor.
        renewSession().catch(() => {
          if (!timeoutMs) fetchTimeoutMs().then(setSessionTimeout);
        });
      } catch {
        if (localStorage.getItem("token") === storedToken) {
          clearSession();
        }
      } finally { if (!cancelled) setLoadingUser(false); }
    }
    restoreSession();
    return () => { cancelled = true; };
  }, [doLogout, resetTimer]);

  useEffect(() => {
    const onToken = (event) => setUser((previous) => {
      if (!previous) return previous;
      const current = { ...previous, token: event.detail, senhaProvisoria: false };
      localStorage.setItem("user", JSON.stringify(current));
      return current;
    });
    window.addEventListener("session-token", onToken);
    return () => window.removeEventListener("session-token", onToken);
  }, []);

  const login = async ({ email, senha, UserType }) => {
    try {
      const normalizedEmail = email?.trim().toLowerCase();

      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail, senha, UserType }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { ok: false, message: extrairMensagemErro(data, "Erro ao fazer login") };
      }

      if (!data.access_token) {
        return { ok: false, message: "Token não recebido do servidor" };
      }

      const newUser = {
        nome: data.nome,
        email: data.email || normalizedEmail,
        tipo: data.tipo,
        token: data.access_token,
        senhaProvisoria: !!data.senhaProvisoria,
        professor: !!data.professor,
      };

      setUser(newUser);
      localStorage.setItem("user", JSON.stringify(newUser));
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("tipo", data.tipo);
      const { timeoutMs } = tokenLifetime(data.access_token);
      setSessionTimeout(timeoutMs || DEFAULT_TIMEOUT_MS);
      touchSession();
      scheduleRenewal();
      if (!timeoutMs) fetchTimeoutMs().then(setSessionTimeout);

      // Aplica o tema salvo no banco (por usuário: aluno, comunidade ou
      // admin) já no login, pra funcionar em qualquer dispositivo sem
      // precisar abrir Configurações. Cada um guarda sua própria preferência.
      const rotaPerfil = data.tipo === "admin" ? "/admin/me" : "/usuario/me";
      if (data.tipo === "admin" || data.tipo === "Aluno" || data.tipo === "Comunidade") {
        fetch(`${API_URL}${rotaPerfil}`, {
          headers: { Authorization: `Bearer ${data.access_token}` },
        })
          .then((res) => (res.ok ? res.json() : null))
          .then((perfil) => {
            if (perfil?.tema) {
              import("../utils/theme").then(({ applyTheme }) => {
                applyTheme(perfil.tema, { animate: false });
              });
            }
          })
          .catch(() => {});
      }

      return {
        ok: true,
        access_token: data.access_token,
        tipo: data.tipo,
        nome: data.nome,
        professor: !!data.professor,
      };
    } catch (error) {
      console.error("Erro no login:", error);
      return { ok: false, message: "Não foi possível concluir o login. Verifique sua conexão com a Sala de Leitura e tente novamente." };
    }
  };

  const logout = () => doLogout(false);

  const getToken = () => localStorage.getItem("token");

  const esqueciSenha = async (email) => {
    try {
      const normalizedEmail = email?.trim().toLowerCase();

      const response = await fetch(`${API_URL}/esqueci-senha`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { ok: false, message: extrairMensagemErro(data, "Erro ao solicitar redefinição de senha") };
      }

      return { ok: true, message: data.message };
    } catch (error) {
      return { ok: false, message: "Não foi possível solicitar a redefinição de senha. Verifique sua conexão e tente novamente." };
    }
  };

  const validarTokenRedefinicao = async (token) => {
    try {
      const response = await fetch(
        `${API_URL}/redefinir-senha/validar?token=${encodeURIComponent(token)}`
      );

      const data = await response.json();

      if (!response.ok) {
        return { ok: false, message: extrairMensagemErro(data, "Link inválido ou expirado.") };
      }

      return { ok: true };
    } catch (error) {
      return { ok: false, message: "Não foi possível validar o link de redefinição. Verifique sua conexão e tente novamente." };
    }
  };

  const redefinirSenha = async ({ token, novaSenha }) => {
    try {
      const response = await fetch(`${API_URL}/redefinir-senha`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, novaSenha }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { ok: false, message: extrairMensagemErro(data, "Erro ao redefinir senha") };
      }

      return { ok: true, message: data.message };
    } catch (error) {
      return { ok: false, message: "Não foi possível redefinir a senha. Verifique sua conexão com a Sala de Leitura e tente novamente." };
    }
  };

  // Chamado após o usuário definir uma nova senha no primeiro acesso (ou em
  // Configurações), pra tirar o cadeado sem precisar de um novo login.
  const marcarSenhaDefinida = useCallback(() => {
    setUser((prev) => {
      if (!prev) return prev;
      const atualizado = { ...prev, senhaProvisoria: false };
      localStorage.setItem("user", JSON.stringify(atualizado));
      return atualizado;
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        esqueciSenha,
        validarTokenRedefinicao,
        redefinirSenha,
        marcarSenhaDefinida,
        getToken,
        loadingUser,
        isAuthenticated: !!user,
        isAdmin: user?.tipo === "admin",
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
