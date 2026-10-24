import React from "react";
import { BookOpen, CircleCheck, CircleSlash, Pencil, Trash2, UserRound } from "lucide-react";
import "./MobileUserCard.css";

export default function MobileUserCard({ name, identifier, status, fields, books, selected, onSelect, onEdit, onToggleStatus, onDelete }) {
  const active = status === "Ativo";

  return (
    <article className={`mobile-user-card${selected ? " mobile-user-card--selected" : ""}`}>
      <div className="mobile-user-card__header">
        <input
          className="mobile-user-card__checkbox"
          type="checkbox"
          checked={selected}
          onChange={onSelect}
          aria-label={`Selecionar ${name}`}
        />
        <span className="mobile-user-card__avatar" aria-hidden="true"><UserRound size={23} strokeWidth={1.8} /></span>
        <div className="mobile-user-card__identity">
          <strong>{name}</strong>
          <span>{identifier}</span>
        </div>
        <span className={`mobile-user-card__status ${active ? "mobile-user-card__status--active" : "mobile-user-card__status--inactive"}`}>
          <span className="mobile-user-card__status-dot" aria-hidden="true" />{status}
        </span>
      </div>

      <div className="mobile-user-card__details">
        {fields.map(({ label, value, wide }) => (
          <div className={`mobile-user-card__field${wide ? " mobile-user-card__field--wide" : ""}`} key={label}>
            <span>{label}</span>
            <strong>{value || "—"}</strong>
          </div>
        ))}
      </div>

      {books != null && (
        <div className="mobile-user-card__books"><BookOpen size={19} aria-hidden="true" />
          <span>{books} {books === 1 ? "livro" : "livros"} em circulação</span>
        </div>
      )}

      <div className="mobile-user-card__actions">
        <button type="button" className="mobile-user-card__action mobile-user-card__action--edit" onClick={onEdit} aria-label={`Editar ${name}`}>
          <Pencil size={18} aria-hidden="true" />Editar
        </button>
        <button type="button" className="mobile-user-card__action mobile-user-card__action--toggle" onClick={onToggleStatus} aria-label={`${active ? "Inativar" : "Ativar"} ${name}`}>
          {active ? <CircleSlash size={18} aria-hidden="true" /> : <CircleCheck size={18} aria-hidden="true" />}
          {active ? "Inativar" : "Ativar"}
        </button>
        <button type="button" className="mobile-user-card__action mobile-user-card__action--delete" onClick={onDelete} aria-label={`Excluir ${name}`}>
          <Trash2 size={18} aria-hidden="true" />Excluir
        </button>
      </div>
    </article>
  );
}
