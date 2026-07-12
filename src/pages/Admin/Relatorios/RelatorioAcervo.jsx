import { useEffect, useState } from "react";
import { FiDownload, FiFileText, FiBook, FiLayers, FiLoader } from "react-icons/fi";

import StatsCard from "../../../components/StatsCard/StatsCard";
import { getRelatorioAcervo } from "../../../services/api";
import { exportarPDF, exportarExcel } from "../../../utils/exportarArquivo";
import {
  AGRUPADOR_OPTIONS,
  formatarData,
  linhasParaExportAcervo,
  colunasExportAcervo,
} from "./utils";

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function RelatorioAcervo() {
  const [agrupador, setAgrupador] = useState("categoria");
  const [itens, setItens] = useState([]);
  const [resumo, setResumo] = useState({ totalLivros: 0, totalExemplares: 0, totalGrupos: 0 });
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(null);

  async function buscar(agrupadorAtual = agrupador) {
    setCarregando(true);
    setErro(null);
    try {
      const resultado = await getRelatorioAcervo(agrupadorAtual);
      setItens(resultado.itens || []);
      setResumo(resultado.resumo || { totalLivros: 0, totalExemplares: 0, totalGrupos: 0 });
    } catch (error) {
      console.error(error);
      setErro("Não foi possível carregar o relatório. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    buscar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleMudarAgrupador(valor) {
    setAgrupador(valor);
    buscar(valor);
  }

  const labelGrupo = agrupador === "genero" ? "Gênero" : "Categoria";

  function handleExportarPDF() {
    exportarPDF({
      titulo: `Relatório de Acervo por ${labelGrupo}`,
      subtitulo: `Gerado em: ${formatarData(hojeISO())}`,
      colunas: colunasExportAcervo(agrupador),
      linhas: linhasParaExportAcervo(itens),
      nomeArquivo: `relatorio-acervo-${agrupador}-${hojeISO()}`,
    });
  }

  function handleExportarExcel() {
    exportarExcel({
      nomeAba: "Acervo",
      colunas: colunasExportAcervo(agrupador),
      linhas: linhasParaExportAcervo(itens),
      nomeArquivo: `relatorio-acervo-${agrupador}-${hojeISO()}`,
    });
  }

  return (
    <div className="rel-tab-content">
      <div className="rel-subheader">
        <p>Quantidade de títulos e exemplares do acervo, agrupados por {labelGrupo.toLowerCase()}.</p>

        <div className="rel-export-actions">
          <button
            type="button"
            className="rel-btn-export"
            onClick={handleExportarExcel}
            disabled={carregando || itens.length === 0}
          >
            <FiDownload /> Excel
          </button>
          <button
            type="button"
            className="rel-btn-export"
            onClick={handleExportarPDF}
            disabled={carregando || itens.length === 0}
          >
            <FiFileText /> PDF
          </button>
        </div>
      </div>

      <section className="stats-cards-grid" aria-label="Resumo do acervo">
        <StatsCard title="Títulos Ativos" value={resumo.totalLivros} icon={<FiBook />} color="blue" />
        <StatsCard title="Exemplares (cópias)" value={resumo.totalExemplares} icon={<FiLayers />} color="blue" />
        <StatsCard title={`${labelGrupo}s no Acervo`} value={resumo.totalGrupos} icon={<FiLayers />} color="green" />
      </section>

      <div className="rel-filtros">
        <div className="rel-filtro-campo">
          <label htmlFor="rel-acervo-agrupador">Agrupar por</label>
          <select
            id="rel-acervo-agrupador"
            value={agrupador}
            onChange={(e) => handleMudarAgrupador(e.target.value)}
          >
            {AGRUPADOR_OPTIONS.map((opcao) => (
              <option key={opcao.valor} value={opcao.valor}>{opcao.label}</option>
            ))}
          </select>
        </div>

        <button type="button" className="rel-btn-filtrar" onClick={() => buscar()} disabled={carregando}>
          {carregando ? <FiLoader className="rel-spinner" /> : "Atualizar"}
        </button>
      </div>

      {erro && <div className="rel-erro">{erro}</div>}

      <div className="rel-table-box">
        <table>
          <thead>
            <tr>
              <th>{labelGrupo}</th>
              <th>Títulos</th>
              <th>Exemplares</th>
              <th>Disponíveis</th>
              <th>Emprestados</th>
            </tr>
          </thead>
          <tbody>
            {carregando ? (
              <tr>
                <td colSpan="5" className="rel-empty">Carregando...</td>
              </tr>
            ) : itens.length === 0 ? (
              <tr>
                <td colSpan="5" className="rel-empty">Nenhum livro ativo encontrado no acervo.</td>
              </tr>
            ) : (
              itens.map((item) => (
                <tr key={item.grupo}>
                  <td>{item.grupo}</td>
                  <td>{item.quantidadeLivros}</td>
                  <td>{item.quantidadeExemplares}</td>
                  <td>{item.quantidadeDisponiveis}</td>
                  <td>{item.quantidadeEmprestados}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
