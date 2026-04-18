import React, { useEffect, useState } from "react";
import { getBooks, deleteBook } from "../../../../../services/api";
import { useToast } from "../../../../../contexts/ToastContext";
import ConfirmModal from "../../../../../components/ConfirmModal/ConfirmModal";
import BookFormModal from "../BookForm/BookFormModal";
import "./BookForm.css";

const BookList = () => {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editBook, setEditBook] = useState(null);
  const [pendingDeleteBook, setPendingDeleteBook] = useState(null);
  const { addToast } = useToast();

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

  const handleDelete = (id) => {
    const target = books.find((book) => book.idLivro === id);
    setPendingDeleteBook(target || { idLivro: id, livTitulo: "este livro" });
  };

  const confirmDeleteBook = async () => {
    if (!pendingDeleteBook) return;

    try {
      await deleteBook(pendingDeleteBook.idLivro);
      setBooks((prev) => prev.filter((b) => b.idLivro !== pendingDeleteBook.idLivro));
      addToast("Livro excluído com sucesso", "success");
    } catch (err) {
      console.error(err);
      addToast("Falha ao excluir o livro", "error");
    } finally {
      setPendingDeleteBook(null);
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
      <ConfirmModal
        show={Boolean(pendingDeleteBook)}
        title="Confirmar exclusão"
        message={
          pendingDeleteBook
            ? `Tem certeza que deseja excluir este livro?`
            : "Tem certeza que deseja excluir este livro?"
        }
        onConfirm={confirmDeleteBook}
        onCancel={() => setPendingDeleteBook(null)}
        confirmText="Excluir"
        cancelText="Cancelar"
      />
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
