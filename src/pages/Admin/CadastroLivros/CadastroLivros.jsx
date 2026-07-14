import React, { useCallback, useEffect, useState } from "react";
import { IoMdAdd } from "react-icons/io";
import { useToast } from "../../../contexts/ToastContext";
import {
  HiOutlineBookOpen,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineCalendar,
} from "react-icons/hi";

import { getBooks, getBook, deleteBook, setBookStatus } from "../../../services/api";
import ConfirmModal from "../../../components/ConfirmModal/ConfirmModal";
import BookList from "./components/BookList/BookList";
import BookFormModal from "./components/BookForm/BookFormModal";
import BookInfoModal from "./components/BookInfo/BookInfoModal";
import FiltroBusca from "./components/FiltroBusca/FiltroBusca";
import { useAuth } from "../../../contexts/AuthContext";
import StatsCard from "../../../components/StatsCard/StatsCard";
import { getErrorMessage } from "../../../utils/apiError";

import "./cadastroLivros.css";

export default function CadastroLivros() {
  const { user } = useAuth();
  const isAdmin = user?.tipo === "admin";

  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingDeleteBook, setPendingDeleteBook] = useState(null);
  const [pendingToggleBook, setPendingToggleBook] = useState(null);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const { addToast } = useToast();
  const [currentBook, setCurrentBook] = useState(null);
  const [fichaBook, setFichaBook] = useState(null);
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
      const ativo = b.livAtivo !== false; // ausência do campo é tratada como ativo
      if (filters.status.toLowerCase() === "ativo" && !ativo) return false;
      if (filters.status.toLowerCase() === "inativo" && ativo) return false;
    }

    return true;
  });

  const loadBooks = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      const data = await getBooks({ incluir_inativos: true, ...params });
      setBooks(data || []);
    } catch (err) {
      console.error(err);
      addToast("Falha ao carregar livros", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

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
      addToast("Livro excluído permanentemente com sucesso", "success");
      loadBooks();
    } catch (err) {
      console.error(err);
      addToast(getErrorMessage(err, "Falha ao excluir o livro"), "error");
    } finally {
      setPendingDeleteBook(null);
    }
  }

  function handleToggleStatus(book) {
    setPendingToggleBook(book);
  }

  async function confirmToggleStatus() {
    if (!pendingToggleBook) return;
    const novoAtivo = pendingToggleBook.livAtivo === false;

    try {
      setTogglingStatus(true);
      await setBookStatus(pendingToggleBook.idLivro, novoAtivo);
      addToast(
        novoAtivo
          ? "Livro reativado com sucesso"
          : "Livro desativado e removido do catálogo",
        "success"
      );
      loadBooks();
    } catch (err) {
      console.error(err);
      addToast(getErrorMessage(err, "Falha ao alterar o status do livro"), "error");
    } finally {
      setTogglingStatus(false);
      setPendingToggleBook(null);
    }
  }

  function handleSaved() {
    setModalOpen(false);
    loadBooks();
  }

  async function handleViewFicha(book) {
    try {
      const detalhes = await getBook(book.idLivro);
      setFichaBook({ ...book, exemplares: detalhes.exemplares || [] });
    } catch (err) {
      console.error(err);
      addToast("Falha ao carregar detalhes do livro", "error");
      setFichaBook(book);
    }
  }

  return (
    <div className="cadastro page-shell">
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
          onToggleStatus={handleToggleStatus}
          onViewFicha={handleViewFicha}
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

      {fichaBook && (
        <BookInfoModal
          book={fichaBook}
          onClose={() => setFichaBook(null)}
        />
      )}

      <ConfirmModal
        show={Boolean(pendingDeleteBook)}
        title="Excluir permanentemente"
        message={
          <>
            <p>
              Tem certeza que deseja excluir <strong>permanentemente</strong> o livro{" "}
              "{pendingDeleteBook?.livTitulo}"?
            </p>
            <p className="confirm-modal-fields-note">
              Este livro será excluído permanentemente e essa ação não pode ser desfeita. 
              A exclusão só é permitida se ele nunca teve empréstimos ou reservas. 
              Caso contrário, use <strong>Desativar</strong>.
            </p>
          </>
        }
        onConfirm={confirmDeleteBook}
        onCancel={() => setPendingDeleteBook(null)}
        confirmText="Excluir permanentemente"
        cancelText="Cancelar"
        irreversivel
      />

      <ConfirmModal
        show={Boolean(pendingToggleBook)}
        title={pendingToggleBook?.livAtivo === false ? "Reativar livro" : "Desativar livro"}
        message={
          pendingToggleBook?.livAtivo === false
            ? `Tem certeza que deseja reativar "${pendingToggleBook?.livTitulo}"? Ele voltará a aparecer no catálogo dos usuários.`
            : `Tem certeza que deseja desativar "${pendingToggleBook?.livTitulo}"? Ele deixará de aparecer no catálogo dos usuários, mas nenhum dado será apagado — você pode reativá-lo a qualquer momento.`
        }
        onConfirm={confirmToggleStatus}
        onCancel={() => setPendingToggleBook(null)}
        confirmText={pendingToggleBook?.livAtivo === false ? "Reativar" : "Desativar"}
        cancelText="Cancelar"
        confirming={togglingStatus}
      />
    </div>
  );
}