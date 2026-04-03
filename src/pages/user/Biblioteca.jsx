import React, { useState } from "react";
import BookCard from "../../components/BookCard/BookCard";
import SearchBar from "../../components/SearchBar/SearchBar";
import { mockBooks } from "./mockData";
import "./UserArea.css";

export default function Biblioteca() {
  const [search, setSearch] = useState("");

  const query = search.trim().toLowerCase();
  const filteredBooks = !query
    ? mockBooks
    : mockBooks.filter((book) =>
        [book.titulo, book.autor, book.categoria, book.genero].some((field) =>
          String(field).toLowerCase().includes(query)
        )
      );

  return (
    <div className="user-page user-library-page">
      <section className="user-page__hero">
        <h2>Biblioteca</h2>
        <p>Pesquise livros por título, autor ou categoria usando dados mockados.</p>
      </section>

      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Buscar por livro, autor ou categoria..."
      />

      {filteredBooks.length > 0 ? (
        <section className="shared-book-grid">
          {filteredBooks.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              categoryName={book.categoria}
              genreName={book.genero}
            />
          ))}
        </section>
      ) : (
        <div className="user-empty-state">
          Nenhum livro encontrado para a busca informada.
        </div>
      )}
    </div>
  );
}
