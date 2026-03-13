import { useState } from "react";
import Switch from "react-switch";
import { FiShield, FiRefreshCw } from "react-icons/fi";
import "./Seguranca.css";

export default function Seguranca() {
  const [senhaForte, setSenhaForte] = useState(true);
  const [doisFatores, setDoisFatores] = useState(false);
  const [timeout, setTimeout] = useState(30);
  const [tamanhoSenha, setTamanhoSenha] = useState(8);

  const switchStyle = {
    offColor: "#e5e7eb",
    onColor: "#111827",
    uncheckedIcon: false,
    checkedIcon: false,
    height: 22,
    width: 46,
    handleDiameter: 18,
  };

  return (
    <div className="card">
      {/* TÍTULO */}
      <div className="seguranca-header">
        <FiShield className="shield-icon" />
        <h3>Configurações de Segurança</h3>
      </div>

      {/* ALERTA */}
      <div className="alert-box">
        Estas configurações afetam a segurança do sistema. Faça alterações com
        cuidado.
      </div>

      {/* INPUTS */}
      <div className="grid-2">
        <div className="form-group">
          <label>Timeout da Sessão (minutos)</label>
          <input
            type="number"
            value={timeout}
            onChange={(e) => setTimeout(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Tamanho Mínimo da Senha</label>
          <input
            type="number"
            value={tamanhoSenha}
            onChange={(e) => setTamanhoSenha(e.target.value)}
          />
        </div>
      </div>

      {/* SWITCHES */}
      <div className="switch-row">
        <div>
          <span className="switch-title">Exigir Senha Forte</span>
          <p>Senhas devem conter letras, números e símbolos</p>
        </div>

        <Switch
          checked={senhaForte}
          onChange={() => setSenhaForte(!senhaForte)}
          {...switchStyle}
        />
      </div>

      <div className="switch-row">
        <div>
          <span className="switch-title">
            Autenticação de Dois Fatores
          </span>
          <p>Adicionar camada extra de segurança</p>
        </div>

        <Switch
          checked={doisFatores}
          onChange={() => setDoisFatores(!doisFatores)}
          {...switchStyle}
        />
      </div>



      {/* AÇÕES */}
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