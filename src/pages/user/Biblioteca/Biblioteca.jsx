import Skeleton from "../../../components/Skeleton/Skeleton";
import React, { useEffect, useState, useRef } from "react";
import BookCard from "../../../components/BookCard/BookCard";
import Pagination from "../../../components/Pagination/Pagination";
import SearchBar from "../../../components/SearchBar/SearchBar";
import { useToast } from "../../../contexts/ToastContext";
import { getBooksPage, solicitarLivro, getEmprestimos } from "../../../services/api";
import "../UserArea.css";
import "./Biblioteca.css";
import { useAuth } from "../../../contexts/AuthContext";
import { getErrorMessage } from "../../../utils/apiError";

export default function Biblioteca() {
  const { addToast } = useToast();
  const [search, setSearch] = useState("");
  const [books, setBooks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tentativa, setTentativa] = useState(0);
  const [solicitados, setSolicitados] = useState({});
  const [solicitando, setSolicitando] = useState({});
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalItens, setTotalItens] = useState(0);
  const [resultadoAproximado, setResultadoAproximado] = useState(false);
  const { user } = useAuth();
  const isAluno = user?.tipo?.toLowerCase() === "aluno";
  const cooldownRef = useRef({});
  const itensPorPagina = 20;
  const totalPaginas = Math.max(1, Math.ceil(totalItens / itensPorPagina));

  // Carrega empréstimos pendentes/aprovados/ativos para pré-popular solicitados
  useEffect(() => {
    if (!isAluno) return;
    let cancelado = false;
    async function carregarSolicitados() {
      try {
        const emprestimos = await getEmprestimos();
        if (cancelado) return;
        const relevantes = emprestimos.filter((e) =>
          ["pendente", "aprovado", "ativo"].includes((e.movStatus || e.status || "").toLowerCase())
        );
        const mapa = {};
        for (const emp of relevantes) {
          const idLivro = emp.idLivro;
          if (idLivro) mapa[idLivro] = (emp.movStatus || emp.status || "").toLowerCase();
        }
        setSolicitados(mapa);
      } catch {
        // silencioso — não bloqueia a página
      }
    }

    carregarSolicitados();
    // Atualiza periodicamente e ao voltar o foco na aba, para refletir
    // aprovações/negações/expirações feitas pelo admin sem precisar recarregar.
    const interval = setInterval(carregarSolicitados, 10000);
    function aoFocar() {
      if (document.visibilityState === "visible") carregarSolicitados();
    }
    document.addEventListener("visibilitychange", aoFocar);
    window.addEventListener("focus", aoFocar);

    return () => {
      cancelado = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", aoFocar);
      window.removeEventListener("focus", aoFocar);
    };
  }, [isAluno]);

  const handleRequestLoan = async (book) => {
    const idLivro = book.idLivro ?? book.id;

    if (solicitados[idLivro] || solicitando[idLivro]) return;
    if (cooldownRef.current[idLivro]) return;
    cooldownRef.current[idLivro] = true;
    setTimeout(() => { delete cooldownRef.current[idLivro]; }, 2000);

    setSolicitando((prev) => ({ ...prev, [idLivro]: true }));
    try {
      await solicitarLivro({ idLivro });
      setSolicitados((prev) => ({ ...prev, [idLivro]: "pendente" }));
      addToast("Solicitação enviada! Aguarde aprovação do administrador.", "success");
    } catch (err) {
      addToast(getErrorMessage(err, "Erro ao solicitar empréstimo"), "error");
    } finally {
      setSolicitando((prev) => ({ ...prev, [idLivro]: false }));
    }
  };

  useEffect(() => {
    let ativo = true;
    async function fetchBooks() {
      try {
        const params = { page: paginaAtual, per_page: itensPorPagina };
        if (search.trim()) params.q = search.trim();
        const data = await getBooksPage(params);
        if (ativo) {
          setBooks(Array.isArray(data?.itens) ? data.itens : []);
          setTotalItens(Number(data?.total ?? 0));
          setResultadoAproximado(Boolean(data?.aproximado));
        }
      } catch (err) {
        if (!ativo) return;
        console.error("Erro ao buscar livros:", err);
        setBooks([]);
        setError(getErrorMessage(err, "Não foi possível carregar o acervo de livros. Verifique sua conexão e tente novamente."));
      } finally {
        if (ativo) setIsLoading(false);
      }
    }
    setIsLoading(true);
    setError(null);
    const timer = setTimeout(fetchBooks, search.trim() ? 250 : 0);
    return () => { ativo = false; clearTimeout(timer); };
  }, [search, paginaAtual, tentativa]);

  return (
    <div className="user-page user-library-page page-shell">
      <section className="user-page__hero">
        <div className="user-page__hero-content">
          <h2>Biblioteca</h2>
          <p>Explore livros com pelo menos um exemplar não desativado.</p>
        </div>
      </section>

      <details className="user-section-card">
        <summary>Como solicitar e retirar um livro?</summary>
        <p>Escolha um título disponível e envie a solicitação. Acompanhe a aprovação em Empréstimos. Aguarde a confirmação e as orientações na tela antes de ir à biblioteca; a equipe registrará a retirada.</p>
      </details>

      <section className="user-section-card user-library-toolbar">
        <SearchBar
          value={search}
          onChange={(value) => { setSearch(value); setPaginaAtual(1); }}
          placeholder="Buscar por livro, autor ou gênero..."
        />
      </section>

      {isLoading ? (
        <Skeleton variant="books" />
      ) : error ? (
        <div className="user-empty-state" role="alert">
          <p>{error}</p>
          <button type="button" onClick={() => setTentativa((n) => n + 1)}>Tentar novamente</button>
        </div>
      ) : books.length > 0 ? (
        <section className="user-library-results">
          {resultadoAproximado && (
            <p className="user-library-notice" role="status">
              Não encontramos exatamente o que você digitou. Estes são resultados parecidos com “{search.trim()}”.
            </p>
          )}
          <div className="shared-book-grid">
            {books.map((book, index) => {
              const id = book.idLivro ?? book.id;
              return (
                <BookCard
                  key={id}
                  book={book}
                  genreName={book.livGenero || book.genero}
                  coverLoading={index < 4 ? "eager" : "lazy"}
                  onRequestLoan={isAluno ? handleRequestLoan : undefined}
                  statusSolicitacao={solicitados[id] || null}
                  solicitando={!!solicitando[id]}
                  isComunidade={!isAluno}
                />
              );
            })}
          </div>
          <Pagination paginaAtual={paginaAtual} totalPaginas={totalPaginas} totalItens={totalItens} onChange={setPaginaAtual} />
        </section>
      ) : (
        <div className="user-empty-state">Nenhum livro encontrado para a busca informada.</div>
      )}
    </div>
  );
}
