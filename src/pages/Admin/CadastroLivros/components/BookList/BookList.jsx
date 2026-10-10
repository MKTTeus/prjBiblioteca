import React from "react";
import BookCard from "../../../../../components/BookCard/BookCard";
import Pagination from "../../../../../components/Pagination/Pagination";
import usePagination from "../../../../../hooks/usePagination";
import "./BookList.css";

const BookList = ({ books = [], onEditBook, onDeleteBook, onToggleStatus, onViewFicha, isAdmin = false }) => {
  const safeBooks = Array.isArray(books) ? books : [];
  const { paginaAtual, totalPaginas, paginaItens, irParaPagina } = usePagination(safeBooks);

  return (
    <div className="booklist-container">
      <div className="shared-book-grid">
        {safeBooks.length === 0 && <p>Nenhum título encontrado com estes filtros.</p>}

        {paginaItens.map((book, index) => {
          if (!book) return null;

          const key = book?.idLivro ?? book?.id ?? `book-${index}`;

          return (
            <BookCard
              key={key}
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
    </div>
  );
};

export default BookList;
