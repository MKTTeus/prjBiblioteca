
import React, { createContext, useContext, useState } from "react";
import { useNavigate } from "react-router-dom";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const navigate = useNavigate();

  //  Carrega usuário do localStorage (mantém login após F5)
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  });

  const API_URL = "http://localhost:5000"; // ajuste conforme sua API

  //  LOGIN
  const login = async ({ email, senha }) => {
    try {
      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Erro ao fazer login");
      }

      localStorage.setItem("token", data.access_token);
      localStorage.setItem("user", JSON.stringify({ email }));
      setUser({ email });

      navigate("/", { replace: true });
      return { ok: true };
    } catch (error) {
      console.error("Erro no login:", error);
      return { ok: false, message: error.message };
    }
  };

  //  LOGOUT
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    navigate("/login", { replace: true });
  };

  //  SIGNUP
const signup = async ({ nome, email, senha }) => {
  try {
    const response = await fetch(`${API_URL}/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, email, senha }),
    });

    const data = await response.json();

    if (!response.ok) {
      const message = data.detail
        ? data.detail
        : typeof data === "object"
        ? JSON.stringify(data)
        : data;
      throw new Error(message || "Erro ao criar conta");
    }

    return { ok: true, message: "Conta criada com sucesso!" };
  } catch (error) {
    console.error("Erro no cadastro:", error);
    return { ok: false, message: error.message };
  }
};


  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        signup,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

//  Hook para acessar o contexto
export const useAuth = () => useContext(AuthContext);
