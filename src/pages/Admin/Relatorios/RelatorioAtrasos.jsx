import { useEffect, useMemo, useState } from "react";
import { FiDownload, FiFileText, FiAlertTriangle, FiUsers, FiClock, FiLoader } from "react-icons/fi";

import StatsCard from "../../../components/StatsCard/StatsCard";
import { getRelatorioAtrasos } from "../../../services/api";
import { exportarPDF, exportarExcel } from "../../../utils/exportarArquivo";
import {
  TIPO_USUARIO_OPTIONS,
  formatarData,
  linhasParaExportAtrasos,
  COLUNAS_EXPORT_ATRASOS,
} from "./utils";

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function RelatorioAtrasos() {
  const [tipoUsuario, setTipoUsuario] = useState("todos");
  const [itens, setItens] = useState([]);
  const [resumo, setResumo] = useState({ usuariosInadimplentes: 0, itensAtrasados: 0, diasAtrasoMedio: 0 });
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(null);

  async function buscar() {
    setCarregando(true);
    setErro(null);
    try {
      const resultado = await getRelatorioAtrasos({ tipoUsuario });
      setItens(resultado.itens || []);
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
    exportarPDF({
      titulo: "Relatório de Usuários em Atraso",
      subtitulo: `Gerado em: ${formatarData(hojeISO())}`,
      colunas: COLUNAS_EXPORT_ATRASOS,
      linhas: linhasParaExportAtrasos(itens),
      nomeArquivo: `relatorio-atrasos-${hojeISO()}`,
    });
  }

  function handleExportarExcel() {
    exportarExcel({
      nomeAba: "Atrasos",
      colunas: COLUNAS_EXPORT_ATRASOS,
      linhas: linhasParaExportAtrasos(itens),
      nomeArquivo: `relatorio-atrasos-${hojeISO()}`,
    });
  }

  return (
    <div className="rel-tab-content">
      <div className="rel-subheader">
        <p>Usuários com empréstimos ativos que já passaram da data de devolução.</p>

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
            value={tipoUsuario}
            onChange={(e) => setTipoUsuario(e.target.value)}
          >
            {TIPO_USUARIO_OPTIONS.map((opcao) => (
              <option key={opcao.valor} value={opcao.valor}>{opcao.label}</option>
            ))}
          </select>
        </div>

        <button type="button" className="rel-btn-filtrar" onClick={buscar} disabled={carregando}>
          {carregando ? <FiLoader className="rel-spinner" /> : "Filtrar"}
        </button>
      </div>

      {erro && <div className="rel-erro">{erro}</div>}

      <div className="rel-table-box">
        <table>
          <thead>
            <tr>
              <th>Usuário</th>
              <th>Tipo</th>
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
                <td colSpan="7" className="rel-empty">Carregando...</td>
              </tr>
            ) : itens.length === 0 ? (
              <tr>
                <td colSpan="7" className="rel-empty">Nenhum usuário em atraso no momento 🎉</td>
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
                  <td>{item.contato}</td>
                  <td>{item.titulo}</td>
                  <td>{item.tombo || "-"}</td>
                  <td>{formatarData(item.dataPrevistaDevolucao)}</td>
                  <td>
                    <span className="rel-status rel-status-atrasado">{item.diasAtraso} dias</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
