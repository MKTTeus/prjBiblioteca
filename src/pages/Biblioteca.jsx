import React, { useEffect, useState } from "react";
import "../styles/Biblioteca.css";
import { getBooks } from "../services/api";
import BookInfoModal from "../components/BookInfo/BookInfoModal";

function Biblioteca() {

  const [books, setBooks] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");

  const [infoModal, setInfoModal] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);

  async function loadBooks() {
    const data = await getBooks();

    setBooks(data || []);
    setFiltered(data || []);
  }

  useEffect(() => {
    loadBooks();
  }, []);

  useEffect(() => {

    const result = books.filter((b) =>
      (b.livTitulo || "").toLowerCase().includes(search.toLowerCase()) ||
      (b.livAutor || "").toLowerCase().includes(search.toLowerCase())
    );

    setFiltered(result);

  }, [search, books]);

  function abrirInfo(book) {
    setSelectedBook(book);
    setInfoModal(true);
  }

  return (

    <div className="biblioteca-page">

      <div className="biblioteca-header">

        <h2>Biblioteca</h2>

        <div className="header-actions">

          <input
            className="input-pesquisa"
            placeholder="Pesquisar livro ou autor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

        </div>

      </div>

      <div className="book-grid">

        {filtered.map((book) => {

          const totalExemplares = book.total_exemplares || 0;
          const disponiveis = book.disponiveis || 0;

          return (

            <div
              key={book.idLivro}
              className="book-card"
              onClick={() => abrirInfo(book)}
            >

              <img
                loading="lazy"
                src={book.livCapaURL || "https://via.placeholder.com/150x220"}
                alt={book.livTitulo}
              />

              <div className="book-overlay">

                <h3>{book.livTitulo}</h3>

                <p>{book.livAutor}</p>

                <span className="book-count">
                📚 {totalExemplares} exemplares
                </span>

                <span className="book-disponivel">
                🟢 {disponiveis} disponíveis
                </span>
              </div>

            </div>

          );
        })}

      </div>

      {infoModal && (

        <BookInfoModal
          book={selectedBook}
          onClose={() => setInfoModal(false)}
        />

      )}

    </div>

  );
}

export default Biblioteca;