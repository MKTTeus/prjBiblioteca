import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { API_URL } from "../services/apiConfig";

const AuthContext = createContext();
const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000; // 30 min fallback

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

  // Iniciar/parar listeners de atividade
  useEffect(() => {
    if (!user) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    const events = ["mousemove", "keydown", "mousedown", "touchstart", "scroll"];
    events.forEach((e) => window.addEventListener(e, resetTimer));
    resetTimer(); // iniciar timer ao logar

    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [user, resetTimer]);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const storedToken = localStorage.getItem("token");

    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
      // Buscar timeout configurado
      fetchTimeoutMs().then((ms) => {
        timeoutMsRef.current = ms;
      });
    }

    setLoadingUser(false);
  }, []);

  const login = async ({ email, senha, UserType }) => {
    try {
      const normalizedEmail = email?.trim().toLowerCase();

      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: normalizedEmail, senha ,UserType}),
      });

      const data = await response.json();

      if (!response.ok) {
        return { ok: false, message: data.detail || "Erro ao fazer login" };
      }

      if (!data.access_token) {
        return { ok: false, message: "Token não recebido do servidor" };
      }

      const newUser = {
        nome: data.nome,
        email: normalizedEmail,
        tipo: data.tipo,
        token: data.access_token,
      };

      setUser(newUser);

      localStorage.setItem("user", JSON.stringify(newUser));
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("tipo", data.tipo);

      // Atualizar timeout configurado
      fetchTimeoutMs().then((ms) => {
        timeoutMsRef.current = ms;
      });

      return {
        ok: true,
        access_token: data.access_token,
        tipo: data.tipo,
        nome: data.nome,
      };
    } catch (error) {
      console.error("Erro no login:", error);

      return {
        ok: false,
        message: "Erro de conexão com o servidor",
      };
    }
  };

  const logout = doLogout;

  const signup = async (form) => {
    try {
      const normalizedForm = {
        ...form,
        email: form.email?.trim().toLowerCase(),
      };

      const response = await fetch(`${API_URL}/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(normalizedForm),
      });

      const data = await response.json();

      if (!response.ok) {
        return { ok: false, message: data.detail || "Erro ao criar conta" };
      }

      return {
        ok: true,
        message: data.message || "Conta criada com sucesso",
      };
    } catch (error) {
      return {
        ok: false,
        message: "Erro de conexão com o servidor",
      };
    }
  };

  const getToken = () => {
    return user?.token || localStorage.getItem("token");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        signup,
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