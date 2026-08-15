import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { API_URL } from "../services/apiConfig";

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
    if (!res.ok) return DEFAULT_TIMEOUT_MS;
    const configs = await res.json();
    const entry = configs.find((c) => c.chave === "timeout_sessao");
    const minutes = entry ? parseInt(entry.valor, 10) : 30;
    return (isNaN(minutes) || minutes <= 0 ? 30 : minutes) * 60 * 1000;
  } catch {
    return DEFAULT_TIMEOUT_MS;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const timerRef = useRef(null);
  const timeoutMsRef = useRef(DEFAULT_TIMEOUT_MS);

  const doLogout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("tipo");
    window.location.href = "/#/login";
  }, []);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(doLogout, timeoutMsRef.current);
  }, [doLogout]);

  useEffect(() => {
    if (!user) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    const events = ["mousemove", "keydown", "mousedown", "touchstart", "scroll"];
    events.forEach((e) => window.addEventListener(e, resetTimer));
    resetTimer();

    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [user, resetTimer]);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const storedToken = localStorage.getItem("token");

    if (storedUser && storedToken) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      fetchTimeoutMs().then((ms) => {
        timeoutMsRef.current = ms;
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(doLogout, ms);
      });

      // Sessões abertas antes da senha ser marcada como provisória (ex.:
      // admin trocou a senha do aluno enquanto ele já estava logado, ou a
      // sessão é de antes desse recurso existir) não têm esse dado no
      // localStorage. Reconfere direto no backend pra não depender de um
      // novo login.
      if (parsedUser.tipo && parsedUser.tipo !== "admin") {
        fetch(`${API_URL}/usuario/me`, {
          headers: { Authorization: `Bearer ${storedToken}` },
        })
          .then((res) => (res.ok ? res.json() : null))
          .then((perfil) => {
            if (perfil && typeof perfil.senhaProvisoria === "boolean") {
              setUser((prev) => {
                if (!prev || prev.senhaProvisoria === perfil.senhaProvisoria) return prev;
                const atualizado = { ...prev, senhaProvisoria: perfil.senhaProvisoria };
                localStorage.setItem("user", JSON.stringify(atualizado));
                return atualizado;
              });
            }
          })
          .catch(() => {});
      }
    }

    setLoadingUser(false);
  }, [doLogout]);

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
        email: normalizedEmail,
        tipo: data.tipo,
        token: data.access_token,
        senhaProvisoria: !!data.senhaProvisoria,
        professor: !!data.professor,
      };

      setUser(newUser);
      localStorage.setItem("user", JSON.stringify(newUser));
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("tipo", data.tipo);

      fetchTimeoutMs().then((ms) => {
        timeoutMsRef.current = ms;
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(doLogout, ms);
      });

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
      return { ok: false, message: "Erro de conexão com o servidor" };
    }
  };

  const logout = doLogout;

  const getToken = () => user?.token || localStorage.getItem("token");

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
      return { ok: false, message: "Erro de conexão com o servidor" };
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
      return { ok: false, message: "Erro de conexão com o servidor" };
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
      return { ok: false, message: "Erro de conexão com o servidor" };
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