import { useEffect, useState } from "react";
import { FiBookOpen, FiMoon, FiSliders } from "react-icons/fi";
import { Sun, Moon } from "lucide-react";
import { useToast } from "../../../../../contexts/ToastContext";
import { salvarConfiguracoes } from "../../utils/saveSettings";
import {
  getConfiguracoes,
  getMeuPerfilAdmin,
  atualizarMeuPerfilAdmin,
} from "../../../../../services/api";
import { getConfigValue, configToNumber } from "../../utils/configUtils";
import { applyTheme, getSavedTheme } from "../../../../../utils/theme";
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
      await salvarConfiguracoes([
        ["Nome da biblioteca", "nome_biblioteca", nome],
        ["Dias de empréstimo", "dias_emprestimo", dias],
        ["Máximo de renovações", "maximo_renovacoes", renovacoes],
        ["Livros por aluno", "livros_por_aluno", livrosPorAluno],
      ]);

      localStorage.setItem("nomeBiblioteca", nome);
      window.dispatchEvent(new Event("nomeBibliotecaAtualizado"));

      addToast("Configurações gerais salvas com sucesso", "success");
    } catch (error) {
      addToast(error.message, "error", 10000);
    } finally {
      setIsSaving(false);
    }
  };

  // Tema salva imediatamente, enquanto os demais campos usam o botão desta aba.
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


  return (
    <div className="geral-sections">
      {/* Identidade da Biblioteca */}
      <div className="card geral-identidade">
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
      <div className="card geral-aparencia">
        <div className="geral-header">
          <FiMoon className="card-section-icon" />
          <h3>Aparência</h3>
        </div>

        <div className="form-group switch-section">
          <label>Tema do sistema</label>
          <div className="control-row config-theme-choice" role="group" aria-label="Tema do sistema">
            <button type="button" className={!temaDark ? "selected" : ""} aria-pressed={!temaDark} onClick={() => temaDark && handleToggleTema(false)}>
              <Sun size={17} aria-hidden="true"/> Claro
            </button>
            <button type="button" className={temaDark ? "selected" : ""} aria-pressed={temaDark} onClick={() => !temaDark && handleToggleTema(true)}>
              <Moon size={17} aria-hidden="true"/> Escuro
            </button>
          </div>
          <span className="field-hint">Aplicado apenas para a sua conta de administrador</span>
        </div>
      </div>

      {/* Regras de Empréstimo */}
      <div className="card geral-regras">
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
