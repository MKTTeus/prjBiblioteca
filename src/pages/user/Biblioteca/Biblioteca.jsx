import React, { useEffect, useState, useRef } from "react";
import BookCard from "../../../components/BookCard/BookCard";
import SearchBar from "../../../components/SearchBar/SearchBar";
import { useToast } from "../../../contexts/ToastContext";
import { getBooks, solicitarEmprestimo, getExemplaresDisponiveis } from "../../../services/api";
import "../UserArea.css";
import "./Biblioteca.css";
import { useAuth } from "../../../contexts/AuthContext";

export default function Biblioteca() {
  const { addToast } = useToast();
  const [search, setSearch] = useState("");
  const [books, setBooks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [solicitados, setSolicitados] = useState({});
  const [solicitando, setSolicitando] = useState({});
  const { user } = useAuth();
  const isAluno = user?.tipo?.toLowerCase() === "aluno";
  const cooldownRef = useRef({});

  const handleRequestLoan = async (book) => {
    const id = book.idLivro ?? book.id;

    if (solicitados[id] || solicitando[id]) return;
    if (cooldownRef.current[id]) return;
    cooldownRef.current[id] = true;
    setTimeout(() => { delete cooldownRef.current[id]; }, 2000);

    setSolicitando((prev) => ({ ...prev, [id]: true }));
    try {
      const exemplares = await getExemplaresDisponiveis();
      const exemplarDisponivel = exemplares.find(
        (ex) => ex.nome === book.livTitulo || ex.nome === book.titulo
      );

      if (!exemplarDisponivel) {
        addToast("Nenhum exemplar disponível para este livro no momento", "error");
        return;
      }

      await solicitarEmprestimo({ idExemplar: exemplarDisponivel.id });
      setSolicitados((prev) => ({ ...prev, [id]: true }));
      addToast("Solicitação enviada! Aguarde aprovação do administrador.", "success");
    } catch (err) {
      const detail = err.data?.detail;
      const mensagem =
        typeof detail === "string"
          ? detail
          : Array.isArray(detail)
          ? detail.map((d) => d.msg).join(", ")
          : err.message || "Erro ao solicitar empréstimo";
      addToast(mensagem, "error");
    } finally {
      setSolicitando((prev) => ({ ...prev, [id]: false }));
    }
  };

  useEffect(() => {
    async function fetchBooks() {
      setIsLoading(true);
      setError(null);
      try {
        const params = {};
        if (search.trim()) params.q = search.trim();
        const data = await getBooks(params);
        setBooks(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Erro ao buscar livros:", err);
        setBooks([]);
        setError("Erro ao carregar livros. Tente novamente.");
      } finally {
        setIsLoading(false);
      }
    }
    fetchBooks();
  }, [search]);

  return (
    <div className="user-page user-library-page page-shell">
      <section className="user-page__hero">
        <div className="user-page__hero-content">
          <h2>Biblioteca</h2>
          <p>Pesquise livros por título, autor ou categoria usando dados reais do banco.</p>
        </div>
      </section>

      <section className="user-section-card user-library-toolbar">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Buscar por livro, autor ou categoria..."
        />
      </section>

      {isLoading ? (
        <div className="user-empty-state">Carregando livros...</div>
      ) : error ? (
        <div className="user-empty-state">{error}</div>
      ) : books.length > 0 ? (
        <section className="user-library-results">
          <div className="shared-book-grid">
            {books.map((book) => {
              const id = book.idLivro ?? book.id;
              return (
                <BookCard
                  key={id}
                  book={book}
                  categoryName={book.livCategoria || book.categoria}
                  genreName={book.livGenero || book.genero}
                  onRequestLoan={isAluno ? handleRequestLoan : undefined}
                  jasolicitado={solicitados[id]}
                  solicitando={solicitando[id]}
                  isComunidade={!isAluno}
                />
              );
            })}
          </div>
        </section>
      ) : (
        <div className="user-empty-state">Nenhum livro encontrado para a busca informada.</div>
      )}
    </div>
  );
}