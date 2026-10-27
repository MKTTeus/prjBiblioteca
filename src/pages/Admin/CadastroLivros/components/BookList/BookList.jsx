import React, { useMemo, useState } from "react";
import { HiOutlineBookOpen, HiOutlineViewGrid, HiOutlineViewList } from "react-icons/hi";
import BookCard from "../../../../../components/BookCard/BookCard";
import Pagination from "../../../../../components/Pagination/Pagination";
import usePagination from "../../../../../hooks/usePagination";
import "./BookList.css";

const VIEW_KEY = "biblioteca-acervo-visualizacao";

export default function BookList({
  books = [], onEditBook, onDeleteBook, onToggleStatus, onViewFicha, isAdmin = false,
}) {
  const [view, setView] = useState(() => {
    try { return localStorage.getItem(VIEW_KEY) === "lista" ? "lista" : "grade"; }
    catch { return "grade"; }
  });
  const [order, setOrder] = useState("original");
  const safeBooks = Array.isArray(books) ? books : [];
  const sortedBooks = useMemo(() => {
    if (order === "original") return safeBooks;
    const items = [...safeBooks];
    if (order === "titulo-asc" || order === "titulo-desc") {
      items.sort((a, b) => String(a.livTitulo || "").localeCompare(String(b.livTitulo || ""), "pt-BR", { sensitivity: "base" }) * (order === "titulo-desc" ? -1 : 1));
    } else {
      items.sort((a, b) => (Number(b.livAnoPublicacao || 0) - Number(a.livAnoPublicacao || 0)) * (order === "ano-asc" ? -1 : 1));
    }
    return items;
  }, [safeBooks, order]);
  const { paginaAtual, totalPaginas, paginaItens, irParaPagina } = usePagination(sortedBooks);

  const changeView = (nextView) => {
    setView(nextView);
    try { localStorage.setItem(VIEW_KEY, nextView); } catch { /* navegação privada */ }
  };

  return (
    <section className={`booklist-container booklist-container--${view}`} aria-label="Catálogo de livros">
      <div className="booklist-toolbar">
        <div className="booklist-heading">
          <HiOutlineBookOpen className="booklist-heading__icon" aria-hidden="true" />
          <h2>Catálogo de Livros</h2>
          <span>({safeBooks.length} {safeBooks.length === 1 ? "livro encontrado" : "livros encontrados"})</span>
        </div>
        <div className="booklist-controls">
          <div className="booklist-view-switch" role="group" aria-label="Modo de visualização">
            <button type="button" className={view === "lista" ? "is-selected" : ""} aria-pressed={view === "lista"} onClick={() => changeView("lista")}>
              <HiOutlineViewList aria-hidden="true" /> Lista
            </button>
            <button type="button" className={view === "grade" ? "is-selected" : ""} aria-pressed={view === "grade"} onClick={() => changeView("grade")}>
              <HiOutlineViewGrid aria-hidden="true" /> Grade
            </button>
          </div>
          <label className="booklist-order">
            <span>Ordenar por</span>
            <select value={order} onChange={(event) => setOrder(event.target.value)}>
              <option value="original">Ordem atual</option>
              <option value="titulo-asc">Título (A–Z)</option>
              <option value="titulo-desc">Título (Z–A)</option>
              <option value="ano-desc">Publicação mais recente</option>
              <option value="ano-asc">Publicação mais antiga</option>
            </select>
          </label>
        </div>
      </div>
      <div className="shared-book-grid">
        {safeBooks.length === 0 && <p className="booklist-empty">Nenhum título encontrado com estes filtros.</p>}
        {paginaItens.map((book, index) => {
          if (!book) return null;
          return (
            <BookCard
              key={book.idLivro ?? book.id ?? `book-${index}`}
              book={book}
              genreName={book.livGenero || "Sem gênero"}
              coverLoading={index < 4 ? "eager" : "lazy"}
              isAdmin={isAdmin}
              onEdit={onEditBook}
              onDelete={onDeleteBook}
              onToggleStatus={onToggleStatus}
              onViewFicha={onViewFicha}
            />
          );
        })}
      </div>
      <Pagination
        paginaAtual={paginaAtual}
        totalPaginas={totalPaginas}
        onChange={irParaPagina}
        totalItens={safeBooks.length}
      />
    </section>
  );
}
