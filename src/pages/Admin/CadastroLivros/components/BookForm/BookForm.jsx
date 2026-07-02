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
              <img
                src={book.livCapaURL}
                alt={book.livTitulo}
                onError={(e) => {
                  e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='300' viewBox='0 0 200 300'%3E%3Crect fill='%23e0e0e0' width='200' height='300'/%3E%3Ctext x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='14' fill='%23999'%3ESem capa%3C/text%3E%3C/svg%3E";
                }}
              />
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
