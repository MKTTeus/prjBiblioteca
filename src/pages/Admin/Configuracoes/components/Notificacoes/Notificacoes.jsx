import { useEffect, useState } from "react";
import Switch from "react-switch";
import { FiBell } from "react-icons/fi";
import { useToast } from "../../../../../contexts/ToastContext";
import { getConfiguracoes, updateConfiguracao } from "../../../../../services/api";
import { configToBool, configToNumber } from "../../utils/configUtils";
import { useRegisterSave } from "../../contexts/ConfigSaveContext";
import "./Notificacoes.css";

export default function Notificacoes() {
  const { addToast } = useToast();
  const [email, setEmail] = useState(true);
  const [sms, setSms] = useState(false);
  const [atraso, setAtraso] = useState(true);
  const [devolucao, setDevolucao] = useState(true);
  const [dias, setDias] = useState(2);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const configs = await getConfiguracoes();
        setEmail(configToBool(configs, "notificacao_email", true));
        setSms(configToBool(configs, "notificacao_sms", false));
        setAtraso(configToBool(configs, "lembrete_atraso", true));
        setDevolucao(configToBool(configs, "lembrete_devolucao", true));
        setDias(configToNumber(configs, "dias_antecedencia_lembrete", 2));
      } catch (error) {
        addToast("Erro ao carregar configurações de notificações", "error");
      }
    }

    load();
  }, [addToast]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await Promise.all([
        updateConfiguracao({ chave: "notificacao_email", valor: String(email) }),
        updateConfiguracao({ chave: "notificacao_sms", valor: String(sms) }),
        updateConfiguracao({ chave: "lembrete_atraso", valor: String(atraso) }),
        updateConfiguracao({ chave: "lembrete_devolucao", valor: String(devolucao) }),
        updateConfiguracao({ chave: "dias_antecedencia_lembrete", valor: String(dias) }),
      ]);
      addToast("Configurações de notificações salvas com sucesso", "success");
    } catch (error) {
      addToast("Erro ao salvar configurações de notificações", "error");
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  useRegisterSave("notificacoes", handleSave);

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
          <Switch checked={email} onChange={() => setEmail(!email)} {...switchStyle} />
        </div>

        <div className="noti-item">
          <div>
            <span className="noti-title">Notificações por SMS</span>
            <p>Enviar notificações por mensagem de texto</p>
          </div>
          <Switch checked={sms} onChange={() => setSms(!sms)} {...switchStyle} />
        </div>

        <div className="noti-item">
          <div>
            <span className="noti-title">Lembretes de Atraso</span>
            <p>Notificar sobre livros em atraso</p>
          </div>
          <Switch checked={atraso} onChange={() => setAtraso(!atraso)} {...switchStyle} />
        </div>

        <div className="noti-item">
          <div>
            <span className="noti-title">Lembretes de Devolução</span>
            <p>Notificar sobre devoluções próximas</p>
          </div>
          <Switch checked={devolucao} onChange={() => setDevolucao(!devolucao)} {...switchStyle} />
        </div>
      </div>

      <div className="form-group full">
        <label>Dias de Antecedência para Lembrete</label>
        <input
          type="number"
          value={dias}
          min={0}
          onChange={(e) => setDias(Number(e.target.value) || 0)}
        />
      </div>

      <div className="card-actions">
        <button
          className="btn-secondary"
          type="button"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? "Salvando..." : "Salvar Configurações"}
        </button>
      </div>
    </div>
  );
}