import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { FiShield, FiUser, FiUsers, FiEye, FiEyeOff, FiLock, FiArrowRight } from "react-icons/fi";
import LoadingButton from "../components/LoadingButton/LoadingButton";
import "../styles/Login.css";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const submitRef = useRef(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [userType, setUserType] = useState("aluno");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(() => sessionStorage.getItem("session-expired-message") || "");

  const tipoMap = {
    admin: "Administrador",
    aluno: "Aluno",
    comunidade: "Comunidade"
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading || submitRef.current) {
      return;
    }

    submitRef.current = true;
    setError("");
    setLoading(true);

    const payload = {
      email,
      senha: password,
      UserType: tipoMap[userType]
    };

    try {
      const result = await login(payload);
      if (!result?.ok) {
        setError(result?.message || "Falha no login. Verifique suas credenciais.");
        return;
      }

      // O aviso é consumido pela área gestora após cada login real, inclusive
      // quando o retorno leva diretamente a uma tela interna.
      if (result.tipo === "admin" && !result.professor) {
        sessionStorage.setItem("novi-welcome-pending", "1");
      } else {
        sessionStorage.removeItem("novi-welcome-pending");
      }

      const destino =
        result.tipo === "admin"
          ? (result.professor ? "/professor" : "/admin")
          : "/user";
      const previousPath = sessionStorage.getItem("session-return-path");
      sessionStorage.removeItem("session-return-path");
      sessionStorage.removeItem("session-expired-message");
      navigate(result.tipo === "admin" && !result.professor && /^\/admin\/(livros|alunos|comunidade|admins)$/.test(previousPath || "") ? previousPath : destino, { replace: true });
    } catch (error) {
      console.error("Erro login:", error);
      setError("Não foi possível concluir o login. Verifique sua conexão com a Sala de Leitura e tente novamente.");
    } finally {
      setLoading(false);
      submitRef.current = false;
    }
  };


  return (
    <div className={`login-page login-page--${userType}`}>
      <div className="login-wrapper">
        <header className="login-header">
          <div className="logo-circle">
            <img
              src="/logo-novedejulho-semfundo.png"
              alt="Logo da Escola 9 de Julho"
              className="login-logo"
            />
          </div>
          <p className="login-school-name">Escola 9 de Julho de Taquaritinga</p>
          <h1>Sistema de Biblioteca</h1>
          <span className="login-title-divider" aria-hidden="true" />
          <p className="login-tagline">Conhecimento que conecta pessoas, histórias e futuros.</p>
        </header>

        <main className="login-card">
          <div className="login-card-heading">
            <h2>Fazer Login</h2>
            <p className="login-subtitle">Selecione seu tipo de usuário</p>
          </div>

          <div className="user-types" role="group" aria-label="Tipo de usuário">
            <button
              type="button"
              className={`user-option admin ${userType === "admin" ? "selected" : ""}`}
              onClick={() => setUserType("admin")}
              aria-pressed={userType === "admin"}
            >
              <FiShield className="user-icon" aria-hidden="true" />
              <span className="user-option-text">
                <strong>Equipe Escolar</strong>
                <span>Equipe gestora e professores</span>
              </span>
              <span className="user-option-indicator" aria-hidden="true" />
            </button>

            <button
              type="button"
              className={`user-option aluno ${userType === "aluno" ? "selected" : ""}`}
              onClick={() => setUserType("aluno")}
              aria-pressed={userType === "aluno"}
            >
              <FiUser className="user-icon" aria-hidden="true" />
              <span className="user-option-text">
                <strong>Aluno</strong>
                <span>Consultar e alugar livros</span>
              </span>
              <span className="user-option-indicator" aria-hidden="true" />
            </button>

            <button
              type="button"
              className={`user-option comunidade ${userType === "comunidade" ? "selected" : ""}`}
              onClick={() => setUserType("comunidade")}
              aria-pressed={userType === "comunidade"}
            >
              <FiUsers className="user-icon" aria-hidden="true" />
              <span className="user-option-text">
                <strong>Comunidade</strong>
                <span>Acesso para visitantes</span>
              </span>
              <span className="user-option-indicator" aria-hidden="true" />
            </button>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="input-group">
              <label htmlFor="login-identificador">
                {userType === "aluno" ? "RA ou E-mail" : userType === "comunidade" ? "CPF ou E-mail" : "E-mail"}
              </label>
              <div className="login-input-shell">
                <FiUser className="login-input-icon" aria-hidden="true" />
                <input
                  id="login-identificador"
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={userType === "aluno" ? "2024001 ou email@email.com" : userType === "comunidade" ? "000.000.000-00 ou email@email.com" : "email@email.com"}
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="login-senha">Senha</label>
              <div className="login-input-shell password-input-wrapper">
                <FiLock className="login-input-icon" aria-hidden="true" />
                <input
                  id="login-senha"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </div>

            <p className="forgot-password-link">
              <button type="button" onClick={() => navigate("/esqueci-senha")}>Esqueci minha senha</button>
            </p>

            {error && <div className="error" role="alert">{error}</div>}

            <LoadingButton
              type="submit"
              isLoading={loading}
              loadingText="Entrando..."
              className={`login-btn ${userType}`}
            >
              <span>Entrar</span>
              <FiArrowRight className="login-submit-arrow" aria-hidden="true" />
            </LoadingButton>
          </form>
        </main>
      </div>
    </div>
  );
}
