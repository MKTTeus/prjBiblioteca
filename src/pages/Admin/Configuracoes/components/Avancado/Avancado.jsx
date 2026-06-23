import { useEffect, useState } from "react";
import Switch from "react-switch";
import { TbAdjustmentsAlt } from "react-icons/tb";
import { useToast } from "../../../../../contexts/ToastContext";
import { getConfiguracoes, updateConfiguracao } from "../../../../../services/api";
import { configToBool } from "../../utils/configUtils";
import "./Avancado.css";
import { baixarBackup } from "../../../../../services/backupService";

export default function Avancado() {
  const { addToast } = useToast();
  const [debug, setDebug] = useState(false);
  const [maintenance, setMaintenance] = useState(false);
  const [logApi, setLogApi] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [fazendoBackup, setFazendoBackup] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const configs = await getConfiguracoes();
        setDebug(configToBool(configs, "modo_debug", false));
        setMaintenance(configToBool(configs, "modo_manutencao", false));
        setLogApi(configToBool(configs, "log_api", true));
      } catch (error) {
        addToast("Erro ao carregar configurações avançadas", "error");
      }
    }

    load();
  }, [addToast]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await Promise.all([
        updateConfiguracao({ chave: "modo_debug", valor: String(debug) }),
        updateConfiguracao({ chave: "modo_manutencao", valor: String(maintenance) }),
        updateConfiguracao({ chave: "log_api", valor: String(logApi) }),
      ]);
      addToast("Configurações avançadas salvas com sucesso", "success");
    } catch (error) {
      addToast("Erro ao salvar configurações avançadas", "error");
    } finally {
      setIsSaving(false);
    }
  };

  async function handleBackupCompleto() {
    setFazendoBackup(true);
    try {
      await baixarBackup();
      addToast("Backup gerado com sucesso", "success");
    } catch {
      addToast("Erro ao gerar backup", "error");
    } finally {
      setFazendoBackup(false);
    }
  }

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
      <div className="avancado-header">
        <TbAdjustmentsAlt className="settings-icon" />
        <h3>Configurações Avançadas</h3>
      </div>

      <div className="alert-box alert-neutral">
        Estas configurações são avançadas. Altere apenas se souber o que está fazendo.
      </div>

      <div className="switch-row">
        <div>
          <span className="switch-title">Modo de Debug</span>
          <p>Ativar logs detalhados para depuração</p>
        </div>

        <Switch checked={debug} onChange={() => setDebug(!debug)} {...switchStyle} />
      </div>

      <div className="switch-row">
        <div>
          <span className="switch-title">Modo de Manutenção</span>
          <p>Bloquear acesso temporariamente</p>
        </div>

        <Switch checked={maintenance} onChange={() => setMaintenance(!maintenance)} {...switchStyle} />
      </div>

      <div className="switch-row">
        <div>
          <span className="switch-title">Log da API</span>
          <p>Registrar todas as chamadas da API</p>
        </div>

        <Switch checked={logApi} onChange={() => setLogApi(!logApi)} {...switchStyle} />
      </div>

      <hr className="section-divider" />

      <div className="acoes-sistema">
        <h4>Ações do Sistema</h4>

        <div className="acoes-botoes">
          <button className="btn-secondary" type="button">Limpar Cache</button>
          <button className="btn-secondary" type="button">Reindexar Banco</button>
          <button
            className="btn-secondary text-danger"
            type="button"
            onClick={handleBackupCompleto}
            disabled={fazendoBackup}
          >
            {fazendoBackup ? "Gerando..." : "Backup Completo"}
          </button>
        </div>
      </div>

      <div className="card-actions">
        <button className="btn-secondary" type="button" onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Salvando..." : "Salvar Configurações"}
        </button>
      </div>
    </div>
  );
}
