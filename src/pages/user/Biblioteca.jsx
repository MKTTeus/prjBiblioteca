import React, { useEffect, useState } from "react";
import BookCard from "../../components/BookCard/BookCard";
import SearchBar from "../../components/SearchBar/SearchBar";
import { getBooks } from "../../services/api";
import "./UserArea.css";

export default function Biblioteca() {
  const [search, setSearch] = useState("");
  const [books, setBooks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchBooks() {
      setIsLoading(true);
      setError(null);
      try {
        const params = {};
        if (search.trim()) params.q = search.trim();

        const data = await getBooks(params);
        setBooks(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Erro ao buscar livros:", err);
        setBooks([]);
        setError("Erro ao carregar livros. Tente novamente.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchBooks();
  }, [search]);

  return (
    <div className="user-page user-library-page">
      <section className="user-page__hero">
        <h2>Biblioteca</h2>
        <p>Pesquise livros por título, autor ou categoria usando dados reais do banco.</p>
      </section>

      <section className="user-section-card user-library-toolbar">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Buscar por livro, autor ou categoria..."
        />
      </section>

      {isLoading ? (
        <div className="user-empty-state">Carregando livros...</div>
      ) : error ? (
        <div className="user-empty-state">{error}</div>
      ) : books.length > 0 ? (
        <section className="user-library-results">
          <div className="shared-book-grid">
            {books.map((book) => (
              <BookCard
                key={book.idLivro ?? book.id}
                book={book}
                categoryName={book.livCategoria || book.categoria}
                genreName={book.livGenero || book.genero}
              />
            ))}
          </div>
        </section>
      ) : (
        <div className="user-empty-state">Nenhum livro encontrado para a busca informada.</div>
      )}
    </div>
  );
}
