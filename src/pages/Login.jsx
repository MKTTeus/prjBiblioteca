import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Esconde Header e Sidebar enquanto estiver na tela de login
  useEffect(() => {
    const header = document.querySelector("header");
    const sidebar = document.querySelector(".sidebar");
    if (header) header.style.display = "none";
    if (sidebar) sidebar.style.display = "none";
    return () => {
      if (header) header.style.display = "";
      if (sidebar) sidebar.style.display = "";
    };
  }, []);

  const validate = () => {
    if (!email.trim()) return "O email é obrigatório.";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return "Digite um email válido.";
    if (!password) return "A senha é obrigatória.";
    if (password.length < 6) return "A senha deve ter pelo menos 6 caracteres.";
    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const result = await login({ email, senha: password });

      if (!result.ok) {
        setError(result.message || "Erro ao fazer login.");
        return;
      }

      // Lembre-me
      if (remember) localStorage.setItem("remember", "true");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      style={{
        maxWidth: 420,
        margin: "48px auto",
        padding: 24,
        borderRadius: 8,
        boxShadow: "0 6px 20px rgba(0,0,0,0.08)",
        fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, Arial",
      }}
    >
      <h2 style={{ margin: 0, marginBottom: 6 }}>Entrar</h2>
      <p style={{ marginTop: 0, marginBottom: 18, color: "#6b7280" }}>
        Acesse sua conta para continuar.
      </p>

      <form onSubmit={handleSubmit} noValidate>
        {/* Email */}
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="email" style={{ fontSize: 13, color: "#111827" }}>
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 6,
              border: "1px solid #d0d7de",
              marginTop: 6,
              fontSize: 14,
              boxSizing: "border-box",
            }}
            placeholder="seuemail@exemplo.com"
            required
            autoComplete="email"
          />
        </div>

        {/* Senha */}
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="password" style={{ fontSize: 13, color: "#111827" }}>
            Senha
          </label>
          <div style={{ position: "relative" }}>
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                paddingRight: 90,
                borderRadius: 6,
                border: "1px solid #d0d7de",
                marginTop: 6,
                fontSize: 14,
                boxSizing: "border-box",
              }}
              placeholder="Sua senha"
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              style={{
                position: "absolute",
                right: 8,
                top: 8,
                padding: "6px 8px",
                borderRadius: 6,
                border: "1px solid #e5e7eb",
                background: "white",
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              {showPassword ? "Ocultar" : "Mostrar"}
            </button>
          </div>
        </div>

        {/* Opções */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 8,
          }}
        >
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            <span style={{ fontSize: 13, color: "#374151" }}>
              Lembrar de mim
            </span>
          </label>
        </div>

        {/* Erro */}
        {error && (
          <div style={{ marginTop: 12, color: "#b91c1c", fontSize: 13 }}>
            {error}
          </div>
        )}

        {/* Botão Login */}
        <button
          type="submit"
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 6,
            border: "none",
            background: "#2563eb",
            color: "white",
            fontWeight: 600,
            cursor: "pointer",
            marginTop: 12,
          }}
          disabled={loading}
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>

      {/* Botão Criar conta */}
      <button
        type="button"
        onClick={() => navigate("/signup")}
        style={{
          width: "100%",
          padding: "10px 12px",
          borderRadius: 6,
          border: "1px solid #2563eb",
          background: "white",
          color: "#2563eb",
          fontWeight: 600,
          cursor: "pointer",
          marginTop: 12,
        }}
      >
        Criar Conta
      </button>
    </main>
  );
}
