import { useEffect, useMemo, useState } from "react";
import { FiDownload, FiFileText, FiBookOpen, FiAlertTriangle, FiCheckCircle, FiLoader } from "react-icons/fi";

import StatsCard from "../../../components/StatsCard/StatsCard";
import { getRelatorioEmprestimos } from "../../../services/api";
import { exportarPDF, exportarExcel } from "../../../utils/exportarArquivo";
import { SERIES } from "../../../utils/series";
import {
  STATUS_OPTIONS,
  TIPO_USUARIO_OPTIONS,
  STATUS_LABEL,
  AGRUPADOR_EMPRESTIMOS_OPTIONS,
  formatarData,
  linhasParaExport,
  COLUNAS_EXPORT,
  linhasParaExportRankingEmprestimos,
  COLUNAS_EXPORT_RANKING_EMPRESTIMOS,
} from "./utils";

function primeiroDiaDoMes() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function RelatorioEmprestimos() {
  const [filtros, setFiltros] = useState({
    dataInicio: primeiroDiaDoMes(),
    dataFim: hojeISO(),
    status: "todos",
    tipoUsuario: "todos",
    turma: "",
    serie: "",
    agrupador: "",
  });

  const [itens, setItens] = useState([]);
  const [ranking, setRanking] = useState(null);
  const [resumo, setResumo] = useState({ ativos: 0, atrasados: 0, devolvidos: 0, total: 0 });
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(null);

  async function buscar() {
    setCarregando(true);
    setErro(null);
    try {
      const resultado = await getRelatorioEmprestimos(filtros);
      setItens(resultado.itens || []);
      setRanking(resultado.ranking || null);
      setResumo(resultado.resumo || { ativos: 0, atrasados: 0, devolvidos: 0, total: 0 });
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

  const periodoLabel = useMemo(() => {
    if (!filtros.dataInicio && !filtros.dataFim) return "Todo o período";
    return `${formatarData(filtros.dataInicio)} a ${formatarData(filtros.dataFim)}`;
  }, [filtros.dataInicio, filtros.dataFim]);

  const emModoRanking = Boolean(filtros.agrupador) && Array.isArray(ranking);

  function handleExportarPDF() {
    if (emModoRanking) {
      exportarPDF({
        titulo: "Relatório de Empréstimos — Ranking",
        subtitulo: `Período: ${periodoLabel}`,
        colunas: COLUNAS_EXPORT_RANKING_EMPRESTIMOS,
        linhas: linhasParaExportRankingEmprestimos(ranking),
        nomeArquivo: `relatorio-emprestimos-ranking-${hojeISO()}`,
      });
      return;
    }
    exportarPDF({
      titulo: "Relatório de Empréstimos",
      subtitulo: `Período: ${periodoLabel}`,
      colunas: COLUNAS_EXPORT,
      linhas: linhasParaExport(itens),
      nomeArquivo: `relatorio-emprestimos-${hojeISO()}`,
    });
  }

  function handleExportarExcel() {
    if (emModoRanking) {
      exportarExcel({
        nomeAba: "Ranking",
        colunas: COLUNAS_EXPORT_RANKING_EMPRESTIMOS,
        linhas: linhasParaExportRankingEmprestimos(ranking),
        nomeArquivo: `relatorio-emprestimos-ranking-${hojeISO()}`,
      });
      return;
    }
    exportarExcel({
      nomeAba: "Empréstimos",
      colunas: COLUNAS_EXPORT,
      linhas: linhasParaExport(itens),
      nomeArquivo: `relatorio-emprestimos-${hojeISO()}`,
    });
  }

  const semResultado = emModoRanking ? ranking.length === 0 : itens.length === 0;

  return (
    <div className="rel-tab-content">
      <div className="rel-subheader">
        <p>Histórico de empréstimos, ativos e atrasados por período — ou ranking por aluno, turma, série e livro.</p>

        <div className="rel-export-actions">
          <button
            type="button"
            className="rel-btn-export"
            onClick={handleExportarExcel}
            disabled={carregando || semResultado}
          >
            <FiDownload /> Excel
          </button>
          <button
            type="button"
            className="rel-btn-export"
            onClick={handleExportarPDF}
            disabled={carregando || semResultado}
          >
            <FiFileText /> PDF
          </button>
        </div>
      </div>

      <section className="stats-cards-grid" aria-label="Resumo do relatório">
        <StatsCard title="Total no Período" value={resumo.total} icon={<FiBookOpen />} color="blue" />
        <StatsCard title="Ativos" value={resumo.ativos} icon={<FiBookOpen />} color="blue" />
        <StatsCard title="Em Atraso" value={resumo.atrasados} icon={<FiAlertTriangle />} color="red" />
        <StatsCard title="Devolvidos" value={resumo.devolvidos} icon={<FiCheckCircle />} color="green" />
      </section>

      <div className="rel-filtros">
        <div className="rel-filtro-campo">
          <label htmlFor="rel-data-inicio">De</label>
          <input
            id="rel-data-inicio"
            type="date"
            value={filtros.dataInicio}
            onChange={(e) => setFiltros((f) => ({ ...f, dataInicio: e.target.value }))}
          />
        </div>

        <div className="rel-filtro-campo">
          <label htmlFor="rel-data-fim">Até</label>
          <input
            id="rel-data-fim"
            type="date"
            value={filtros.dataFim}
            onChange={(e) => setFiltros((f) => ({ ...f, dataFim: e.target.value }))}
          />
        </div>

        <div className="rel-filtro-campo">
          <label htmlFor="rel-status">Status</label>
          <select
            id="rel-status"
            value={filtros.status}
            onChange={(e) => setFiltros((f) => ({ ...f, status: e.target.value }))}
          >
            {STATUS_OPTIONS.map((opcao) => (
              <option key={opcao.valor} value={opcao.valor}>{opcao.label}</option>
            ))}
          </select>
        </div>

        <div className="rel-filtro-campo">
          <label htmlFor="rel-tipo-usuario">Usuário</label>
          <select
            id="rel-tipo-usuario"
            value={filtros.tipoUsuario}
            onChange={(e) => setFiltros((f) => ({ ...f, tipoUsuario: e.target.value }))}
          >
            {TIPO_USUARIO_OPTIONS.map((opcao) => (
              <option key={opcao.valor} value={opcao.valor}>{opcao.label}</option>
            ))}
          </select>
        </div>

        <div className="rel-filtro-campo">
          <label htmlFor="rel-serie">Série</label>
          <select
            id="rel-serie"
            value={filtros.serie}
            onChange={(e) => setFiltros((f) => ({ ...f, serie: e.target.value }))}
          >
            <option value="">Todas</option>
            {SERIES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="rel-filtro-campo">
          <label htmlFor="rel-turma">Turma</label>
          <input
            id="rel-turma"
            type="text"
            placeholder="Ex: 8º A"
            value={filtros.turma}
            onChange={(e) => setFiltros((f) => ({ ...f, turma: e.target.value }))}
          />
        </div>

        <div className="rel-filtro-campo">
          <label htmlFor="rel-agrupador">Agrupar por</label>
          <select
            id="rel-agrupador"
            value={filtros.agrupador}
            onChange={(e) => setFiltros((f) => ({ ...f, agrupador: e.target.value }))}
          >
            {AGRUPADOR_EMPRESTIMOS_OPTIONS.map((opcao) => (
              <option key={opcao.valor} value={opcao.valor}>{opcao.label}</option>
            ))}
          </select>
        </div>

        <button type="button" className="rel-btn-filtrar" onClick={buscar} disabled={carregando}>
          {carregando ? <FiLoader className="rel-spinner" /> : "Filtrar"}
        </button>
      </div>

      {erro && <div className="rel-erro">{erro}</div>}

      {emModoRanking ? (
        <div className="rel-table-box">
          <table>
            <thead>
              <tr>
                <th>{AGRUPADOR_EMPRESTIMOS_OPTIONS.find((o) => o.valor === filtros.agrupador)?.label || "Item"}</th>
                <th>Total</th>
                <th>Ativos</th>
                <th>Atrasados</th>
                <th>Devolvidos</th>
              </tr>
            </thead>
            <tbody>
              {carregando ? (
                <tr><td colSpan="5" className="rel-empty">Carregando...</td></tr>
              ) : ranking.length === 0 ? (
                <tr><td colSpan="5" className="rel-empty">Nenhum resultado para os filtros informados.</td></tr>
              ) : (
                ranking.map((r, index) => (
                  <tr key={`${r.chave}-${index}`}>
                    <td>{r.rotulo || "-"}</td>
                    <td><strong>{r.total}</strong></td>
                    <td>{r.ativos}</td>
                    <td>{r.atrasados}</td>
                    <td>{r.devolvidos}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rel-table-box">
          <table>
            <thead>
              <tr>
                <th>Usuário</th>
                <th>Tipo</th>
                <th>Turma</th>
                <th>Livro</th>
                <th>ISBN</th>
                <th>Tombo</th>
                <th>Empréstimo</th>
                <th>Prev. Devolução</th>
                <th>Devolução</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {carregando ? (
                <tr>
                  <td colSpan="10" className="rel-empty">Carregando...</td>
                </tr>
              ) : itens.length === 0 ? (
                <tr>
                  <td colSpan="10" className="rel-empty">Nenhum empréstimo encontrado para os filtros informados.</td>
                </tr>
              ) : (
                itens.map((item) => (
                  <tr key={item.idMovimentacao}>
                    <td>{item.usuario}</td>
                    <td>{item.usuarioTipo}</td>
                    <td>{item.turma || "-"}</td>
                    <td>{item.titulo}</td>
                    <td>{item.isbn || "-"}</td>
                    <td>{item.tombo || "-"}</td>
                    <td>{formatarData(item.dataEmprestimo)}</td>
                    <td>{formatarData(item.dataPrevistaDevolucao)}</td>
                    <td>{formatarData(item.dataDevolucao)}</td>
                    <td>
                      <span className={`rel-status rel-status-${item.status}`}>
                        {STATUS_LABEL[item.status] || item.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}