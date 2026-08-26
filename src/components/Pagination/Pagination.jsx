import React from "react";
import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, ArrowUp } from "lucide-react";
import "./Pagination.css";

/**
 * Monta a lista de "botões" a exibir: sempre a primeira e a última página,
 * uma janela de páginas ao redor da atual, e reticências (…) quando há
 * lacunas — para não estourar a tela quando existem dezenas/centenas de
 * páginas.
 */
function construirPaginas(paginaAtual, totalPaginas, janela = 1) {
  const paginas = [1];

  const inicioJanela = Math.max(2, paginaAtual - janela);
  const fimJanela = Math.min(totalPaginas - 1, paginaAtual + janela);

  if (inicioJanela > 2) paginas.push("ellipsis-inicio");

  for (let pagina = inicioJanela; pagina <= fimJanela; pagina += 1) {
    paginas.push(pagina);
  }

  if (fimJanela < totalPaginas - 1) paginas.push("ellipsis-fim");
  if (totalPaginas > 1) paginas.push(totalPaginas);

  return paginas;
}

/**
 * Pagination
 *
 * Props:
 *   paginaAtual   — número da página atual (1-indexed)
 *   totalPaginas  — total de páginas
 *   onChange(p)   — chamado com o número da página escolhida
 *   totalItens    — opcional, exibe "X registros" ao lado dos controles
 */
export default function Pagination({ paginaAtual, totalPaginas, onChange, totalItens }) {
  if (!totalPaginas || totalPaginas <= 1) return null;

  const paginas = construirPaginas(paginaAtual, totalPaginas);

  function irPara(pagina) {
    if (pagina < 1 || pagina > totalPaginas || pagina === paginaAtual) return;
    onChange(pagina);
  }

  function voltarAoTopo() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <nav className="pagination" aria-label="Paginação">
      {typeof totalItens === "number" && (
        <span className="pagination-info">
          {totalItens} {totalItens === 1 ? "registro" : "registros"} · página {paginaAtual} de {totalPaginas}
        </span>
      )}

      <div className="pagination-controles">
        <button
          type="button"
          className="pagination-btn"
          onClick={() => irPara(1)}
          disabled={paginaAtual === 1}
          title="Primeira página"
          aria-label="Primeira página"
        >
          <ChevronsLeft size={22} strokeWidth={2.25} />
        </button>

        <button
          type="button"
          className="pagination-btn"
          onClick={() => irPara(paginaAtual - 1)}
          disabled={paginaAtual === 1}
          title="Página anterior"
          aria-label="Página anterior"
        >
          <ChevronLeft size={22} strokeWidth={2.25} />
        </button>

        <div className="pagination-numeros">
          {paginas.map((pagina, indice) =>
            typeof pagina === "number" ? (
              <button
                key={pagina}
                type="button"
                className={`pagination-num ${pagina === paginaAtual ? "active" : ""}`}
                onClick={() => irPara(pagina)}
                aria-current={pagina === paginaAtual ? "page" : undefined}
              >
                {pagina}
              </button>
            ) : (
              <span key={`${pagina}-${indice}`} className="pagination-ellipsis">
                …
              </span>
            )
          )}
        </div>

        <button
          type="button"
          className="pagination-btn"
          onClick={() => irPara(paginaAtual + 1)}
          disabled={paginaAtual === totalPaginas}
          title="Próxima página"
          aria-label="Próxima página"
        >
          <ChevronRight size={22} strokeWidth={2.25} />
        </button>

        <button
          type="button"
          className="pagination-btn"
          onClick={() => irPara(totalPaginas)}
          disabled={paginaAtual === totalPaginas}
          title="Última página"
          aria-label="Última página"
        >
          <ChevronsRight size={22} strokeWidth={2.25} />
        </button>

        <button
          type="button"
          className="pagination-btn pagination-topo"
          onClick={voltarAoTopo}
          title="Voltar para o topo da página"
          aria-label="Voltar para o topo da página"
        >
          <ArrowUp size={20} strokeWidth={2.25} />
        </button>
      </div>
    </nav>
  );
}
