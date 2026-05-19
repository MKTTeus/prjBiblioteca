import { useEffect, useState } from "react";
import { useToast } from "../../../../../contexts/ToastContext";
import { getConfiguracoes, updateConfiguracao } from "../../../../../services/api";
import { getConfigValue, configToNumber } from "../../utils/configUtils";
import "./Geral.css";

export default function Geral() {
  const { addToast } = useToast();
  const [nome, setNome] = useState("");
  const [dias, setDias] = useState(14);
  const [renovacoes, setRenovacoes] = useState(2);
  const [livrosPorAluno, setLivrosPorAluno] = useState(3);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const configs = await getConfiguracoes();
        setNome(getConfigValue(configs, "nome_biblioteca", "Biblioteca - Escola 9 de Julho de Taquaritinga"));
        setDias(configToNumber(configs, "dias_emprestimo", 14));
        setRenovacoes(configToNumber(configs, "maximo_renovacoes", 2));
        setLivrosPorAluno(configToNumber(configs, "livros_por_aluno", 3));
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
      ]);
      addToast("Configurações gerais salvas com sucesso", "success");
    } catch (error) {
      addToast("Erro ao salvar configurações gerais", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="card">
      <div className="geral-header">
        <h3>Configurações Gerais</h3>
      </div>

      <div className="form-grid">
        <div className="form-group full">
          <label>Nome da Biblioteca</label>
          <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>

        <div className="form-group">
          <label>Dias Máximos de Empréstimo</label>
          <input
            type="number"
            value={dias}
            min={1}
            onChange={(e) => setDias(Number(e.target.value) || 1)}
          />
        </div>

        <div className="form-group">
          <label>Máximo de Renovações</label>
          <input
            type="number"
            value={renovacoes}
            min={0}
            onChange={(e) => setRenovacoes(Number(e.target.value) || 0)}
          />
        </div>

        <div className="form-group full">
          <label>Livros por Aluno</label>
          <input
            type="number"
            value={livrosPorAluno}
            min={1}
            onChange={(e) => setLivrosPorAluno(Number(e.target.value) || 1)}
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
