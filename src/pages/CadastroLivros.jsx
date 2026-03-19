import React, { useEffect, useState } from "react";
import { IoMdAdd } from "react-icons/io";
import {
  HiOutlineBookOpen,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineCalendar,
} from "react-icons/hi";

import { getBooks, deleteBook, getBook } from "../services/api";
import BookList from "../components/BookList/BookList";
import BookFormModal from "../components/BookForm/BookFormModal";
import BookExemplaresModal from "../components/BookInfo/BookExemplaresModal";
import FiltroBusca from "../components/FiltroBusca/FiltroBusca";
import { useAuth } from "../contexts/AuthContext";

import "../styles/cadastroLivros.css";

export default function CadastroLivros() {
  const { user } = useAuth();
  const isAdmin = user?.tipo === "admin";

  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [currentBook, setCurrentBook] = useState(null);

  // filtros
  const [filters, setFilters] = useState({ q: "", categoria: "todas", status: "todas" });

  const filteredBooks = books.filter((b) => {
    const q = (filters.q || "").toLowerCase().trim();

    if (q) {
      const matchesTitulo = (b.livTitulo || "").toLowerCase().includes(q);
      const matchesAutor = (b.livAutor || "").toLowerCase().includes(q);
      const matchesTombo = String(b.tombo || b.idLivro || "").toLowerCase().includes(q);
      if (!(matchesTitulo || matchesAutor || matchesTombo)) return false;
    }

    if (filters.categoria && filters.categoria !== "todas") {
      const catId = String(b.idCategoria ?? b.idCategoria);
      if (catId !== String(filters.categoria)) return false;
    }

    if (filters.status && filters.status !== "todas") {
      const st = (b.status || "").toLowerCase();
      if (st.indexOf(filters.status.toLowerCase()) === -1) return false;
    }

    return true;
  });

  // 🔥 EXEMPLARES (SEU CÓDIGO)
  const [exemplarModalOpen, setExemplarModalOpen] = useState(false);
  const [selectedBookForExemplar, setSelectedBookForExemplar] = useState(null);

  // 🔥 CARREGAR LIVROS
  async function loadBooks(params = {}) {
    try {
      setLoading(true);
      const data = await getBooks(params);
      setBooks(data || []);
    } catch (err) {
      console.error(err);
      alert("Erro ao carregar livros");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // initial load
    loadBooks();
  }, []);

  // when filters change, reload from server
  useEffect(() => {
    const to = setTimeout(() => {
      loadBooks({ q: filters.q, categoria: filters.categoria, status: filters.status, page: 1, per_page: 200 });
    }, 250);
    return () => clearTimeout(to);
  }, [filters]);

  // 🔥 AÇÕES
  function handleAdd() {
    setCurrentBook(null);
    setModalOpen(true);
  }

  function handleEdit(book) {
    setCurrentBook(book);
    setModalOpen(true);
  }

  // 🔥 EDITAR TOMBOS (SEU)
  async function handleEditTombos(book) {
    if (!isAdmin) return;

    try {
      const detalhes = await getBook(book.idLivro);

      setSelectedBookForExemplar({
        ...book,
        exemplares: detalhes.exemplares || [],
      });

      setExemplarModalOpen(true);
    } catch (err) {
      console.error(err);
      alert("Erro ao carregar exemplares");
    }
  }

  async function handleDelete(book) {
    if (!window.confirm(`Excluir "${book.livTitulo}"?`)) return;

    try {
      await deleteBook(book.idLivro);
      loadBooks();
    } catch (err) {
      console.error(err);
      alert("Erro ao excluir livro");
    }
  }

  function handleSaved() {
    setModalOpen(false);
    loadBooks();
  }

  return (
    <div className="cadastro">
      {/* HEADER */}
      <div className="cadastro-header">
        <div>
          <h1>Bem-vindo ao Cadastro de Livros</h1>
          <p>Gerencie o acervo completo da biblioteca escolar.</p>
        </div>

        {isAdmin && (
          <button onClick={handleAdd} className="btn-add">
            <IoMdAdd /> Novo Livro
          </button>
        )}
      </div>

      {/* STATS */}
      <div className="stats-container">
        <div className="stat-card">
          <HiOutlineBookOpen className="stat-icon blue-icon" />
          <h2>{books.length}</h2>
          <p>Total de Livros</p>
        </div>

        <div className="stat-card">
          <HiOutlineCheckCircle className="stat-icon green-icon" />
          <h2>{books.reduce((acc, b) => acc + (Number(b.disponiveis || b.disponiveis === 0 ? b.disponiveis : (b.total_exemplares ? b.total_exemplares : 0))), 0)}</h2>
          <p>Disponíveis</p>
        </div>

        <div className="stat-card">
          <HiOutlineClock className="stat-icon orange-icon" />
          <h2>{books.reduce((acc, b) => acc + (Number(b.emprestados || 0)), 0)}</h2>
          <p>Emprestados</p>
        </div>

        <div className="stat-card">
          <HiOutlineCalendar className="stat-icon red-icon" />
          <h2>{books.reduce((acc, b) => acc + (Number(b.reservados || 0)), 0)}</h2>
          <p>Reservados</p>
        </div>
      </div>

      {/* FILTRO */}
      <FiltroBusca onFilter={(f) => setFilters(f)} />

      {/* HEADER CATÁLOGO */}
      <div className="catalog-header">
        <h2>
          Catálogo de Livros{" "}
          <span className="catalog-count">
            ({books.length}{" "}
            {books.length === 1
              ? "livro encontrado"
              : "livros encontrados"})
          </span>
        </h2>
      </div>

      {/* LISTA */}
      {loading ? (
        <p>Carregando...</p>
      ) : (
        <BookList
          books={filteredBooks}
          onEditBook={handleEdit}
          onDeleteBook={handleDelete}
          onEditTombos={handleEditTombos}
          isAdmin={isAdmin}
        />
      )}

      {/* MODAL LIVRO */}
      {modalOpen && (
        <BookFormModal
          bookToEdit={currentBook}
          onClose={() => setModalOpen(false)}
          onBookSaved={handleSaved} 
        />
      )}

      {/* MODAL EXEMPLARES */}
      {exemplarModalOpen && selectedBookForExemplar && (
        <BookExemplaresModal
          book={selectedBookForExemplar}
          onClose={() => setExemplarModalOpen(false)}
          onSaved={async () => {
            setExemplarModalOpen(false);
            await loadBooks();
          }}
        />
      )}
    </div>
  );
}