import React, { useEffect, useRef, useState } from "react";
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
  HiOutlineShoppingCart,
  HiOutlineMinus,
  HiOutlinePlus,
  HiOutlineDotsVertical,
  HiOutlineArrowsExpand,
} from "react-icons/hi";
import Modal from "../Modal/Modal";
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
    return { label: Number(book?.exemplares_cadastrados ?? 0) > 0 ? "Exemplares desativados" : "Sem exemplares", className: "indisponivel" };
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

export default function BookCard({
  book,
  genreName,
  coverLoading = "lazy",
  isAdmin = false,
  onEdit,
  onDelete,
  onToggleStatus,
  onViewFicha,
  onRequestLoan,
  statusSolicitacao = null,
  solicitando = false,
  isComunidade = false,
  allowCoverPreview = false,
  openDetailsOnCard = false,
  // ── Modo carrinho (usado pelo professor ao montar um empréstimo) ──
  cartMode = false,
  pendingQuantity = 0,
  onPendingQuantityChange,
  onAddToCart,
  cartQuantity = 0,
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
  const tags = [genreName || book?.genero].filter(Boolean);
  const [mostrarDescricao, setMostrarDescricao] = useState(false);
  const [mostrarCapa, setMostrarCapa] = useState(false);
  const adminMenuRef = useRef(null);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" && Boolean(window.matchMedia?.("(max-width: 640px)").matches)
  );

  useEffect(() => {
    if (!isAdmin || !window.matchMedia) return;
    const query = window.matchMedia("(max-width: 640px)");
    const update = () => {
      setIsMobile(query.matches);
      setAdminMenuOpen(false);
    };
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin || !isMobile || !adminMenuOpen) return;
    const positionMenu = () => {
      const menu = adminMenuRef.current;
      if (!menu?.open) return;
      const trigger = menu.querySelector("summary").getBoundingClientRect();
      const items = menu.querySelector(".shared-book-card__admin-menu-items");
      const below = window.innerHeight - trigger.bottom - 12;
      const above = trigger.top - 12;
      const openAbove = below < items.scrollHeight && above > below;
      menu.dataset.placement = openAbove ? "above" : "below";
      items.style.maxHeight = `${Math.min(280, Math.max(44, (openAbove ? above : below) - 6))}px`;
    };
    positionMenu();
    window.addEventListener("resize", positionMenu);
    document.addEventListener("scroll", positionMenu, true);
    const closeOutside = (event) => {
      const menu = adminMenuRef.current;
      if (menu?.open && !menu.contains(event.target)) menu.open = false;
    };
    const closeOnEscape = (event) => {
      const menu = adminMenuRef.current;
      if (event.key === "Escape" && menu?.open) {
        menu.open = false;
        menu.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("resize", positionMenu);
      document.removeEventListener("scroll", positionMenu, true);
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isAdmin, isMobile, adminMenuOpen]);

  const REQUEST_STATUS_LABEL = {
    pendente: "Solicitado — Aguardando aprovação",
    aprovado: "Aprovado — Faça a retirada do exemplar",
    ativo: "Empréstimo ativo",
  };
  const jasolicitado = Boolean(statusSolicitacao);
  const botaoLabel = solicitando
    ? "Enviando…"
    : statusSolicitacao
    ? REQUEST_STATUS_LABEL[statusSolicitacao] || "Já Solicitado"
    : "Solicitar Empréstimo";

  // Disponível apenas para o catálogo do usuário no mobile. Botões, links
  // e os portais dos modais não disparam a abertura da descrição por engano.
  const handleCardTap = (event) => {
    if (!openDetailsOnCard || !window.matchMedia?.("(max-width: 768px)").matches) return;
    if (event.target.closest("button, a, input, select, textarea, summary, [role='button'], .modal-overlay")) return;
    setMostrarDescricao(true);
  };

  const adminActions = isAdmin ? (
    <>
      <button
        type="button"
        className="shared-book-card__button shared-book-card__button--edit"
        onClick={() => onEdit && onEdit(book)}
      >
        <HiOutlinePencil />
        <span>{totalExemplares === 0 ? "Corrigir exemplares" : "Editar"}</span>
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
  ) : null;

  return (
    <div
      className={`shared-book-card${openDetailsOnCard ? " shared-book-card--touch-details" : ""}`}
      onClick={openDetailsOnCard ? handleCardTap : undefined}
    >
      <div className="shared-book-card__media">
        <div className="shared-book-card__badges">
          <span className={`shared-book-card__status ${status.className}`}>{status.label}</span>
        </div>
        <img
          src={capa}
          alt={titulo}
          loading={coverLoading}
          decoding="async"
          onError={(e) => { e.target.src = "/placeholder.png"; }}
        />
        {(isAdmin || allowCoverPreview) && (
          <button type="button" className="shared-book-card__cover-open" onClick={() => setMostrarCapa(true)} aria-label={`Ver capa completa de ${titulo}`} title="Abrir capa sem cortes">
            <HiOutlineArrowsExpand aria-hidden="true" /> Ver capa
          </button>
        )}
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

          <div className="shared-book-card__description-wrap">
            <p className="shared-book-card__description">{descricao}</p>
            <button
              type="button"
              className="shared-book-card__desc-link"
              onClick={() => setMostrarDescricao(true)}
            >
              Ler descrição completa
            </button>
          </div>

          {tags.length > 0 && (
            <div className="shared-book-card__tags">
              {tags.map((tag) => <span key={tag}>{tag}</span>)}
            </div>
          )}

          <div className="shared-book-card__details">
            {isAdmin && totalExemplares === 0 && (
              <p className="shared-book-card__catalog-warning">
                Fora do acervo: {Number(book?.exemplares_cadastrados ?? 0) > 0 ? "reative ou cadastre um exemplar." : "cadastre um exemplar."}
              </p>
            )}
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

        {(isAdmin || onRequestLoan || isComunidade || cartMode) && (
          <div className="shared-book-card__actions">
            {cartMode && (
              <div className="shared-book-card__cart">
                {cartQuantity > 0 && (
                  <p className="shared-book-card__cart-current">
                    {cartQuantity} no carrinho
                  </p>
                )}
                <div className="shared-book-card__qty-row">
                  <button
                    type="button"
                    className="shared-book-card__qty-btn"
                    onClick={() => onPendingQuantityChange && onPendingQuantityChange(Math.max(0, pendingQuantity - 1))}
                    disabled={disponiveis <= 0 || pendingQuantity <= 0}
                    aria-label="Diminuir quantidade"
                  >
                    <HiOutlineMinus />
                  </button>
                  <span className="shared-book-card__qty-value">{pendingQuantity}</span>
                  <button
                    type="button"
                    className="shared-book-card__qty-btn"
                    onClick={() => onPendingQuantityChange && onPendingQuantityChange(Math.min(disponiveis, pendingQuantity + 1))}
                    disabled={disponiveis <= 0 || pendingQuantity >= disponiveis}
                    aria-label="Aumentar quantidade"
                  >
                    <HiOutlinePlus />
                  </button>
                </div>
                <button
                  type="button"
                  className="shared-book-card__button shared-book-card__button--request"
                  onClick={() => onAddToCart && pendingQuantity > 0 && onAddToCart(pendingQuantity)}
                  disabled={disponiveis <= 0 || pendingQuantity <= 0}
                >
                  <HiOutlineShoppingCart />
                  <span>{disponiveis <= 0 ? "Indisponível" : "Adicionar ao carrinho"}</span>
                </button>
              </div>
            )}

            {onRequestLoan && (
              <button
                type="button"
                className={`shared-book-card__button ${
                  jasolicitado
                    ? `shared-book-card__button--requested shared-book-card__button--${statusSolicitacao}`
                    : "shared-book-card__button--request"
                }`}
                onClick={() => !jasolicitado && !solicitando && onRequestLoan(book)}
                disabled={jasolicitado || solicitando}
                aria-label={`Solicitar empréstimo de ${titulo}`}
              >
                <HiOutlineBookOpen />
                <span>{botaoLabel}</span>
              </button>
            )}

            {isComunidade && (
              <p className="shared-book-card__community-hint">
                Para realizar o empréstimo, compareça à biblioteca da escola.
              </p>
            )}

            {isAdmin && (isMobile ? (
              <details ref={adminMenuRef} onToggle={(event) => setAdminMenuOpen(event.currentTarget.open)} className="shared-book-card__admin-menu">
                <summary aria-label={`Opções de ${titulo}`} title="Opções do livro"><HiOutlineDotsVertical /></summary>
                <div className="shared-book-card__admin-menu-items" onClick={(event) => {
                  if (event.target.closest("button")) adminMenuRef.current.open = false;
                }}>
                  {adminActions}
                </div>
              </details>
            ) : adminActions)}
          </div>
        )}
      </div>

      <Modal
        show={mostrarDescricao}
        onClose={() => setMostrarDescricao(false)}
        className={isAdmin ? "book-description-modal book-description-modal--admin" : "book-description-modal"}
      >
        {isAdmin ? (
          <div className="book-description-modal__admin-layout">
            <div className="book-description-modal__cover">
              <img src={capa} alt={`Capa de ${titulo}`} onError={(e) => { e.target.onerror = null; e.target.src = "/placeholder.png"; }} />
              <button type="button" onClick={() => { setMostrarDescricao(false); setMostrarCapa(true); }}>
                <HiOutlineArrowsExpand aria-hidden="true" /> Abrir capa
              </button>
            </div>
            <div className="book-description-modal__admin-info">
              <h3>{titulo}</h3>
              <p className="book-description-modal__author">{autor}</p>
              <p className="book-description-modal__meta"><HiOutlineCalendar /> {ano}{paginas ? ` · ${paginas} páginas` : ""}</p>
              <div className="book-description-modal__tags">{tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
              <div className="book-description-modal__divider" />
              <h4>Descrição</h4>
              <div className="book-description-modal__body"><p className="book-description-modal__text">{descricao}</p></div>
            </div>
          </div>
        ) : (<>
        <div className="book-description-modal__header">
          <img src={capa} alt={titulo} onError={(e) => { e.target.src = "/placeholder.png"; }} />
          <div className="book-description-modal__info">
            <h3>{titulo}</h3>
            <p className="book-description-modal__author">{autor}</p>
            <p className="book-description-modal__meta">
              <HiOutlineCalendar />
              <span>{ano}{paginas ? ` · ${paginas} págs.` : ""}</span>
            </p>
            {tags.length > 0 && (
              <div className="book-description-modal__tags">
                {tags.map((tag) => <span key={tag}>{tag}</span>)}
              </div>
            )}
          </div>
        </div>
        {allowCoverPreview && (
          <button type="button" className="book-description-modal__open-cover" onClick={() => { setMostrarDescricao(false); setMostrarCapa(true); }}>
            <HiOutlineArrowsExpand aria-hidden="true" /> Ver capa completa
          </button>
        )}
        <div className="book-description-modal__divider" />
        <div className="book-description-modal__body">
          <p className="book-description-modal__text">{descricao}</p>
        </div>
        </>)}
      </Modal>
      {(isAdmin || allowCoverPreview) && (
        <Modal show={mostrarCapa} onClose={() => setMostrarCapa(false)} className="book-cover-modal" ariaLabel={`Capa completa de ${titulo}`}>
          <figure className="book-cover-modal__figure">
            <img src={capa} alt={`Capa completa de ${titulo}`} onError={(e) => { e.target.onerror = null; e.target.src = "/placeholder.png"; }} />
            <figcaption>{titulo}</figcaption>
          </figure>
        </Modal>
      )}
    </div>
  );
}
