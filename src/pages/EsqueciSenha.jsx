import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { FiMail, FiArrowLeft } from "react-icons/fi";
import LoadingButton from "../components/LoadingButton/LoadingButton";
import "../styles/Login.css";

export default function EsqueciSenha() {
  const navigate = useNavigate();
  const { esqueciSenha } = useAuth();
  const submitRef = useRef(false);

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [enviado, setEnviado] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading || submitRef.current) {
      return;
    }

    submitRef.current = true;
    setError("");
    setLoading(true);

    try {
      const result = await esqueciSenha(email);
      if (!result?.ok) {
        setError(result?.message || "Não foi possível enviar o e-mail de redefinição.");
        return;
      }

      setEnviado(true);
    } catch (error) {
      console.error("Erro esqueci-senha:", error);
      setError("Erro inesperado ao solicitar redefinição de senha.");
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
          <h2>Esqueci minha senha</h2>

          {enviado ? (
            <>
              <p className="login-subtitle">
                Se o e-mail informado estiver cadastrado, você receberá um link para
                redefinir sua senha em instantes. Verifique também a caixa de spam.
              </p>
              <p className="signup-link">
                <span onClick={() => navigate("/login")}>
                  <FiArrowLeft style={{ verticalAlign: "middle", marginRight: 4 }} />
                  Voltar para o login
                </span>
              </p>
            </>
          ) : (
            <>
              <p className="login-subtitle">
                Informe seu e-mail cadastrado para receber o link de redefinição.
              </p>

              <form onSubmit={handleSubmit}>
                <div className="input-group">
                  <label>E-mail</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@email.com"
                    required
                  />
                </div>

                {error && <div className="error">{error}</div>}

                <LoadingButton
                  type="submit"
                  isLoading={loading}
                  loadingText="Enviando..."
                  className="login-btn aluno"
                >
                  <FiMail style={{ verticalAlign: "middle", marginRight: 6 }} />
                  Enviar link de redefinição
                </LoadingButton>

                <p className="signup-link">
                  <span onClick={() => navigate("/login")}>Voltar para o login</span>
                </p>
              </form>
            </>
          )}
        </main>
      </div>
    </div>
  );
}