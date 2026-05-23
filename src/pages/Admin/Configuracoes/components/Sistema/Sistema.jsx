import { useEffect, useState } from "react";
import Select from "react-select";
import { FiSettings } from "react-icons/fi";
import { useToast } from "../../../../../contexts/ToastContext";
import { getConfiguracoes, updateConfiguracao } from "../../../../../services/api";
import { getConfigValue } from "../../utils/configUtils";
import { applyTheme, getSavedTheme } from "../../../../../utils/theme";
import { getReactSelectStyles } from "../../../../../utils/reactSelectStyles";
import "./Sistema.css";

const temaOptions = [
  { value: "Claro", label: "Claro" },
  { value: "Escuro", label: "Escuro" },
];

const idiomaOptions = [
  { value: "pt-br", label: "Português (Brasil)" },
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
];

const fusoOptions = [
  { value: "sp", label: "São Paulo (GMT-3)" },
  { value: "lisboa", label: "Lisboa (GMT+0)" },
  { value: "ny", label: "New York (GMT-5)" },
];

const backupOptions = [
  { value: "diario", label: "Diário" },
  { value: "semanal", label: "Semanal" },
  { value: "mensal", label: "Mensal" },
];

export default function Sistema() {
  const { addToast } = useToast();
  const [tema, setTema] = useState(getSavedTheme());
  const [idioma, setIdioma] = useState("pt-br");
  const [fuso, setFuso] = useState("sp");
  const [backup, setBackup] = useState("diario");
  const [isSaving, setIsSaving] = useState(false);
  const selectStyles = getReactSelectStyles();

  useEffect(() => {
    async function load() {
      try {
        const configs = await getConfiguracoes();
        setTema(getConfigValue(configs, "tema", getSavedTheme()));
        setIdioma(getConfigValue(configs, "idioma", "pt-br"));
        setFuso(getConfigValue(configs, "fuso_horario", "sp"));
        setBackup(getConfigValue(configs, "frequencia_backup", "diario"));
      } catch (error) {
        addToast("Erro ao carregar configurações do sistema", "error");
      }
    }

    load();
  }, [addToast]);

  useEffect(() => {
    // Nota: removido efeito que aplicava o tema imediatamente ao alterar o formulário.
    // O tema será aplicado apenas quando o usuário clicar em "Salvar Configurações".
  }, [tema]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await Promise.all([
        updateConfiguracao({ chave: "tema", valor: tema }),
        updateConfiguracao({ chave: "idioma", valor: idioma }),
        updateConfiguracao({ chave: "fuso_horario", valor: fuso }),
        updateConfiguracao({ chave: "frequencia_backup", valor: backup }),
      ]);
      // Aplicar o tema global somente após o salvamento bem-sucedido
      try {
        applyTheme(tema);
      } catch (e) {
        console.error('Erro ao aplicar tema após salvar', e);
      }
      addToast("Configurações do sistema salvas com sucesso", "success");
    } catch (error) {
      addToast("Erro ao salvar configurações do sistema", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="card">
      <div className="sistema-header">
        <FiSettings className="sistema-icon" />
        <h3>Configurações do Sistema</h3>
      </div>

      <div className="grid-2">
        <div className="form-group">
          <label>Tema</label>
          <Select
            options={temaOptions}
            value={temaOptions.find((option) => option.value === tema)}
            onChange={(option) => setTema(option?.value || "Claro")}
            styles={selectStyles}
          />
        </div>

        <div className="form-group">
          <label>Idioma</label>
          <Select
            options={idiomaOptions}
            value={idiomaOptions.find((option) => option.value === idioma)}
            onChange={(option) => setIdioma(option?.value || "pt-br")}
            styles={selectStyles}
          />
        </div>

        <div className="form-group">
          <label>Fuso Horário</label>
          <Select
            options={fusoOptions}
            value={fusoOptions.find((option) => option.value === fuso)}
            onChange={(option) => setFuso(option?.value || "sp")}
            styles={selectStyles}
          />
        </div>

        <div className="form-group">
          <label>Frequência de Backup</label>
          <Select
            options={backupOptions}
            value={backupOptions.find((option) => option.value === backup)}
            onChange={(option) => setBackup(option?.value || "diario")}
            styles={selectStyles}
          />
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
