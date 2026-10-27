import React from "react";
import { BookOpen, CircleCheck, CircleSlash, Pencil, Trash2 } from "lucide-react";
import { UserAvatar, UserStatus, UserProfile } from "./UserIdentity";
import "./MobileUserCard.css";

export default function MobileUserCard({
  name, identifier, email, profile, status, fields = [], books,
  selected, onSelect, onEdit, onToggleStatus, onDelete,
}) {
  const active = status === "Ativo";

  return (
    <article className={`mobile-user-card${selected ? " mobile-user-card--selected" : ""}`}>
      <div className="mobile-user-card__header">
        <input className="mobile-user-card__checkbox" type="checkbox"
          checked={selected} onChange={onSelect} aria-label={`Selecionar ${name}`} />
        <UserAvatar name={name} className="mobile-user-card__avatar" />
        <div className="mobile-user-card__identity">
          <strong>{name}</strong>
          {email && <span>{email}</span>}
          {!email && identifier && <span>{identifier}</span>}
        </div>
      </div>
      <div className="mobile-user-card__summary">
        {identifier && email && <span className="mobile-user-card__meta">{identifier}</span>}
        {profile && <UserProfile profile={profile} />}
        <UserStatus status={status} />
        {fields.map(({ label, value }) => (
          <span className="mobile-user-card__meta" key={label}>
            <span>{label}:</span> {value || "—"}
          </span>
        ))}
        {books != null && (
          <span className="mobile-user-card__meta">
            <BookOpen size={14} aria-hidden="true" /> {books} {books === 1 ? "livro" : "livros"}
          </span>
        )}
      </div>
      <div className="mobile-user-card__actions">
        <button type="button" className="mobile-user-card__action mobile-user-card__action--toggle"
          onClick={onToggleStatus} title={active ? "Inativar" : "Ativar"} aria-label={`${active ? "Inativar" : "Ativar"} ${name}`}>
          {active ? <CircleSlash size={17} aria-hidden="true" /> : <CircleCheck size={17} aria-hidden="true" />}
        </button>
        <button type="button" className="mobile-user-card__action mobile-user-card__action--edit"
          onClick={onEdit} title="Editar" aria-label={`Editar ${name}`}>
          <Pencil size={17} aria-hidden="true" />
        </button>
        <button type="button" className="mobile-user-card__action mobile-user-card__action--delete"
          onClick={onDelete} title="Excluir" aria-label={`Excluir ${name}`}>
          <Trash2 size={17} aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}
