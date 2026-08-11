import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { atualizarMeuPerfil } from "../services/api";
import { FiLock } from "react-icons/fi";
import LoadingButton from "../components/LoadingButton/LoadingButton";
import "../styles/Login.css";

export default function PrimeiroAcesso() {
  const navigate = useNavigate();
  const { user, marcarSenhaDefinida } = useAuth();
  const submitRef = useRef(false);

  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading || submitRef.current) {
      return;
    }

    if (novaSenha.length < 8) {
      setError("A nova senha deve ter pelo menos 8 caracteres.");
      return;
    }

    if (novaSenha !== confirmarSenha) {
      setError("As senhas não coincidem.");
      return;
    }

    submitRef.current = true;
    setError("");
    setLoading(true);

    try {
      await atualizarMeuPerfil({ senhaAtual, novaSenha });
      marcarSenhaDefinida();
      navigate(user?.tipo === "admin" ? "/admin" : "/user", { replace: true });
    } catch (err) {
      setError(err?.data?.detail || err?.message || "Não foi possível trocar a senha.");
    } finally {
      setLoading(false);
      submitRef.current = false;
    }
  };

  return (
    <div className="login-page">
      <div className="login-wrapper">
        <div className="login-header">
          <div className="logo-circle">
            <img
              src="/logo-novedejulho-fundo.png"
              alt="Logo Nove de Julho"
              className="login-logo"
            />
          </div>
          <h1>Sistema de Biblioteca</h1>
          <p>Escola 9 de Julho de Taquaritinga</p>
        </div>

        <main className="login-card">
          <h2>Defina sua senha</h2>
          <p className="login-subtitle">
            Este é seu primeiro acesso. Por segurança, informe a senha
            provisória que você recebeu e escolha uma nova senha para
            continuar.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label>Senha provisória</label>
              <input
                type="password"
                value={senhaAtual}
                onChange={(e) => setSenhaAtual(e.target.value)}
                placeholder="Senha recebida na importação ou do admin"
                autoComplete="current-password"
                required
              />
            </div>

            <div className="input-group">
              <label>Nova senha</label>
              <input
                type="password"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                placeholder="Mínimo de 8 caracteres"
                autoComplete="new-password"
                required
              />
            </div>

            <div className="input-group">
              <label>Confirmar nova senha</label>
              <input
                type="password"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                placeholder="Repita a nova senha"
                autoComplete="new-password"
                required
              />
            </div>

            {error && <div className="error">{error}</div>}

            <LoadingButton
              type="submit"
              isLoading={loading}
              loadingText="Salvando..."
              className="login-btn aluno"
            >
              <FiLock style={{ verticalAlign: "middle", marginRight: 6 }} />
              Definir senha e continuar
            </LoadingButton>
          </form>
        </main>
      </div>
    </div>
  );
}