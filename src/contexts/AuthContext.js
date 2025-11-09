// AuthContext.jsx
import React, { createContext, useContext, useState } from "react";
import { useNavigate } from "react-router-dom";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const navigate = useNavigate();

  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  });

  const API_URL = "http://localhost:5000";

  // LOGIN (Aluno ou Admin)
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

      //  Salva token, nome e tipo (admin/aluno)
      const newUser = {
         email,
         nome: data.nome,
        tipo: data.tipo, // "aluno" ou "admin"
        };
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("user", JSON.stringify(newUser));
      setUser(newUser);

      localStorage.setItem("token", data.access_token);
      localStorage.setItem("user", JSON.stringify(newUser));
      setUser(newUser);

      //  Redireciona conforme o tipo
      if (data.tipo === "admin") {
        navigate("/admin", { replace: true });
      } else {
        navigate("/", { replace: true });
      }

      return { ok: true, message: "Login realizado com sucesso!" };
    } catch (error) {
      console.error("Erro no login:", error);
      return { ok: false, message: error.message };
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    navigate("/login", { replace: true });
  };

  const signup = async (form) => {
    try {
      const response = await fetch(`${API_URL}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Erro ao criar conta.");

      return { ok: true, message: data.message || "Conta criada com sucesso!" };
    } catch (error) {
      console.error("Erro no signup:", error);
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
        isAdmin: user?.tipo === "admin",
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
