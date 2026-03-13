import { useState } from "react";
import { FiMail, FiRefreshCw, FiEye, FiEyeOff } from "react-icons/fi";
import "./Email.css";

export default function Email() {
  const [smtp, setSmtp] = useState("smtp.escola.com");
  const [porta, setPorta] = useState("587");
  const [usuario, setUsuario] = useState("biblioteca@escola.com");
  const [senha, setSenha] = useState("123456");
  const [mostrarSenha, setMostrarSenha] = useState(false);

  return (
    <div className="card">
      <div className="email-header">
        <FiMail className="email-icon" />
        <h3>Configurações de E-mail</h3>
      </div>

      {/* GRID SUPERIOR */}
      <div className="grid-2">
        <div className="form-group">
          <label>Servidor SMTP</label>
          <input
            type="text"
            value={smtp}
            onChange={(e) => setSmtp(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Porta SMTP</label>
          <input
            type="number"
            value={porta}
            onChange={(e) => setPorta(e.target.value)}
          />
        </div>
      </div>

      <div className="form-group">
        <label>Usuário SMTP</label>
        <input
          type="text"
          value={usuario}
          onChange={(e) => setUsuario(e.target.value)}
        />
      </div>

      {/* SENHA COM BOTÃO */}
      <div className="form-group password-group">
        <label>Senha SMTP</label>

        <div className="password-wrapper">
          <input
            type={mostrarSenha ? "text" : "password"}
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />

          <button
            type="button"
            className="toggle-password"
            onClick={() => setMostrarSenha(!mostrarSenha)}
          >
            {mostrarSenha ? <FiEyeOff /> : <FiEye />}
          </button>
        </div>
      </div>

      <div className="email-test-buttons">
        <button className="btn-outline">Testar Conexão</button>
        <button className="btn-outline">Enviar E-mail de Teste</button>
      </div>

      <div className="card-actions">
        <button className="btn-secondary">
          Restaurar Padrão
        </button>

        <button className="btn-dark">
          Salvar Configurações
        </button>
      </div>
    </div>
  );
}