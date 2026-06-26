import { useEffect, useState } from "react";
import Select from "react-select";
import { useToast } from "../../../../../contexts/ToastContext";
import { getConfiguracoes, updateConfiguracao } from "../../../../../services/api";
import { getConfigValue, configToNumber } from "../../utils/configUtils";
import { applyTheme, getSavedTheme } from "../../../../../utils/theme";
import { getReactSelectStyles } from "../../../../../utils/reactSelectStyles";
import { useRegisterSave } from "../../contexts/ConfigSaveContext";
import "./Geral.css";

const temaOptions = [
  { value: "Claro", label: "Claro" },
  { value: "Escuro", label: "Escuro" },
];

export default function Geral() {
  const { addToast } = useToast();
  const [nome, setNome] = useState("");
  const [dias, setDias] = useState(14);
  const [renovacoes, setRenovacoes] = useState(2);
  const [livrosPorAluno, setLivrosPorAluno] = useState(3);
  const [tema, setTema] = useState(getSavedTheme());
  const [isSaving, setIsSaving] = useState(false);
  const selectStyles = getReactSelectStyles();

  useEffect(() => {
    async function load() {
      try {
        const configs = await getConfiguracoes();

        const nomeAtual = getConfigValue(
          configs,
          "nome_biblioteca",
          "Biblioteca - Escola 9 de Julho de Taquaritinga"
        );
        setNome(nomeAtual);
        localStorage.setItem("nomeBiblioteca", nomeAtual);

        setDias(configToNumber(configs, "dias_emprestimo", 14));
        setRenovacoes(configToNumber(configs, "maximo_renovacoes", 2));
        setLivrosPorAluno(configToNumber(configs, "livros_por_aluno", 3));
        setTema(getConfigValue(configs, "tema", getSavedTheme()));
      } catch (error) {
        addToast("Erro ao carregar configurações gerais", "error");
      }
    }

    load();
  }, [addToast]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await Promise.all([
        updateConfiguracao({ chave: "nome_biblioteca", valor: nome }),
        updateConfiguracao({ chave: "dias_emprestimo", valor: String(dias) }),
        updateConfiguracao({ chave: "maximo_renovacoes", valor: String(renovacoes) }),
        updateConfiguracao({ chave: "livros_por_aluno", valor: String(livrosPorAluno) }),
        updateConfiguracao({ chave: "tema", valor: tema }),
      ]);

      localStorage.setItem("nomeBiblioteca", nome);
      window.dispatchEvent(new Event("nomeBibliotecaAtualizado"));
      try {
        applyTheme(tema);
      } catch (e) {
        console.error("Erro ao aplicar tema após salvar", e);
      }

      addToast("Configurações gerais salvas com sucesso", "success");
    } catch (error) {
      addToast("Erro ao salvar configurações gerais", "error");
      throw error; // re-throw so saveAll() can detect failure
    } finally {
      setIsSaving(false);
    }
  };

  // Register this tab's save handler in the shared context
  useRegisterSave("geral", handleSave);

  return (
    <div className="card">
      <div className="geral-header">
        <h3>Configurações Gerais</h3>
      </div>

      <div className="form-grid">
        <div className="form-group full">
          <label>Nome da Biblioteca</label>
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: Biblioteca Municipal"
          />
        </div>

        <div className="form-group">
          <label>Tema</label>
          <Select
            options={temaOptions}
            value={temaOptions.find((option) => option.value === tema)}
            onChange={(option) => setTema(option?.value || "Claro")}
            styles={selectStyles}
          />
          <span className="field-hint">Tema do sistema</span>
        </div>

        <div className="form-group">
          <label>Dias Máximos de Empréstimo</label>
          <input
            type="number"
            value={dias}
            min={1}
            onChange={(e) => setDias(Number(e.target.value) || 1)}
          />
          <span className="field-hint">Prazo padrão para devolução de livros</span>
        </div>

        <div className="form-group">
          <label>Máximo de Renovações</label>
          <input
            type="number"
            value={renovacoes}
            min={0}
            onChange={(e) => setRenovacoes(Number(e.target.value) || 0)}
          />
          <span className="field-hint">Renovações permitidas por empréstimo</span>
        </div>

        <div className="form-group">
          <label>Livros por Aluno</label>
          <input
            type="number"
            value={livrosPorAluno}
            min={1}
            onChange={(e) => setLivrosPorAluno(Number(e.target.value) || 1)}
          />
          <span className="field-hint">Quantidade máxima simultânea</span>
        </div>
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