import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { FiLock } from "react-icons/fi";
import LoadingButton from "../components/LoadingButton/LoadingButton";
import "../styles/Login.css";

const MENSAGEM_LINK_INVALIDO =
  "Link inválido ou expirado. Solicite uma nova redefinição de senha.";

export default function RedefinirSenha() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { redefinirSenha, validarTokenRedefinicao } = useAuth();
  const submitRef = useRef(false);

  const token = searchParams.get("token") || "";

  // "verificando" | "valido" | "invalido"
  const [statusToken, setStatusToken] = useState("verificando");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    let ativo = true;

    if (!token) {
      setStatusToken("invalido");
      return;
    }

    validarTokenRedefinicao(token).then((result) => {
      if (!ativo) return;
      setStatusToken(result?.ok ? "valido" : "invalido");
    });

    return () => {
      ativo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

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
      const result = await redefinirSenha({ token, novaSenha });
      if (!result?.ok) {
        // Se o token expirou/foi usado bem no meio do preenchimento do
        // formulário, volta pro estado de link inválido em vez de deixar
        // o formulário aberto indefinidamente.
        setStatusToken("invalido");
        setError(result?.message || "Não foi possível redefinir a senha.");
        return;
      }

      setSucesso(true);
    } catch (error) {
      console.error("Erro redefinir-senha:", error);
      setError("Erro inesperado ao redefinir a senha.");
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
          <h2>Redefinir senha</h2>

          {statusToken === "verificando" && (
            <p className="login-subtitle">Verificando link...</p>
          )}

          {statusToken === "invalido" && !sucesso && (
            <>
              <div className="error">{MENSAGEM_LINK_INVALIDO}</div>
              <p className="signup-link">
                <span onClick={() => navigate("/esqueci-senha")}>
                  Solicitar nova redefinição
                </span>
              </p>
            </>
          )}

          {statusToken === "valido" && sucesso && (
            <>
              <p className="login-subtitle">
                Sua senha foi redefinida com sucesso. Você já pode fazer login com a nova senha.
              </p>
              <LoadingButton
                type="button"
                isLoading={false}
                className="login-btn aluno"
                onClick={() => navigate("/login")}
              >
                Ir para o login
              </LoadingButton>
            </>
          )}

          {statusToken === "valido" && !sucesso && (
            <>
              <p className="login-subtitle">Escolha uma nova senha para sua conta.</p>

              <form onSubmit={handleSubmit}>
                <div className="input-group">
                  <label>Nova senha</label>
                  <input
                    type="password"
                    value={novaSenha}
                    onChange={(e) => setNovaSenha(e.target.value)}
                    placeholder="Mínimo de 8 caracteres"
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
                  Redefinir senha
                </LoadingButton>
              </form>
            </>
          )}
        </main>
      </div>
    </div>
  );
}