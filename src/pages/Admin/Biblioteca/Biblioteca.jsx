import "../../../components/AdminPageLayout/AdminPageLayout.css";
import React, { useEffect, useState } from "react";
import "./Biblioteca.css";
import StatsCard from "../../../components/StatsCard/StatsCard";
import { BookOpen, BookCopy, BookCheck, BookX } from "lucide-react";
import { getBooks, getBook } from "../../../services/api";
import BookInfoModal from "../CadastroLivros/components/BookInfo/BookInfoModal";
import { filtrarPorBusca } from "../../../utils/busca";

function Biblioteca() {
  const [books, setBooks] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");

  const [infoModal, setInfoModal] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);

  async function loadBooks() {
    const data = await getBooks();

    setBooks(data || []);
    setFiltered(data || []);
  }

  useEffect(() => {
    loadBooks();
  }, []);

  useEffect(() => {
    setFiltered(filtrarPorBusca(books, search, (b) => [b.livTitulo, b.livAutor]));
  }, [search, books]);

  async function abrirInfo(book) {
    try {
      const detalhes = await getBook(book.idLivro);
      setSelectedBook({
        ...book,
        exemplares: detalhes.exemplares || [],
      });
      setInfoModal(true);
    } catch (error) {
      console.error("Falha ao carregar detalhes do livro", error);
      setSelectedBook(book);
      setInfoModal(true);
    }
  }

  return (
    <div className="biblioteca-page page-shell admin-standard-page">
      <div className="biblioteca-header admin-standard-header">
        <div>
          <h1>Biblioteca</h1>
          <p>Consulte os títulos disponíveis no acervo escolar.</p>
        </div>
      </div>

      <section className="stats-cards-grid admin-standard-kpis" aria-label="Resumo da biblioteca">
        <StatsCard title="Títulos" value={books.length} subtitle="Cadastrados no acervo" icon={<BookOpen size={18} />} color="blue" />
        <StatsCard title="Exemplares" value={books.reduce((n, b) => n + Number(b.exemplares_cadastrados ?? b.total_exemplares ?? 0), 0)} subtitle="Total de cópias" icon={<BookCopy size={18} />} color="green" />
        <StatsCard title="Disponíveis" value={books.reduce((n, b) => n + Number(b.disponiveis || 0), 0)} subtitle="Prontos para empréstimo" icon={<BookCheck size={18} />} color="orange" />
        <StatsCard title="Sem exemplares" value={books.filter(b => Number(b.exemplares_cadastrados ?? b.total_exemplares ?? 0) === 0).length} subtitle="Títulos sem cópias" icon={<BookX size={18} />} color="red" />
      </section>

      <div className="biblioteca-search">
        <div className="header-actions">
          <input
            className="input-pesquisa"
            placeholder="Pesquisar livro ou autor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="book-grid">
        {filtered.map((book) => {
          const totalExemplares = book.total_exemplares || 0;
          const disponiveis = book.disponiveis || 0;

          return (
            <div key={book.idLivro} className="book-card" onClick={() => abrirInfo(book)}>
              <img
                loading="lazy"
                src={book.livCapaURL || "https://via.placeholder.com/150x220"}
                alt={book.livTitulo}
              />

              <div className="book-overlay">
                <h3>{book.livTitulo}</h3>
                <p>{book.livAutor}</p>

                <span className="book-count">Exemplares: {totalExemplares}</span>

                <span className="book-disponivel">Disponíveis: {disponiveis}</span>
              </div>
            </div>
          );
        })}
      </div>

      {infoModal && <BookInfoModal book={selectedBook} onClose={() => setInfoModal(false)} />}
    </div>
  );
}

export default Biblioteca;
