import React, { useEffect, useState } from "react";
import { getBooks, deleteBook } from "../services/api";
import BookList from "../components/BookList/BookList";
import BookFormModal from "../components/BookForm/BookFormModal";
import { useAuth } from "../contexts/AuthContext";

export default function CadastroLivros() {
  const { user, isAuthenticated } = useAuth();
  const isAdmin = user?.tipo === "admin";

  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [currentBook, setCurrentBook] = useState(null);

  // Carrega livros do backend
  const fetchBooks = async () => {
    setLoading(true);
    try {
      const data = await getBooks();
      setBooks(data);
    } catch (err) {
      console.error(err);
      setError("Não foi possível carregar os livros.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  // Abrir modal para adicionar ou editar
  const handleAdd = () => {
    setCurrentBook(null);
    setModalOpen(true);
  };

  const handleEdit = (book) => {
    setCurrentBook(book);
    setModalOpen(true);
  };

  // Excluir livro
  const handleDelete = async (book) => {
    if (!window.confirm(`Deseja excluir o livro "${book.livTitulo}"?`)) return;
    try {
      await deleteBook(book.idLivro);
      fetchBooks();
    } catch (err) {
      console.error(err);
      alert("Erro ao excluir livro.");
    }
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Lista de Livros</h1>

      {error && <div className="bg-red-100 text-red-700 p-2 mb-4 rounded">{error}</div>}

      {isAdmin && (
        <button
          onClick={handleAdd}
          className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          Adicionar Livro
        </button>
      )}

      {loading ? (
        <div>Carregando...</div>
      ) : (
        <BookList
          books={books}
          onEditBook={handleEdit}
          onDeleteBook={handleDelete}
          isAdmin={isAdmin}
        />
      )}

      {modalOpen && (
        <BookFormModal
          bookToEdit={currentBook}
          onClose={() => setModalOpen(false)}
          onSaved={fetchBooks}
        />
      )}
    </div>
  );
}
