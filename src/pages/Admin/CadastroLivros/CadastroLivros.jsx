import React, { useEffect, useState } from "react";
import { IoMdAdd } from "react-icons/io";
import { useToast } from "../../../contexts/ToastContext";
import {
  HiOutlineBookOpen,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineCalendar,
} from "react-icons/hi";

import { getBooks, deleteBook } from "../../../services/api";
import ConfirmModal from "../../../components/ConfirmModal/ConfirmModal";
import BookList from "./components/BookList/BookList";
import BookFormModal from "./components/BookForm/BookFormModal";
import FiltroBusca from "./components/FiltroBusca/FiltroBusca";
import { useAuth } from "../../../contexts/AuthContext";
import StatsCard from "../../../components/StatsCard/StatsCard";

import "./cadastroLivros.css";

export default function CadastroLivros() {
  const { user } = useAuth();
  const isAdmin = user?.tipo === "admin";

  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingDeleteBook, setPendingDeleteBook] = useState(null);
  const { addToast } = useToast();
  const [currentBook, setCurrentBook] = useState(null);
  const [filters, setFilters] = useState({
    q: "",
    categoria: "todas",
    status: "todas",
  });

  const filteredBooks = books.filter((b) => {
    const q = (filters.q || "").toLowerCase().trim();

    if (q) {
      const matchTitulo = (b.livTitulo || "").toLowerCase().includes(q);
      const matchAutor = (b.livAutor || "").toLowerCase().includes(q);
      const matchIsbn = String(b.livISBN || b.exeLivISBN || b.exemplarISBN || "")
        .toLowerCase()
        .includes(q);
      const matchTombo = String(b.tombo || b.idLivro || "").toLowerCase().includes(q);

      if (!(matchTitulo || matchAutor || matchIsbn || matchTombo)) return false;
    }

    if (filters.categoria && filters.categoria !== "todas") {
      const catId = String(b.idCategoria ?? b.idCategoria);
      if (catId !== String(filters.categoria)) return false;
    }

    if (filters.status && filters.status !== "todas") {
      const st = (b.status || "").toLowerCase();
      if (!st.includes(filters.status.toLowerCase())) return false;
    }

    return true;
  });

  async function loadBooks(params = {}) {
    try {
      setLoading(true);
      const data = await getBooks(params);
      setBooks(data || []);
    } catch (err) {
      console.error(err);
      addToast("Falha ao carregar livros", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBooks();
  }, []);

  function handleAdd() {
    setCurrentBook(null);
    setModalOpen(true);
  }

  function handleEdit(book) {
    setCurrentBook(book);
    setModalOpen(true);
  }

  function handleDelete(book) {
    setPendingDeleteBook(book);
  }

  async function confirmDeleteBook() {
    if (!pendingDeleteBook) return;

    try {
      await deleteBook(pendingDeleteBook.idLivro);
      addToast("Livro excluído com sucesso", "success");
      loadBooks();
    } catch (err) {
      console.error(err);
      addToast("Falha ao excluir o livro", "error");
    } finally {
      setPendingDeleteBook(null);
    }
  }

  function handleSaved() {
    setModalOpen(false);
    loadBooks();
  }

  return (
    <div className="cadastro">
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

      <div className="stats-cards-grid">
        <StatsCard
          title="Total de Livros"
          value={books.length}
          subtitle="Acervo cadastrado"
          icon={<HiOutlineBookOpen />}
          color="blue"
        />

        <StatsCard
          title="Disponíveis"
          value={books.reduce(
            (acc, b) =>
              acc +
              Number(
                b.disponiveis || b.disponiveis === 0
                  ? b.disponiveis
                  : b.total_exemplares
                    ? b.total_exemplares
                    : 0
              ),
            0
          )}
          subtitle="Prontos para empréstimo"
          icon={<HiOutlineCheckCircle />}
          color="green"
        />

        <StatsCard
          title="Emprestados"
          value={books.reduce((acc, b) => acc + Number(b.emprestados || 0), 0)}
          subtitle="Em circulação"
          icon={<HiOutlineClock />}
          color="orange"
        />

        <StatsCard
          title="Reservados"
          value={books.reduce((acc, b) => acc + Number(b.reservados || 0), 0)}
          subtitle="Aguardando retirada"
          icon={<HiOutlineCalendar />}
          color="red"
        />
      </div>

      <FiltroBusca onFilter={(f) => setFilters(f)} />

      <div className="catalog-header">
        <h2>
          Catálogo de Livros{" "}
          <span className="catalog-count">
            ({filteredBooks.length}{" "}
            {filteredBooks.length === 1 ? "livro encontrado" : "livros encontrados"})
          </span>
        </h2>
      </div>

      {loading ? (
        <p>Carregando...</p>
      ) : (
        <BookList
          books={filteredBooks}
          onEditBook={handleEdit}
          onDeleteBook={handleDelete}
          isAdmin={isAdmin}
        />
      )}

      {modalOpen && (
        <BookFormModal
          bookToEdit={currentBook}
          onClose={() => setModalOpen(false)}
          onBookSaved={handleSaved}
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
    </div>
  );
}
