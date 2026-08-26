import React, { useEffect, useState } from "react";
import BookCard from "../../../../../components/BookCard/BookCard";
import Pagination from "../../../../../components/Pagination/Pagination";
import usePagination from "../../../../../hooks/usePagination";
import { getGeneros } from "../../../../../services/api";
import "./BookList.css";

const BookList = ({ books = [], onEditBook, onDeleteBook, onToggleStatus, onViewFicha, isAdmin = false }) => {
  const [generos, setGeneros] = useState([]);
  const [loadingMeta, setLoadingMeta] = useState(true);

  useEffect(() => {
    const loadMeta = async () => {
      try {
        const gens = await getGeneros();
        setGeneros(Array.isArray(gens) ? gens : []);
      } catch (err) {
        console.error("Erro ao carregar gêneros:", err);
      } finally {
        setLoadingMeta(false);
      }
    };

    loadMeta();
  }, []);

  const getGeneroNome = (id) => {
    const genero = generos.find((item) => String(item.idGenero) === String(id));
    return genero ? genero.genNome : "Sem gênero";
  };

  const safeBooks = Array.isArray(books) ? books : [];
  const { paginaAtual, totalPaginas, paginaItens, irParaPagina } = usePagination(safeBooks);

  return (
    <div className="booklist-container">
      {loadingMeta ? (
        <p>Carregando gêneros...</p>
      ) : (
        <>
          <div className="shared-book-grid">
            {safeBooks.length === 0 && <p>Nenhum livro cadastrado.</p>}

            {paginaItens.map((book, index) => {
              if (!book) return null;

              const key = book?.idLivro ?? book?.id ?? `book-${index}`;

              return (
                <BookCard
                  key={key}
                  book={book}
                  genreName={getGeneroNome(book?.idGenero)}
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
        </>
      )}
    </div>
  );
};

export default BookList;