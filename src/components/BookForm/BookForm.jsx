import React, { useEffect, useState } from "react";
import { getBooks, deleteBook } from "../../services/api";
import BookFormModal from "../BookForm/BookFormModal";
import "./BookList.css";

const BookList = () => {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editBook, setEditBook] = useState(null);

  const fetchBooks = async () => {
    setLoading(true);
    try {
      const data = await getBooks();
      setBooks(data || []);
    } catch (err) {
      alert("Erro ao carregar livros: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Deseja realmente deletar este livro?")) return;
    try {
      await deleteBook(id);
      setBooks(books.filter((b) => b.idLivro !== id));
    } catch (err) {
      alert("Erro ao deletar: " + err.message);
    }
  };

  const handleEdit = (book) => {
    setEditBook(book);
    setModalOpen(true);
  };

  const handleBookSaved = (savedBook) => {
    // Atualiza lista após adicionar/editar
    const exists = books.find((b) => b.idLivro === savedBook.idLivro);
    if (exists) {
      setBooks(books.map((b) => (b.idLivro === savedBook.idLivro ? savedBook : b)));
    } else {
      setBooks([savedBook, ...books]);
    }
  };

  return (
    <div className="booklist-container">
      {modalOpen && (
        <BookFormModal
          onClose={() => { setModalOpen(false); setEditBook(null); }}
          onBookSaved={handleBookSaved}
          editData={editBook}
        />
      )}
      {loading ? (
        <p>Carregando livros...</p>
      ) : (
        <div className="book-grid">
          {books.map((book) => (
            <div className="book-card" key={book.idLivro}>
              <img src={book.livCapaURL || "/placeholder.png"} alt={book.livTitulo} />
              <h3>{book.livTitulo}</h3>
              <p>{book.livAutor}</p>
              <p><strong>Categoria:</strong> {book.idCategoria}</p>
              <p><strong>Gênero:</strong> {book.idGenero}</p>
              <div className="card-actions">
                <button className="btn-edit" onClick={() => handleEdit(book)}>Editar</button>
                <button className="btn-delete" onClick={() => handleDelete(book.idLivro)}>Deletar</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BookList;
