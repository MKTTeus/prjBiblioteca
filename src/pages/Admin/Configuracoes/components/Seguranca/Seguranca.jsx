import { useEffect, useState } from "react";
import Switch from "react-switch";
import { FiShield } from "react-icons/fi";
import { useToast } from "../../../../../contexts/ToastContext";
import { getConfiguracoes, updateConfiguracao } from "../../../../../services/api";
import { configToBool, configToNumber } from "../../utils/configUtils";
import { useRegisterSave } from "../../contexts/ConfigSaveContext";
import "./Seguranca.css";

export default function Seguranca() {
  const { addToast } = useToast();
  const [senhaForte, setSenhaForte] = useState(true);

  const [timeout, setTimeoutValue] = useState(30);
  const [tamanhoSenha, setTamanhoSenha] = useState(8);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const configs = await getConfiguracoes();
        setTimeoutValue(configToNumber(configs, "timeout_sessao", 30));
        setTamanhoSenha(configToNumber(configs, "tamanho_minimo_senha", 8));
        setSenhaForte(configToBool(configs, "exigir_senha_forte", true));
      } catch (error) {
        addToast("Erro ao carregar configurações de segurança", "error");
      }
    }

    load();
  }, [addToast]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await Promise.all([
        updateConfiguracao({ chave: "timeout_sessao", valor: String(timeout) }),
        updateConfiguracao({ chave: "tamanho_minimo_senha", valor: String(tamanhoSenha) }),
        updateConfiguracao({ chave: "exigir_senha_forte", valor: String(senhaForte) }),

      ]);
      addToast("Configurações de segurança salvas com sucesso", "success");
    } catch (error) {
      addToast("Erro ao salvar configurações de segurança", "error");
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  useRegisterSave("seguranca", handleSave);

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
    <div className="card seguranca-settings">
      <div className="seguranca-header">
        <FiShield className="shield-icon" />
        <h3>Configurações de Segurança</h3>
      </div>

      <div className="alert-box">
        Estas configurações afetam a segurança do sistema. Faça alterações com cuidado.
      </div>

      <div className="grid-2">
        <div className="form-group">
          <label>Timeout da Sessão (minutos)</label>
          <input
            type="number"
            value={timeout}
            min={1}
            max={1440}
            onChange={(e) => setTimeoutValue(Number(e.target.value) || 0)}
          />
        </div>

        <div className="form-group">
          <label>Tamanho Mínimo da Senha</label>
          <input
            type="number"
            value={tamanhoSenha}
            min={8}
            max={32}
            onChange={(e) => setTamanhoSenha(Number(e.target.value) || 1)}
          />
        </div>
      </div>

      <div className="switch-row">
        <div>
          <span className="switch-title">Exigir Senha Forte</span>
          <p>Senhas devem conter letras, números e símbolos</p>
        </div>
        <Switch checked={senhaForte} onChange={() => setSenhaForte(!senhaForte)} {...switchStyle} />
      </div>

      <div className="switch-row">
        <div>
          <span className="switch-title">Autenticação de Dois Fatores</span>
          <p>Indisponível nesta versão</p>
        </div>
        <Switch checked={false} disabled {...switchStyle} />
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
