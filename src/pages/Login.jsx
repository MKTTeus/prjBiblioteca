import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "../styles/Login.css";

export default function Login() {
  const navigate = useNavigate();
  const { login, loadingUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (loadingUser) {
    return <div>Carregando...</div>; // evita flash de logout enquanto o contexto carrega
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await login({ email, senha: password }, remember);
    setLoading(false);

    if (!result.ok) {
      setError(result.message || "Erro ao fazer login.");
      return;
    }

    // redirecionamento já é feito dentro do login
  };

  return (
    <main className="login-container">
      <h2>Entrar</h2>
      <p className="login-subtitle">Acesse sua conta</p>

      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="seuemail@exemplo.com"
            required
          />
        </div>

        <div className="input-group">
          <label>Senha</label>
          <div className="password-wrapper">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Sua senha"
              required
            />
            <button
              type="button"
              className="show-password-btn"
              onClick={() => setShowPassword(s => !s)}
            >
              {showPassword ? "Ocultar" : "Mostrar"}
            </button>
          </div>
        </div>

        <label className="remember">
          <input
            type="checkbox"
            checked={remember}
            onChange={e => setRemember(e.target.checked)}
          />{" "}
          Lembrar de mim
        </label>

        {error && <div className="error">{error}</div>}

        <button type="submit" disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
        </button>
        <button
          type="button"
          className="create-account"
          onClick={() => navigate("/signup")}
        >
          Criar Conta
        </button>
      </form>
    </main>
  );
}
