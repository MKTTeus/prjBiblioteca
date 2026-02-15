import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { FiShield, FiUser, FiUsers } from "react-icons/fi";
import { LuBook } from "react-icons/lu";
import "../styles/Login.css";

export default function Login() {
  const navigate = useNavigate();
  const { login, loadingUser } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userType, setUserType] = useState("aluno");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (loadingUser) {
    return <div>Carregando...</div>;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await login({ email, senha: password }, false);
    setLoading(false);

    if (!result.ok) {
      setError(result.message || "Erro ao fazer login.");
      return;
    }
  };

  return (
    <div className="login-page">
      <div className="login-wrapper">
        
        <div className="login-header">
          <div className="logo-circle"><LuBook className="user-icon" /></div>
          <h1>Sistema de Biblioteca</h1>
          <p>Escola 9 de Julho de Taquaritinga</p>
        </div>

        <main className="login-card">
          <h2>Fazer Login</h2>
          <p className="login-subtitle">
            Selecione seu tipo de usuário
          </p>

          <div className="user-types">
            <div
              className={`user-option admin ${userType === "admin" ? "selected" : ""}`}
              onClick={() => setUserType("admin")}
            >
              <FiShield className="user-icon" />
              <div>
                <strong>Administrador</strong>
                <span>Acesso completo ao sistema</span>
              </div>
            </div>

            <div
              className={`user-option aluno ${userType === "aluno" ? "selected" : ""}`}
              onClick={() => setUserType("aluno")}
            >
              <FiUser className="user-icon" />
              <div>
                <strong>Aluno</strong>
                <span>Consultar e alugar livros</span>
              </div>
            </div>

            <div
              className={`user-option comunidade ${userType === "comunidade" ? "selected" : ""}`}
              onClick={() => setUserType("comunidade")}
            >
              <FiUsers className="user-icon" />
              <div>
                <strong>Comunidade</strong>
                <span>Acesso para visitantes</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label>RA ou E-mail</label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="2024001 ou email@email.com"
                required
              />
            </div>

            <div className="input-group">
              <label>Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua senha"
                required
              />
            </div>

            {error && <div className="error">{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className={`login-btn ${userType}`}
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>

            {userType !== "admin" && (
              <p className="signup-link">
                Não tem cadastro?{" "}
                <span onClick={() => navigate("/signup")}>
                  Clique aqui
                </span>
              </p>
            )}
          </form>
        </main>

      </div>
    </div>
  );
}
