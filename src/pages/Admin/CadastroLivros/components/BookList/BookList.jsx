import React, { useEffect, useState } from "react";
import {
  HiOutlineBookOpen,
  HiOutlineCalendar,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineLocationMarker,
  HiOutlinePencil,
  HiOutlineXCircle,
} from "react-icons/hi";
import { getCategorias, getGeneros } from "../../../../../services/api";
import "./BookList.css";

const BookList = (props) => {
  const { books = [], onEditBook, onDeleteBook, isAdmin = false } = props;

  const [categorias, setCategorias] = useState([]);
  const [generos, setGeneros] = useState([]);
  const [loadingMeta, setLoadingMeta] = useState(true);

  useEffect(() => {
    const loadMeta = async () => {
      try {
        const [cats, gens] = await Promise.all([getCategorias(), getGeneros()]);
        setCategorias(Array.isArray(cats) ? cats : []);
        setGeneros(Array.isArray(gens) ? gens : []);
      } catch (err) {
        console.error("Erro ao carregar categorias/gêneros:", err);
      } finally {
        setLoadingMeta(false);
      }
    };

    loadMeta();
  }, []);

  const getCategoriaNome = (id) => {
    const cat = categorias.find((c) => String(c.idCategoria) === String(id));
    return cat ? cat.catNome : "Sem categoria";
  };

  const getGeneroNome = (id) => {
    const gen = generos.find((g) => String(g.idGenero) === String(id));
    return gen ? gen.genNome : "Sem gênero";
  };

  const getBookStatus = (book) => {
    const disponiveis = Number(book?.disponiveis || 0);
    const emprestados = Number(book?.emprestados || 0);
    const reservados = Number(book?.reservados || 0);
    const statusTexto = String(book?.status || "").toLowerCase();

    if (statusTexto.includes("reserv")) {
      return { label: "Reservado", className: "reservado" };
    }

    if (statusTexto.includes("emprest")) {
      return { label: "Emprestado", className: "emprestado" };
    }

    if (reservados > 0 && disponiveis === 0) {
      return { label: "Reservado", className: "reservado" };
    }

    if (disponiveis > 0) {
      return { label: "Disponível", className: "disponivel" };
    }

    if (emprestados > 0) {
      return { label: "Emprestado", className: "emprestado" };
    }

    return { label: "Indisponível", className: "indisponivel" };
  };

  const getLocationText = (book) => {
    const locationCandidates = [
      book?.livLocalizacao,
      book?.livLocalizacaoDescricao,
      book?.localizacao,
      book?.estante && book?.prateleira
        ? `Estante ${book.estante}, Prateleira ${book.prateleira}`
        : null,
      book?.estante ? `Estante ${book.estante}` : null,
      book?.prateleira ? `Prateleira ${book.prateleira}` : null,
    ];

    return locationCandidates.find(Boolean) || "Localização não informada";
  };

  const safeBooks = Array.isArray(books) ? books : [];

  return (
    <div className="booklist-container">
      {loadingMeta ? (
        <p>Carregando categorias e gêneros...</p>
      ) : (
        <div className="book-grid">
          {safeBooks.length === 0 && <p>Nenhum livro cadastrado.</p>}

          {safeBooks.map((book, idx) => {
            if (!book) return null;

            const key = book?.idLivro ?? book?.id ?? `book-${idx}`;
            const titulo = book?.livTitulo ?? book?.titulo ?? "Sem título";
            const autor = book?.livAutor ?? book?.autor ?? "Autor desconhecido";
            const capa = book?.livCapaURL || "/placeholder.png";
            const descricao = book?.livDescricao || "Descrição não informada para este livro.";
            const ano = book?.livAnoPublicacao || "Ano não informado";
            const paginas = book?.livPaginas || null;
            const totalExemplares = Number(book?.total_exemplares || 0);
            const disponiveis = Number(book?.disponiveis || 0);
            const emprestados = Number(book?.emprestados || 0);
            const reservados = Number(book?.reservados || 0);
            const status = getBookStatus(book);
            const locationText = getLocationText(book);
            const tombo = book?.tombo || `L${String(book?.idLivro ?? idx + 1).padStart(4, "0")}`;

            return (
              <div className="book-card" key={key}>
                <div className="book-card-media">
                  <div className="book-card-badges">
                    <span className="book-card-code">{tombo}</span>
                    <span className={`book-card-status ${status.className}`}>{status.label}</span>
                  </div>

                  <img
                    src={capa}
                    alt={titulo}
                    onError={(e) => {
                      e.target.src = "/placeholder.png";
                    }}
                  />
                </div>

                <div className="book-card-content">
                  <div className="book-card-body">
                    <div className="book-card-header">
                      <h3>{titulo}</h3>
                      <p className="book-card-author">{autor}</p>
                      <p className="book-card-meta">
                        <HiOutlineCalendar />
                        <span>
                          {ano}
                          {paginas ? ` - ${paginas} págs.` : ""}
                        </span>
                      </p>
                    </div>

                    <p className="book-card-description">{descricao}</p>

                    <div className="book-card-tags">
                      <span>{getCategoriaNome(book?.idCategoria)}</span>
                      <span>{getGeneroNome(book?.idGenero)}</span>
                    </div>

                    <div className="book-card-details">
                      <p className={`detail-line status-line ${status.className}`}>
                        <HiOutlineCheckCircle />
                        <span>{status.label}</span>
                      </p>

                      <p className="detail-line">
                        <HiOutlineLocationMarker />
                        <span>{locationText}</span>
                      </p>

                      <p className="detail-line availability-line">
                        <HiOutlineBookOpen />
                        <span>
                          {disponiveis}/{totalExemplares} disponíveis
                        </span>
                      </p>

                      {(emprestados > 0 || reservados > 0) && (
                        <p className="detail-line loan-line">
                          <HiOutlineClock />
                          <span>
                            {emprestados} emprestado(s)
                            {reservados > 0 ? ` - ${reservados} reservado(s)` : ""}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="card-actions">
                    {isAdmin && (
                      <button className="btn-edit" onClick={() => onEditBook && onEditBook(book)}>
                        <HiOutlinePencil />
                        <span>Editar</span>
                      </button>
                    )}

                    {isAdmin && (
                      <button className="btn-delete" onClick={() => onDeleteBook && onDeleteBook(book)}>
                        <HiOutlineXCircle />
                        <span>Inativar</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BookList;
