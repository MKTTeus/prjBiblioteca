import React, { useEffect, useState } from "react";
import BookCard from "../../../../../components/BookCard/BookCard";
import { getCategorias, getGeneros } from "../../../../../services/api";
import "./BookList.css";

const BookList = ({ books = [], onEditBook, onDeleteBook, isAdmin = false }) => {
  const [categorias, setCategorias] = useState([]);
  const [generos, setGeneros] = useState([]);
  const [loadingMeta, setLoadingMeta] = useState(true);

  useEffect(() => {
    const loadMeta = async () => {
      try {
        const [cats, gens] = await Promise.all([getCategorias(), getGeneros()]);
        setCategorias(Array.isArray(cats) ? cats : []);
        setGeneros(Array.isArray(gens) ? gens : []);
      } catch (err) {
        console.error("Erro ao carregar categorias e gêneros:", err);
      } finally {
        setLoadingMeta(false);
      }
    };

    loadMeta();
  }, []);

  const getCategoriaNome = (id) => {
    const categoria = categorias.find((item) => String(item.idCategoria) === String(id));
    return categoria ? categoria.catNome : "Sem categoria";
  };

  const getGeneroNome = (id) => {
    const genero = generos.find((item) => String(item.idGenero) === String(id));
    return genero ? genero.genNome : "Sem gênero";
  };

  const safeBooks = Array.isArray(books) ? books : [];

  return (
    <div className="booklist-container">
      {loadingMeta ? (
        <p>Carregando categorias e gêneros...</p>
      ) : (
        <div className="shared-book-grid">
          {safeBooks.length === 0 && <p>Nenhum livro cadastrado.</p>}

          {safeBooks.map((book, index) => {
            if (!book) return null;

            const key = book?.idLivro ?? book?.id ?? `book-${index}`;

            return (
              <BookCard
                key={key}
                book={book}
                categoryName={getCategoriaNome(book?.idCategoria)}
                genreName={getGeneroNome(book?.idGenero)}
                isAdmin={isAdmin}
                onEdit={onEditBook}
                onDelete={onDeleteBook}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BookList;
