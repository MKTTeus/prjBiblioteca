import React, { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const API_URL = "http://localhost:5000";

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const storedToken = localStorage.getItem("token");

    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
    }
    setLoadingUser(false);
  }, []);

  const login = async ({ email, senha }, rememberMe = false) => {
    try {
      if (!email || !senha) return { ok: false, message: "Preencha email e senha." };

      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha }),
      });

      const data = await response.json();

      if (!response.ok) return { ok: false, message: data.detail || "Erro ao fazer login." };
      if (!data.access_token) return { ok: false, message: "Token não recebido do servidor." };

      const newUser = {
        nome: data.nome,
        email: email,
        tipo: data.tipo,
        token: data.access_token,
      };

      setUser(newUser);
      localStorage.setItem("user", JSON.stringify(newUser));
      localStorage.setItem("token", data.access_token);

      if (rememberMe) localStorage.setItem("remember", "true");
      else localStorage.removeItem("remember");

      if (data.tipo === "admin") navigate("/admin", { replace: true });
      else navigate("/", { replace: true });

      return { ok: true };
    } catch (error) {
      console.error("Erro no login:", error);
      return { ok: false, message: error.message };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("remember");
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
    isAdmin: user?.tipo === "admin", // <-- adicione esta linha
    loadingUser,
    getToken: () => user?.token || localStorage.getItem("token"),
  }}
>
  {children}
</AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);