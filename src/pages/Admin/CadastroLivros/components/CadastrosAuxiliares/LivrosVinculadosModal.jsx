import React, { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Link } from "react-router-dom";
import { getErrorMessage } from "../../../../../utils/apiError";

export default function LivrosVinculadosModal({ registro, tipo, carregar, onClose }) {
  const [pagina, setPagina] = useState(1);
  const [resultado, setResultado] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [tentativa, setTentativa] = useState(0);
  const fecharRef = useRef(null);

  useEffect(() => {
    const anterior = document.activeElement;
    fecharRef.current?.focus();
    const controlarTeclado = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab") {
        const modal = fecharRef.current?.closest('[role="dialog"]');
        const botoes = [...(modal?.querySelectorAll('a[href], button:not(:disabled)') || [])];
        const primeiro = botoes[0];
        const ultimo = botoes[botoes.length - 1];
        if (event.shiftKey && document.activeElement === primeiro) {
          event.preventDefault();
          ultimo?.focus();
        } else if (!event.shiftKey && document.activeElement === ultimo) {
          event.preventDefault();
          primeiro?.focus();
        }
      }
    };
    document.addEventListener("keydown", controlarTeclado);
    return () => {
      document.removeEventListener("keydown", controlarTeclado);
      anterior?.focus?.();
    };
  }, [onClose]);

  useEffect(() => {
    let vigente = true;
    setLoading(true);
    setErro("");
    carregar(registro.id, pagina).then((dados) => {
      if (vigente) setResultado(dados);
    }).catch((error) => {
      if (vigente) setErro(getErrorMessage(error, "Não foi possível carregar os livros vinculados."));
    }).finally(() => {
      if (vigente) setLoading(false);
    });
    return () => { vigente = false; };
  }, [registro.id, pagina, carregar, tentativa]);

  const total = resultado?.total ?? registro.total;
  const totalPaginas = Math.ceil(total / 20);

  return (
    <div className="taxonomia-livros-overlay" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="taxonomia-livros-modal" role="dialog" aria-modal="true" aria-labelledby="taxonomia-livros-titulo">
        <header className="taxonomia-livros-header">
          <div>
            <span className="taxonomia-livros-eyebrow">{tipo} · livros vinculados</span>
            <h2 id="taxonomia-livros-titulo">{registro.nome}</h2>
            <p>{total} {total === 1 ? "título associado" : "títulos associados"}</p>
          </div>
          <button type="button" ref={fecharRef} className="taxonomia-livros-fechar" aria-label="Fechar lista de livros" onClick={onClose}><X size={20} /></button>
        </header>
        <div className="taxonomia-livros-corpo" aria-live="polite">
          {loading ? <p className="taxonomia-livros-aviso">Carregando livros...</p> : erro ? (
            <div className="taxonomia-livros-aviso" role="alert">
              <p>{erro}</p>
              <button type="button" onClick={() => setTentativa((atual) => atual + 1)}>Tentar novamente</button>
            </div>
          ) : !resultado?.livros?.length ? <p className="taxonomia-livros-aviso">Nenhum livro vinculado.</p> : (
            <ul className="taxonomia-livros-lista">
              {resultado.livros.map((livro) => (
                <li key={livro.idLivro}>
                  <Link className="taxonomia-livros-nome taxonomia-livros-link" to={`/admin/livros?livro=${livro.idLivro}`} aria-label={`Ver ${livro.livTitulo} no acervo`}>
                    {livro.livTitulo}
                    <span aria-hidden="true">↗</span>
                  </Link>
                  {livro.livAtivo === false && <span className="taxonomia-livros-inativo">Inativo</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
        <footer className="taxonomia-livros-rodape">
          <span>{totalPaginas > 1 ? `Página ${pagina} de ${totalPaginas}` : ""}</span>
          {totalPaginas > 1 && <div className="taxonomia-livros-navegacao">
            <button type="button" onClick={() => setPagina((p) => p - 1)} disabled={loading || pagina <= 1} aria-label="Página anterior"><ChevronLeft size={18} /></button>
            <button type="button" onClick={() => setPagina((p) => p + 1)} disabled={loading || pagina >= totalPaginas} aria-label="Próxima página"><ChevronRight size={18} /></button>
          </div>}
        </footer>
      </section>
    </div>
  );
}
