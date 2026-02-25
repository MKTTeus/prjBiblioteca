import { useState } from "react";
import { FiBell } from "react-icons/fi";
import Switch from "react-switch";
import "./Notificacoes.css";

export default function Notificacoes() {
  const [email, setEmail] = useState(true);
  const [sms, setSms] = useState(false);
  const [atraso, setAtraso] = useState(true);
  const [devolucao, setDevolucao] = useState(true);
  const [dias, setDias] = useState(2);

  const switchStyle = {
    offColor: "#cbd5e1",
    onColor: "#111827",
    uncheckedIcon: false,
    checkedIcon: false,
    height: 26,
    width: 52,
    handleDiameter: 22,
    offHandleColor: "#ffffff",
    onHandleColor: "#ffffff",
    boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
    activeBoxShadow: "0 0 4px rgba(0,0,0,0.3)",
  };

  return (
    <div className="card">
      <div className="noti-header">
        <div className="noti-title-icon">
          <FiBell className="bell-icon" />
          <h3>Configurações de Notificações</h3>
        </div>
      </div>

      <div className="noti-list">
        <div className="noti-item">
          <div>
            <span className="noti-title">Notificações por E-mail</span>
            <p>Enviar notificações automáticas por e-mail</p>
          </div>
          <Switch
            checked={email}
            onChange={() => setEmail(!email)}
            {...switchStyle}
          />
        </div>

        <div className="noti-item">
          <div>
            <span className="noti-title">Notificações por SMS</span>
            <p>Enviar notificações por mensagem de texto</p>
          </div>
          <Switch
            checked={sms}
            onChange={() => setSms(!sms)}
            {...switchStyle}
          />
        </div>

        <div className="noti-item">
          <div>
            <span className="noti-title">Lembretes de Atraso</span>
            <p>Notificar sobre livros em atraso</p>
          </div>
          <Switch
            checked={atraso}
            onChange={() => setAtraso(!atraso)}
            {...switchStyle}
          />
        </div>

        <div className="noti-item">
          <div>
            <span className="noti-title">Lembretes de Devolução</span>
            <p>Notificar sobre devoluções próximas</p>
          </div>
          <Switch
            checked={devolucao}
            onChange={() => setDevolucao(!devolucao)}
            {...switchStyle}
          />
        </div>
      </div>

      <div className="form-group full">
        <label>Dias de Antecedência para Lembrete</label>
        <input
          type="number"
          value={dias}
          onChange={(e) => setDias(e.target.value)}
        />
      </div>

      <div className="card-actions">
        <button className="btn-secondary">Restaurar Padrão</button>
        <button className="btn-primary">Salvar Configurações</button>
      </div>
    </div>
  );
}