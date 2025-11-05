import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import "../styles/Signup.css";

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signup({ nome, email, senha });

    if (!result.ok) {
      setError(result.message);
      setLoading(false);
      return;
    }

    alert(result.message);
    navigate("/login");
    setLoading(false);
  };

  return (
    <div className="signup-container">
      <h2>Criar Conta</h2>
      <form className="signup-form" onSubmit={handleSignup}>
        <label>Nome</label>
        <input
          type="text"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Digite seu nome"
          required
        />

        <label>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Digite seu email"
          required
        />

        <label>Senha</label>
        <input
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          placeholder="Digite sua senha"
          required
        />

        {error && <div className="error">{error}</div>}

        <button type="submit" disabled={loading}>
          {loading ? "Criando..." : "Registrar"}
        </button>
      </form>

      {/* Botão para ir ao login */}
      <button
        className="login-redirect-btn"
        onClick={() => navigate("/login")}
        style={{
          marginTop: "1rem",
          width: "100%",
          padding: "10px",
          borderRadius: "8px",
          border: "1px solid #007bff",
          background: "white",
          color: "#007bff",
          fontWeight: 600,
          cursor: "pointer",
          transition: "background 0.2s",
        }}
      >
        Já possui conta? Faça login
      </button>
    </div>
  );
}
