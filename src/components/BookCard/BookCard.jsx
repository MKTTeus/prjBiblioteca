import React from "react";
import {
  HiOutlineBookOpen,
  HiOutlineCalendar,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineLocationMarker,
  HiOutlinePencil,
  HiOutlineXCircle,
  HiOutlineRefresh,
  HiOutlineTrash,
  HiOutlineDocumentText,
} from "react-icons/hi";
import "./BookCard.css";

function getBookStatus(book) {
  if (book?.livAtivo === false) {
    return { label: "Inativo", className: "indisponivel" };
  }

  const total      = Number(book?.total_exemplares ?? book?.totalExemplares ?? 0);
  const disponiveis = Number(book?.disponiveis ?? book?.livrosDisponiveis ?? 0);
  const emprestados = Number(book?.emprestados ?? book?.livrosEmprestados ?? 0);
  const reservados  = Number(book?.reservados ?? 0);

  // Sem exemplares cadastrados
  if (total === 0 && disponiveis === 0 && emprestados === 0 && reservados === 0) {
    return { label: "Sem exemplares", className: "indisponivel" };
  }

  // Priorizar campos numéricos
  if (disponiveis > 0) return { label: "Disponível",    className: "disponivel" };
  if (reservados  > 0) return { label: "Reservado",     className: "reservado" };
  if (emprestados > 0) return { label: "Emprestado",    className: "emprestado" };

  // Fallback: texto do campo status
  const s = String(book?.status || "").toLowerCase();
  if (s.includes("disponív")) return { label: "Disponível",   className: "disponivel" };
  if (s.includes("reserv"))   return { label: "Reservado",    className: "reservado" };
  if (s.includes("emprest"))  return { label: "Emprestado",   className: "emprestado" };

  return { label: "Indisponível", className: "indisponivel" };
}

function getLocationText(book) {
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
}

function getBookCode(book) {
  if (book?.tombo) return book.tombo;
  if (book?.codigo) return book.codigo;
  const numericId = book?.idLivro ?? book?.id ?? 0;
  return `L${String(numericId).padStart(4, "0")}`;
}

