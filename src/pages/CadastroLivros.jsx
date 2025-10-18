import React, { useState } from "react";
import BookList from "../components/BookList/BookList";
import BookFormModal from "../components/BookForm/BookFormModal";
import "../styles/cadastroLivros.css";
import { FiBook, FiPlus } from "react-icons/fi";

function CadastroLivros() {
  const [books, setBooks] = useState([
    {
      titulo: "Dom Casmurro",
      autor: "Machado de Assis",
      tombo: "TOM001",
      categoria: "Literatura Brasileira",
      genero: "Romance",
      localizacao: "Estante A, Prateleira 2",
      exemplares: "3/5",
      status: "Disponível",
    },
    {
      titulo: "O Cortiço",
      autor: "Aluísio Azevedo",
      tombo: "TOM002",
      categoria: "Literatura Brasileira",
      genero: "Realismo",
      localizacao: "Estante A, Prateleira 3",
      exemplares: "1/3",
      status: "Disponível",
    },
  ]);

  // Estado do modal e livro sendo editado
  const [showModal, setShowModal] = useState(false);
  const [editingBook, setEditingBook] = useState(null); // índice do livro sendo editado

  const totalLivros = books.length;

  // 🔹 Abrir modal para cadastrar novo livro
  const handleOpenNewBookModal = () => {
    setEditingBook(null);
    setShowModal(true);
  };

  // 🔹 Adicionar ou atualizar livro
  const handleAddBook = (newBook) => {
    if (editingBook !== null) {
      // Modo edição → atualiza o livro existente
      const updatedBooks = [...books];
      updatedBooks[editingBook] = newBook;
      setBooks(updatedBooks);
      setEditingBook(null);
    } else {
      // Modo novo → adiciona o livro
      setBooks([...books, newBook]);
    }
    setShowModal(false);
  };

  // 🔹 Excluir livro
  const handleDeleteBook = (index) => {
    if (window.confirm("Tem certeza que deseja excluir este livro?")) {
      const updated = books.filter((_, i) => i !== index);
      setBooks(updated);
    }
  };

  // 🔹 Editar livro existente
  const handleEditBook = (book, index) => {
    setEditingBook(index);
    setShowModal(true);
  };

  return (
    <div className="cadastro-container">
      <header className="cadastro-header">
        <div className="header-left">
          <h2>Cadastro de Livros</h2>
          <p>Gerencie o acervo da biblioteca</p>
        </div>
        <button className="btn-novo-livro" onClick={handleOpenNewBookModal}>
          <FiPlus size={18} />
          Novo Livro
        </button>
      </header>

      <div className="search-and-total">
        <input
          type="text"
          className="input-search"
          placeholder="Buscar por título, autor, ISBN, categoria, gênero ou tombo..."
        />
        <div className="total-card">
          <FiBook size={28} />
          <div>
            <h3>{totalLivros}</h3>
            <p>Total de Livros</p>
          </div>
        </div>
      </div>

      <div className="list-container">
        <BookList
          books={books}
          onDeleteBook={handleDeleteBook}
          onEditBook={handleEditBook}
        />
      </div>

      {showModal && (
        <BookFormModal
          onClose={() => {
            setShowModal(false);
            setEditingBook(null);
          }}
          onAddBook={handleAddBook}
          existingBook={editingBook !== null ? books[editingBook] : null}
        />
      )}

      <footer className="footer">
        Sistema de Biblioteca - Escola 9 de Julho de Taquaritinga<br />
        © 2024 - Todos os direitos reservados
      </footer>
    </div>
  );
}

export default CadastroLivros;
