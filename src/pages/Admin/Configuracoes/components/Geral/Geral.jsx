import { useEffect, useState } from "react";
import Switch from "react-switch";
import { FiBookOpen, FiMoon, FiSliders } from "react-icons/fi";
import { useToast } from "../../../../../contexts/ToastContext";
import {
  getConfiguracoes,
  updateConfiguracao,
  getMeuPerfilAdmin,
  atualizarMeuPerfilAdmin,
} from "../../../../../services/api";
import { getConfigValue, configToNumber } from "../../utils/configUtils";
import { applyTheme, getSavedTheme } from "../../../../../utils/theme";
import { useRegisterSave } from "../../contexts/ConfigSaveContext";
import "./Geral.css";

export default function Geral() {
  const { addToast } = useToast();
  const [nome, setNome] = useState("");
  const [dias, setDias] = useState(14);
  const [renovacoes, setRenovacoes] = useState(2);
  const [livrosPorAluno, setLivrosPorAluno] = useState(3);
  const [temaDark, setTemaDark] = useState(getSavedTheme().toLowerCase() === "escuro");
  const [isSaving, setIsSaving] = useState(false);

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
      } catch (error) {
        addToast("Erro ao carregar configurações gerais", "error");
      }

      // Tema é preferência individual do admin logado, não configuração global.
      try {
        const perfil = await getMeuPerfilAdmin();
        setTemaDark((perfil?.tema || getSavedTheme()).toLowerCase() === "escuro");
      } catch (error) {
        setTemaDark(getSavedTheme().toLowerCase() === "escuro");
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
      ]);

      localStorage.setItem("nomeBiblioteca", nome);
      window.dispatchEvent(new Event("nomeBibliotecaAtualizado"));

      addToast("Configurações gerais salvas com sucesso", "success");
    } catch (error) {
      addToast("Erro ao salvar configurações gerais", "error");
      throw error; // re-throw so saveAll() can detect failure
    } finally {
      setIsSaving(false);
    }
  };

  // Tema salva na hora, sem passar pelo "Salvar Tudo" — igual ao comportamento
  // da tela de configurações do usuário. É preferência individual: fica
  // salva apenas para o admin logado, não afeta os demais usuários.
  const handleToggleTema = async (checked) => {
    const novoTema = checked ? "Escuro" : "Claro";
    const temaAnterior = temaDark;

    setTemaDark(checked);
    applyTheme(novoTema);

    try {
      await atualizarMeuPerfilAdmin({ tema: novoTema });
      addToast(`Tema ${novoTema.toLowerCase()} aplicado`, "success");
    } catch (error) {
      setTemaDark(temaAnterior);
      applyTheme(temaAnterior ? "Escuro" : "Claro");
      addToast("Erro ao salvar tema", "error");
    }
  };

  // Register this tab's save handler in the shared context
  useRegisterSave("geral", handleSave);

  return (
    <div className="geral-sections">
      {/* Identidade da Biblioteca */}
      <div className="card">
        <div className="geral-header">
          <FiBookOpen className="card-section-icon" />
          <h3>Identidade da Biblioteca</h3>
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
            <span className="field-hint">Nome exibido no cabeçalho e nos documentos gerados pelo sistema</span>
          </div>
        </div>
      </div>

      {/* Aparência */}
      <div className="card">
        <div className="geral-header">
          <FiMoon className="card-section-icon" />
          <h3>Aparência</h3>
        </div>

        <div className="form-group switch-section">
          <label>Tema do sistema</label>
          <div className="control-row">
            <Switch
              checked={temaDark}
              onChange={handleToggleTema}
              offColor="#cbd5e1"
              onColor="#111827"
              uncheckedIcon={false}
              checkedIcon={false}
              height={26}
              width={52}
              handleDiameter={22}
            />
            <span className="toggle-text">{temaDark ? "Escuro" : "Claro"}</span>
          </div>
          <span className="field-hint">Aplicado apenas para a sua conta de administrador</span>
        </div>
      </div>

      {/* Regras de Empréstimo */}
      <div className="card">
        <div className="geral-header">
          <FiSliders className="card-section-icon" />
          <h3>Regras de Empréstimo</h3>
        </div>

        <div className="form-grid three-col">
          <div className="form-group">
            <label>Dias Máximos</label>
            <input
              type="number"
              value={dias}
              min={1}
              onChange={(e) => setDias(Number(e.target.value) || 1)}
            />
            <span className="field-hint">Prazo padrão para devolução</span>
          </div>

          <div className="form-group">
            <label>Máximo de Renovações</label>
            <input
              type="number"
              value={renovacoes}
              min={0}
              onChange={(e) => setRenovacoes(Number(e.target.value) || 0)}
            />
            <span className="field-hint">Renovações por empréstimo</span>
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
    </div>
  );
}