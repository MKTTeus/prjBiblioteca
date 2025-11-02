// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useState } from "react";
import { useNavigate } from "react-router-dom";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  });

  const login = async ({ username, password }) => {
    // Aqui você integraria com seu backend: fetch('/api/login', ...)
    // Exemplo simples (mock): usuário admin / senha 1234
    if (username === "admin" && password === "1234") {
      const token = "fake-jwt-token";
      const userData = { name: "Administrador", username: "admin" };
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(userData));
      setUser(userData);
      navigate("/", { replace: true });
      return { ok: true };
    }
    return { ok: false, message: "Usuário ou senha inválidos" };
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    navigate("/login", { replace: true });
  };

  const signup = async ({ username, password }) => {
// chama api do backend para registrar
    const response = await fetch("/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await response.json();
};


  return (
    <AuthContext.Provider
      value={{ user, login, logout, isAuthenticated: !!user }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
