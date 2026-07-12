import { useState } from "react";
import { FiBookOpen, FiAlertTriangle, FiGrid } from "react-icons/fi";
import "./Relatorios.css";

import RelatorioEmprestimos from "./RelatorioEmprestimos";
import RelatorioAtrasos from "./RelatorioAtrasos";
import RelatorioAcervo from "./RelatorioAcervo";

const ABAS = [
  { valor: "emprestimos", label: "Empréstimos", icon: <FiBookOpen />, Componente: RelatorioEmprestimos },
  { valor: "atrasos", label: "Usuários em Atraso", icon: <FiAlertTriangle />, Componente: RelatorioAtrasos },
  { valor: "acervo", label: "Acervo por Categoria/Gênero", icon: <FiGrid />, Componente: RelatorioAcervo },
];

export default function Relatorios() {
  const [abaAtiva, setAbaAtiva] = useState("emprestimos");

  const AbaAtual = ABAS.find((a) => a.valor === abaAtiva)?.Componente || RelatorioEmprestimos;

  return (
    <div className="rel-page page-shell">
      <div className="rel-header">
        <div>
          <h1>Relatórios</h1>
          <p>Acompanhe empréstimos, atrasos e o acervo da biblioteca.</p>
        </div>
      </div>

      <div className="rel-tabs" role="tablist" aria-label="Tipos de relatório">
        {ABAS.map((aba) => (
          <button
            key={aba.valor}
            type="button"
            role="tab"
            aria-selected={abaAtiva === aba.valor}
            className={`rel-tab-btn ${abaAtiva === aba.valor ? "rel-tab-btn-active" : ""}`}
            onClick={() => setAbaAtiva(aba.valor)}
          >
            {aba.icon} {aba.label}
          </button>
        ))}
      </div>

      {/* Cada aba mantém seu próprio estado (filtros, itens, etc.) — ao trocar
          de aba e voltar, ela some do DOM e refaz a busca do zero, o que é
          intencional aqui: mantém o relatório sempre com dados atuais. */}
      <AbaAtual />
    </div>
  );
}
