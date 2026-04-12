import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const API_URL =
    window.location.hostname === "localhost"
      ? "http://127.0.0.1:5000"
      : "https://prjbiblioteca-production.up.railway.app";

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const storedToken = localStorage.getItem("token");

    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
    }

    setLoadingUser(false);
  }, []);

  const login = async ({ email, senha }) => {
    try {
      const normalizedEmail = email?.trim().toLowerCase();

      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: normalizedEmail, senha }),
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

  const logout = () => {
    setUser(null);

    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("tipo");
  };

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