export default function BookCard({
  book,
  categoryName,
  genreName,
  isAdmin = false,
  onEdit,
  onDelete,
  onToggleStatus,
  onViewFicha,
  onRequestLoan,
  jasolicitado = false,
  solicitando = false,
  isComunidade = false,
}) {
  const titulo = book?.livTitulo ?? book?.titulo ?? "Sem título";
  const autor = book?.livAutor ?? book?.autor ?? "Autor desconhecido";
  const capa = book?.livCapaURL || book?.capa || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='240' viewBox='0 0 160 240'%3E%3Crect fill='%23e0e0e0' width='160' height='240'/%3E%3Ctext x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='12' fill='%23999'%3ESem capa%3C/text%3E%3C/svg%3E";
  const descricao = book?.livDescricao || book?.descricao || "Descrição não informada para este livro.";
  const ano = book?.livAnoPublicacao ?? book?.anoPublicacao ?? "Ano não informado";
  const paginas = book?.livPaginas ?? book?.paginas ?? null;
  const totalExemplares = Number(book?.total_exemplares ?? book?.totalExemplares ?? 0);
  const disponiveis = Number(book?.disponiveis ?? book?.livrosDisponiveis ?? 0);
  const emprestados = Number(book?.emprestados ?? book?.livrosEmprestados ?? 0);
  const reservados = Number(book?.reservados ?? 0);
  const status = getBookStatus(book);
  const locationText = getLocationText(book);
  const tombo = getBookCode(book);
  const tags = [categoryName || book?.categoria, genreName || book?.genero].filter(Boolean);

  return (
    <div className="shared-book-card">
      <div className="shared-book-card__media">
        <div className="shared-book-card__badges">
          <span className="shared-book-card__code">{tombo}</span>
          <span className={`shared-book-card__status ${status.className}`}>{status.label}</span>
        </div>
        <img
          src={capa}
          alt={titulo}
          onError={(e) => { e.target.src = "/placeholder.png"; }}
        />
      </div>

      <div className="shared-book-card__content">
        <div className="shared-book-card__body">
          <div className="shared-book-card__header">
            <h3>{titulo}</h3>
            <p className="shared-book-card__author">{autor}</p>
            <p className="shared-book-card__meta">
              <HiOutlineCalendar />
              <span>{ano}{paginas ? ` - ${paginas} págs.` : ""}</span>
            </p>
          </div>

          <p className="shared-book-card__description">{descricao}</p>

          {tags.length > 0 && (
            <div className="shared-book-card__tags">
              {tags.map((tag) => <span key={tag}>{tag}</span>)}
            </div>
          )}

          <div className="shared-book-card__details">
            <p className={`shared-book-card__detail status-line ${status.className}`}>
              <HiOutlineCheckCircle />
              <span>{status.label}</span>
            </p>
            <p className="shared-book-card__detail">
              <HiOutlineLocationMarker />
              <span>{locationText}</span>
            </p>
            <p className="shared-book-card__detail availability-line">
              <HiOutlineBookOpen />
              <span>{disponiveis}/{totalExemplares} disponíveis</span>
            </p>
            {(emprestados > 0 || reservados > 0) && (
              <p className="shared-book-card__detail loan-line">
                <HiOutlineClock />
                <span>
                  {emprestados} emprestado(s)
                  {reservados > 0 ? ` - ${reservados} reservado(s)` : ""}
                </span>
              </p>
            )}
          </div>
        </div>

        {(isAdmin || onRequestLoan || isComunidade) && (
          <div className="shared-book-card__actions">
            {onRequestLoan && (
              <button
                type="button"
                className={`shared-book-card__button ${
                  jasolicitado
                    ? "shared-book-card__button--requested"
                    : "shared-book-card__button--request"
                }`}
                onClick={() => !jasolicitado && !solicitando && onRequestLoan(book)}
                disabled={jasolicitado || solicitando}
                aria-label={`Solicitar empréstimo de ${titulo}`}
              >
                <HiOutlineBookOpen />
                <span>
                  {jasolicitado ? "Já Solicitado" : solicitando ? "Enviando…" : "Solicitar Empréstimo"}
                </span>
              </button>
            )}

            {isComunidade && (
              <p className="shared-book-card__community-hint">
                Para solicitar este livro, entre em contato com a biblioteca.
              </p>
            )}

            {isAdmin && (
              <>
                <button
                  type="button"
                  className="shared-book-card__button shared-book-card__button--edit"
                  onClick={() => onEdit && onEdit(book)}
                >
                  <HiOutlinePencil />
                  <span>Editar</span>
                </button>
                {onViewFicha && (
                  <button
                    type="button"
                    className="shared-book-card__button shared-book-card__button--ficha"
                    onClick={() => onViewFicha(book)}
                    title="Ver ficha catalográfica"
                  >
                    <HiOutlineDocumentText />
                    <span>Ficha</span>
                  </button>
                )}
                <button
                  type="button"
                  className={`shared-book-card__button ${
                    book?.livAtivo === false
                      ? "shared-book-card__button--reactivate"
                      : "shared-book-card__button--deactivate"
                  }`}
                  onClick={() => onToggleStatus && onToggleStatus(book)}
                >
                  {book?.livAtivo === false ? <HiOutlineRefresh /> : <HiOutlineXCircle />}
                  <span>{book?.livAtivo === false ? "Reativar" : "Desativar"}</span>
                </button>
                <button
                  type="button"
                  className="shared-book-card__button shared-book-card__button--delete"
                  onClick={() => onDelete && onDelete(book)}
                  title="Excluir permanentemente (só é possível sem histórico de empréstimos)"
                >
                  <HiOutlineTrash />
                  <span>Excluir</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}