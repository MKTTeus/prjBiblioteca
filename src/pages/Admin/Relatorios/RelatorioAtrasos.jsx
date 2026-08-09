import { useEffect, useMemo, useState } from "react";
import { FiDownload, FiFileText, FiAlertTriangle, FiUsers, FiClock, FiLoader } from "react-icons/fi";

import StatsCard from "../../../components/StatsCard/StatsCard";
import { getRelatorioAtrasos } from "../../../services/api";
import { exportarPDF, exportarExcel } from "../../../utils/exportarArquivo";
import { SERIES } from "../../../utils/series";
import {
  TIPO_USUARIO_OPTIONS,
  AGRUPADOR_ATRASOS_OPTIONS,
  formatarData,
  linhasParaExportAtrasos,
  COLUNAS_EXPORT_ATRASOS,
  linhasParaExportRankingAtrasos,
  COLUNAS_EXPORT_RANKING_ATRASOS,
} from "./utils";

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function RelatorioAtrasos() {
  const [filtros, setFiltros] = useState({
    tipoUsuario: "todos",
    turma: "",
    serie: "",
    apenasAtivos: true,
    agrupador: "",
  });
  const [itens, setItens] = useState([]);
  const [ranking, setRanking] = useState(null);
  const [resumo, setResumo] = useState({ usuariosInadimplentes: 0, itensAtrasados: 0, diasAtrasoMedio: 0 });
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(null);

  async function buscar() {
    setCarregando(true);
    setErro(null);
    try {
      const resultado = await getRelatorioAtrasos(filtros);
      setItens(resultado.itens || []);
      setRanking(resultado.ranking || null);
      setResumo(resultado.resumo || { usuariosInadimplentes: 0, itensAtrasados: 0, diasAtrasoMedio: 0 });
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

  const emModoRanking = Boolean(filtros.agrupador) && Array.isArray(ranking);

  // Agrupa os itens (um por empréstimo atrasado) por usuário, só para dar um
  // resumo visual de quantos livros cada um está devendo — a tabela em si
  // continua uma linha por livro, para não esconder detalhe nenhum.
  const usuariosAgrupados = useMemo(() => {
    const mapa = new Map();
    itens.forEach((item) => {
      const chave = item.idUsuario ?? item.usuario;
      if (!mapa.has(chave)) mapa.set(chave, 0);
      mapa.set(chave, mapa.get(chave) + 1);
    });
    return mapa;
  }, [itens]);

  function handleExportarPDF() {
    if (emModoRanking) {
      exportarPDF({
        titulo: "Relatório de Atrasos — Ranking",
        subtitulo: `Gerado em: ${formatarData(hojeISO())}`,
        colunas: COLUNAS_EXPORT_RANKING_ATRASOS,
        linhas: linhasParaExportRankingAtrasos(ranking),
        nomeArquivo: `relatorio-atrasos-ranking-${hojeISO()}`,
      });
      return;
    }
    exportarPDF({
      titulo: "Relatório de Usuários em Atraso",
      subtitulo: `Gerado em: ${formatarData(hojeISO())}`,
      colunas: COLUNAS_EXPORT_ATRASOS,
      linhas: linhasParaExportAtrasos(itens),
      nomeArquivo: `relatorio-atrasos-${hojeISO()}`,
    });
  }

  function handleExportarExcel() {
    if (emModoRanking) {
      exportarExcel({
        nomeAba: "Ranking",
        colunas: COLUNAS_EXPORT_RANKING_ATRASOS,
        linhas: linhasParaExportRankingAtrasos(ranking),
        nomeArquivo: `relatorio-atrasos-ranking-${hojeISO()}`,
      });
      return;
    }
    exportarExcel({
      nomeAba: "Atrasos",
      colunas: COLUNAS_EXPORT_ATRASOS,
      linhas: linhasParaExportAtrasos(itens),
      nomeArquivo: `relatorio-atrasos-${hojeISO()}`,
    });
  }

  const semResultado = emModoRanking ? ranking.length === 0 : itens.length === 0;

  return (
    <div className="rel-tab-content">
      <div className="rel-subheader">
        <p>
          {filtros.apenasAtivos
            ? "Usuários com empréstimos ativos que já passaram da data de devolução."
            : "Histórico completo de atrasos, incluindo os já devolvidos fora do prazo."}
        </p>

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

      <section className="stats-cards-grid" aria-label="Resumo de atrasos">
        <StatsCard title="Usuários Inadimplentes" value={resumo.usuariosInadimplentes} icon={<FiUsers />} color="red" />
        <StatsCard title="Itens em Atraso" value={resumo.itensAtrasados} icon={<FiAlertTriangle />} color="red" />
        <StatsCard title="Atraso Médio (dias)" value={resumo.diasAtrasoMedio} icon={<FiClock />} color="blue" />
      </section>

      <div className="rel-filtros">
        <div className="rel-filtro-campo">
          <label htmlFor="rel-atraso-tipo-usuario">Usuário</label>
          <select
            id="rel-atraso-tipo-usuario"
            value={filtros.tipoUsuario}
            onChange={(e) => setFiltros((f) => ({ ...f, tipoUsuario: e.target.value }))}
          >
            {TIPO_USUARIO_OPTIONS.map((opcao) => (
              <option key={opcao.valor} value={opcao.valor}>{opcao.label}</option>
            ))}
          </select>
        </div>

        <div className="rel-filtro-campo">
          <label htmlFor="rel-atraso-serie">Série</label>
          <select
            id="rel-atraso-serie"
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
          <label htmlFor="rel-atraso-turma">Turma</label>
          <input
            id="rel-atraso-turma"
            type="text"
            placeholder="Ex: 8º A"
            value={filtros.turma}
            onChange={(e) => setFiltros((f) => ({ ...f, turma: e.target.value }))}
          />
        </div>

        <div className="rel-filtro-campo">
          <label htmlFor="rel-atraso-agrupador">Agrupar por</label>
          <select
            id="rel-atraso-agrupador"
            value={filtros.agrupador}
            onChange={(e) => setFiltros((f) => ({ ...f, agrupador: e.target.value }))}
          >
            {AGRUPADOR_ATRASOS_OPTIONS.map((opcao) => (
              <option key={opcao.valor} value={opcao.valor}>{opcao.label}</option>
            ))}
          </select>
        </div>

        <label className="rel-filtro-checkbox">
          <input
            type="checkbox"
            checked={!filtros.apenasAtivos}
            onChange={(e) => setFiltros((f) => ({ ...f, apenasAtivos: !e.target.checked }))}
          />
          Incluir histórico (já devolvidos em atraso)
        </label>

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
                <th>{AGRUPADOR_ATRASOS_OPTIONS.find((o) => o.valor === filtros.agrupador)?.label || "Item"}</th>
                <th>Ocorrências</th>
                <th>Dias de Atraso (total)</th>
              </tr>
            </thead>
            <tbody>
              {carregando ? (
                <tr><td colSpan="3" className="rel-empty">Carregando...</td></tr>
              ) : ranking.length === 0 ? (
                <tr><td colSpan="3" className="rel-empty">Nenhum resultado para os filtros informados.</td></tr>
              ) : (
                ranking.map((r, index) => (
                  <tr key={`${r.chave}-${index}`}>
                    <td>{r.rotulo || "-"}</td>
                    <td><strong>{r.ocorrencias}</strong></td>
                    <td>{r.diasAtrasoTotal}</td>
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
                <th>Contato</th>
                <th>Livro</th>
                <th>Tombo</th>
                <th>Prev. Devolução</th>
                <th>Dias em Atraso</th>
              </tr>
            </thead>
            <tbody>
              {carregando ? (
                <tr>
                  <td colSpan="8" className="rel-empty">Carregando...</td>
                </tr>
              ) : itens.length === 0 ? (
                <tr>
                  <td colSpan="8" className="rel-empty">Nenhum usuário em atraso no momento 🎉</td>
                </tr>
              ) : (
                itens.map((item, index) => (
                  <tr key={`${item.idUsuario ?? item.usuario}-${item.tombo}-${index}`}>
                    <td>
                      {item.usuario}
                      {usuariosAgrupados.get(item.idUsuario ?? item.usuario) > 1 && (
                        <span className="rel-badge-contagem">
                          {usuariosAgrupados.get(item.idUsuario ?? item.usuario)} itens
                        </span>
                      )}
                    </td>
                    <td>{item.usuarioTipo}</td>
                    <td>{item.turma || "-"}</td>
                    <td>{item.contato}</td>
                    <td>{item.titulo}</td>
                    <td>{item.tombo || "-"}</td>
                    <td>{formatarData(item.dataPrevistaDevolucao)}</td>
                    <td>
                      <span className={`rel-status ${item.situacao === "devolvido_em_atraso" ? "rel-status-devolvido" : "rel-status-atrasado"}`}>
                        {item.diasAtraso} dias{item.situacao === "devolvido_em_atraso" ? " (devolvido)" : ""}
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