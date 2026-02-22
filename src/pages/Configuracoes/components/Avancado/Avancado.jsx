import { useState } from "react";
import Switch from "react-switch";
import { TbAdjustmentsAlt } from "react-icons/tb";
import { FiRefreshCw } from "react-icons/fi";
import "./Avancado.css";

export default function Avancado() {
  const [debug, setDebug] = useState(false);
  const [maintenance, setMaintenance] = useState(false);
  const [logApi, setLogApi] = useState(true);

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
      {/* HEADER */}
      <div className="avancado-header">
        <TbAdjustmentsAlt className="settings-icon" />
        <h3>Configurações Avançadas</h3>
      </div>

      {/* ALERTA */}
      <div className="alert-box alert-neutral">
        Estas configurações são avançadas. Altere apenas se souber o que está fazendo.
      </div>

      {/* SWITCHES */}
      <div className="switch-row">
        <div>
          <span className="switch-title">Modo de Debug</span>
          <p>Ativar logs detalhados para depuração</p>
        </div>

        <Switch
          checked={debug}
          onChange={() => setDebug(!debug)}
          {...switchStyle}
        />
      </div>

      <div className="switch-row">
        <div>
          <span className="switch-title">Modo de Manutenção</span>
          <p>Bloquear acesso temporariamente</p>
        </div>

        <Switch
          checked={maintenance}
          onChange={() => setMaintenance(!maintenance)}
          {...switchStyle}
        />
      </div>

      <div className="switch-row">
        <div>
          <span className="switch-title">Log da API</span>
          <p>Registrar todas as chamadas da API</p>
        </div>

        <Switch
          checked={logApi}
          onChange={() => setLogApi(!logApi)}
          {...switchStyle}
        />
      </div>

      {/* DIVISOR */}
      <hr className="section-divider" />

      {/* AÇÕES DO SISTEMA */}
      <div className="acoes-sistema">
        <h4>Ações do Sistema</h4>

        <div className="acoes-botoes">
          <button className="btn-secondary">Limpar Cache</button>
          <button className="btn-secondary">Reindexar Banco</button>
          <button className="btn-secondary text-danger">
            Backup Completo
          </button>
        </div>
      </div>

      {/* AÇÕES FINAIS */}
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