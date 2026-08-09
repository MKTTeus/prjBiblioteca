import { useEffect, useMemo, useState } from "react";
import {
  FiDownload, FiFileText, FiBookOpen, FiAlertTriangle, FiCheckCircle, FiLoader,
  FiList, FiBarChart2, FiTrendingUp, FiCalendar,
} from "react-icons/fi";

import StatsCard from "../../../components/StatsCard/StatsCard";
import BuscaUsuarioInput from "./BuscaUsuarioInput";
import GraficoEmprestimosMensal from "./GraficoEmprestimosMensal";
import { getRelatorioEmprestimos, getRelatorioEmprestimosMensal } from "../../../services/api";
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
  anosLetivosPadrao,
  linhasParaExportMensal,
  COLUNAS_EXPORT_MENSAL,
} from "./utils";

function primeiroDiaDoMes() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function RelatorioEmprestimos() {
  const [modoVisualizacao, setModoVisualizacao] = useState("padrao"); // padrao | mensal

  const [filtros, setFiltros] = useState({
    dataInicio: primeiroDiaDoMes(),
    dataFim: hojeISO(),
    status: "todos",
    tipoUsuario: "todos",
    turma: "",
    serie: "",
    anoLetivo: "",
    idUsuario: "",
    agrupador: "",
  });
  const [usuarioSelecionado, setUsuarioSelecionado] = useState(null);

  const [itens, setItens] = useState([]);
  const [ranking, setRanking] = useState(null);
  const [resumo, setResumo] = useState({ ativos: 0, atrasados: 0, devolvidos: 0, total: 0 });
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(null);

  // ── Visão mensal (empréstimos por mês dentro de um ano letivo) ──
  const [filtrosMensal, setFiltrosMensal] = useState({
    anoLetivo: new Date().getFullYear(),
    tipoUsuario: "todos",
    turma: "",
    serie: "",
  });
  const [dadosMensal, setDadosMensal] = useState({
    anoLetivo: new Date().getFullYear(),
    anosDisponiveis: [],
    meses: [],
    resumo: { totalAno: 0, mediaMensal: 0, mesPico: null, mesesComMovimento: 0 },
  });
  const [carregandoMensal, setCarregandoMensal] = useState(false);
  const [erroMensal, setErroMensal] = useState(null);

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

  async function buscarMensal(filtrosAtuais = filtrosMensal) {
    setCarregandoMensal(true);
    setErroMensal(null);
    try {
      const resultado = await getRelatorioEmprestimosMensal(filtrosAtuais);
      setDadosMensal({
        anoLetivo: resultado.anoLetivo ?? filtrosAtuais.anoLetivo,
        anosDisponiveis: resultado.anosDisponiveis || [],
        meses: resultado.meses || [],
        resumo: resultado.resumo || { totalAno: 0, mediaMensal: 0, mesPico: null, mesesComMovimento: 0 },
      });
    } catch (error) {
      console.error(error);
      setErroMensal("Não foi possível carregar o relatório mensal. Tente novamente.");
    } finally {
      setCarregandoMensal(false);
    }
  }

  useEffect(() => {
    buscar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (modoVisualizacao === "mensal" && dadosMensal.meses.length === 0) {
      buscarMensal();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modoVisualizacao]);

  function handleSelecionarAluno(usuario) {
    setUsuarioSelecionado(usuario);
    // Ao escolher um aluno específico, faz sentido mostrar o histórico
    // completo dele — limpa o recorte de data e o agrupador em ranking,
    // que não fazem sentido pra uma pessoa só.
    setFiltros((f) => ({ ...f, idUsuario: usuario.idUsuario, dataInicio: "", dataFim: "", agrupador: "" }));
  }

  function handleLimparAluno() {
    setUsuarioSelecionado(null);
    setFiltros((f) => ({ ...f, idUsuario: "" }));
  }

  const anosLetivosOptions = useMemo(() => {
    const base = anosLetivosPadrao(filtrosMensal.anoLetivo);
    const combinados = new Set([...base, ...dadosMensal.anosDisponiveis]);
    return Array.from(combinados).sort((a, b) => b - a);
  }, [filtrosMensal.anoLetivo, dadosMensal.anosDisponiveis]);

  const periodoLabel = useMemo(() => {
    if (!filtros.dataInicio && !filtros.dataFim) return "Todo o período";
    return `${formatarData(filtros.dataInicio)} a ${formatarData(filtros.dataFim)}`;
  }, [filtros.dataInicio, filtros.dataFim]);

  const emModoRanking = Boolean(filtros.agrupador) && Array.isArray(ranking);

  function handleExportarPDF() {
    if (modoVisualizacao === "mensal") {
      exportarPDF({
        titulo: `Empréstimos por Mês — Ano Letivo ${dadosMensal.anoLetivo}`,
        subtitulo: `Total no ano: ${dadosMensal.resumo.totalAno} · Média mensal: ${dadosMensal.resumo.mediaMensal}`,
        colunas: COLUNAS_EXPORT_MENSAL,
        linhas: linhasParaExportMensal(dadosMensal.meses),
        nomeArquivo: `relatorio-emprestimos-mensal-${dadosMensal.anoLetivo}`,
      });
      return;
    }
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
    if (modoVisualizacao === "mensal") {
      exportarExcel({
        nomeAba: "Empréstimos por Mês",
        colunas: COLUNAS_EXPORT_MENSAL,
        linhas: linhasParaExportMensal(dadosMensal.meses),
        nomeArquivo: `relatorio-emprestimos-mensal-${dadosMensal.anoLetivo}`,
      });
      return;
    }
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

  const semResultado =
    modoVisualizacao === "mensal"
      ? dadosMensal.resumo.totalAno === 0
      : emModoRanking
        ? ranking.length === 0
        : itens.length === 0;
  const carregandoAtual = modoVisualizacao === "mensal" ? carregandoMensal : carregando;

  return (
    <div className="rel-tab-content">
      <div className="rel-subheader">
        <div>
          <p>Histórico de empréstimos, ativos e atrasados por período — ou ranking por aluno, turma, série e livro.</p>
          <div className="rel-modo-toggle" role="tablist" aria-label="Modo de visualização">
            <button
              type="button"
              className={modoVisualizacao === "padrao" ? "rel-modo-toggle-ativo" : ""}
              onClick={() => setModoVisualizacao("padrao")}
            >
              <FiList /> Lista / Ranking
            </button>
            <button
              type="button"
              className={modoVisualizacao === "mensal" ? "rel-modo-toggle-ativo" : ""}
              onClick={() => setModoVisualizacao("mensal")}
            >
              <FiBarChart2 /> Por mês
            </button>
          </div>
        </div>

        <div className="rel-export-actions">
          <button
            type="button"
            className="rel-btn-export"
            onClick={handleExportarExcel}
            disabled={carregandoAtual || semResultado}
          >
            <FiDownload /> Excel
          </button>
          <button
            type="button"
            className="rel-btn-export"
            onClick={handleExportarPDF}
            disabled={carregandoAtual || semResultado}
          >
            <FiFileText /> PDF
          </button>
        </div>
      </div>

      {modoVisualizacao === "mensal" ? (
        <>
          <section className="stats-cards-grid" aria-label="Resumo do ano letivo">
            <StatsCard title={`Total em ${dadosMensal.anoLetivo}`} value={dadosMensal.resumo.totalAno} icon={<FiBookOpen />} color="blue" />
            <StatsCard title="Média Mensal" value={dadosMensal.resumo.mediaMensal} icon={<FiTrendingUp />} color="blue" />
            <StatsCard
              title="Mês de Pico"
              value={dadosMensal.resumo.mesPico ? dadosMensal.resumo.mesPico.label : "-"}
              subtitle={dadosMensal.resumo.mesPico ? `${dadosMensal.resumo.mesPico.total} empréstimo(s)` : undefined}
              icon={<FiCalendar />}
              color="green"
            />
          </section>

          <div className="rel-filtros">
            <div className="rel-filtro-campo">
              <label htmlFor="rel-mensal-ano">Ano Letivo</label>
              <select
                id="rel-mensal-ano"
                value={filtrosMensal.anoLetivo}
                onChange={(e) => setFiltrosMensal((f) => ({ ...f, anoLetivo: Number(e.target.value) }))}
              >
                {anosLetivosOptions.map((ano) => (
                  <option key={ano} value={ano}>{ano}</option>
                ))}
              </select>
            </div>

            <div className="rel-filtro-campo">
              <label htmlFor="rel-mensal-tipo">Usuário</label>
              <select
                id="rel-mensal-tipo"
                value={filtrosMensal.tipoUsuario}
                onChange={(e) => setFiltrosMensal((f) => ({ ...f, tipoUsuario: e.target.value }))}
              >
                {TIPO_USUARIO_OPTIONS.map((opcao) => (
                  <option key={opcao.valor} value={opcao.valor}>{opcao.label}</option>
                ))}
              </select>
            </div>

            <div className="rel-filtro-campo">
              <label htmlFor="rel-mensal-serie">Série</label>
              <select
                id="rel-mensal-serie"
                value={filtrosMensal.serie}
                onChange={(e) => setFiltrosMensal((f) => ({ ...f, serie: e.target.value }))}
              >
                <option value="">Todas</option>
                {SERIES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="rel-filtro-campo">
              <label htmlFor="rel-mensal-turma">Turma</label>
              <input
                id="rel-mensal-turma"
                type="text"
                placeholder="Ex: 8º A"
                value={filtrosMensal.turma}
                onChange={(e) => setFiltrosMensal((f) => ({ ...f, turma: e.target.value }))}
              />
            </div>

            <button type="button" className="rel-btn-filtrar" onClick={() => buscarMensal()} disabled={carregandoMensal}>
              {carregandoMensal ? <FiLoader className="rel-spinner" /> : "Filtrar"}
            </button>
          </div>

          {erroMensal && <div className="rel-erro">{erroMensal}</div>}

          {carregandoMensal ? (
            <div className="rel-table-box"><p className="rel-empty">Carregando...</p></div>
          ) : (
            <>
              <GraficoEmprestimosMensal meses={dadosMensal.meses} mesPico={dadosMensal.resumo.mesPico} />

              <div className="rel-table-box">
                <table>
                  <thead>
                    <tr>
                      <th>Mês</th>
                      <th>Total</th>
                      <th>Ativos</th>
                      <th>Atrasados</th>
                      <th>Devolvidos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dadosMensal.meses.map((m) => (
                      <tr key={m.mes}>
                        <td>{m.label}</td>
                        <td><strong>{m.total}</strong></td>
                        <td>{m.ativos}</td>
                        <td>{m.atrasados}</td>
                        <td>{m.devolvidos}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      ) : (
      <>
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
          <label htmlFor="rel-ano-letivo">Ano Letivo</label>
          <select
            id="rel-ano-letivo"
            value={filtros.anoLetivo}
            onChange={(e) => setFiltros((f) => ({ ...f, anoLetivo: e.target.value }))}
          >
            <option value="">Todos</option>
            {anosLetivosPadrao().map((ano) => (
              <option key={ano} value={ano}>{ano}</option>
            ))}
          </select>
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
          <label htmlFor="rel-busca-aluno">Histórico de aluno</label>
          <BuscaUsuarioInput
            usuarioSelecionado={usuarioSelecionado}
            onSelecionar={handleSelecionarAluno}
            onLimpar={handleLimparAluno}
          />
        </div>

        <div className="rel-filtro-campo">
          <label htmlFor="rel-agrupador">Agrupar por</label>
          <select
            id="rel-agrupador"
            value={filtros.agrupador}
            disabled={Boolean(usuarioSelecionado)}
            title={usuarioSelecionado ? "Indisponível com um aluno selecionado" : undefined}
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
      </>
      )}
    </div>
  );
}