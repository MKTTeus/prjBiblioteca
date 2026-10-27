import React, { useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { UserRoundPlus, X, Save, UserRound, GraduationCap, ShieldCheck, Eye, EyeOff } from "lucide-react";
import LoadingButton from "../LoadingButton/LoadingButton";
import useDialogFocus from "../../hooks/useDialogFocus";
import "./PessoaModal.css";

const icons = { aluno: GraduationCap, comunidade: UserRound, admin: ShieldCheck };

export function PessoaSection({ icon: Icon, title, children }) {
  return (
    <section className="person-section">
      <h3 className="person-section-title">
        <span className="person-section-icon"><Icon aria-hidden="true" size={17} /></span>
        {title}
      </h3>
      <div className="person-fields">{children}</div>
    </section>
  );
}

export function PessoaField({ title, children, className = "" }) {
  return (
    <label className={`person-field ${className}`.trim()}>
      <span className="person-field-label">{title}</span>
      {children}
    </label>
  );
}

export function PessoaPassword({ value, onChange, disabled, invalid }) {
  const [visible, setVisible] = React.useState(false);
  return (
    <span className="person-password">
      <input type={visible ? "text" : "password"} name="senha"
        aria-invalid={Boolean(invalid)} value={value || ""} onChange={onChange}
        disabled={disabled} minLength={disabled ? undefined : 8}
        autoComplete="new-password"
        placeholder={disabled ? "Senha bloqueada durante a edição" : "Mínimo de 8 caracteres"} />
      <button type="button" className="person-password-toggle"
        onClick={() => setVisible((state) => !state)} disabled={disabled}
        aria-label={visible ? "Ocultar senha" : "Mostrar senha"}>
        {visible ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
      </button>
    </span>
  );
}

export default function PessoaModal({
  aberto, tipo, modalClassName = "", titulo, descricao, modoEdicao,
  isProcessing, isDirty, onClose, onSave, errors = {}, children,
}) {
  const titleId = useId();
  const Icon = icons[tipo] || UserRoundPlus;
  const ref = useDialogFocus(aberto, onClose);

  useEffect(() => {
    if (!aberto) return undefined;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = overflow; };
  }, [aberto]);

  if (!aberto) return null;

  const messages = Object.entries(errors).filter(([, message]) => Boolean(message));
  return createPortal(
    <div className="modal-overlay person-editor-overlay" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId}
        className={`editor-modal-container person-editor-modal ${modalClassName}`.trim()}>
        <header className="person-editor-header">
          <span className="person-editor-symbol"><Icon size={23} aria-hidden="true" /></span>
          <div className="person-editor-heading">
            <h2 id={titleId}>{titulo}</h2>
            <p>{descricao}</p>
          </div>
          <button className="person-close" type="button" onClick={onClose} aria-label="Fechar cadastro">
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <div className="person-editor-scroll">
          {messages.length > 0 && (
            <div className="person-editor-errors" role="alert">
              <strong>Revise os campos destacados:</strong>
              <ul>{messages.map(([name, message]) => <li key={name}>{message}</li>)}</ul>
            </div>
          )}
          <div className="person-editor-sections">{children}</div>
        </div>
        <footer className="person-editor-footer">
          <span className="person-editor-hint">* Campos obrigatórios</span>
          <div className="person-editor-actions">
            <button type="button" className="person-cancel" onClick={onClose} disabled={isProcessing}>Cancelar</button>
            <LoadingButton type="button" className="person-save" onClick={onSave}
              isLoading={isProcessing} loadingText="Processando..." disabled={modoEdicao && !isDirty}>
              <Save size={16} aria-hidden="true" />
              {modoEdicao ? "Salvar alterações" : tipo === "admin" ? "Cadastrar administrador" : tipo === "comunidade" ? "Cadastrar membro" : "Cadastrar aluno"}
            </LoadingButton>
          </div>
        </footer>
      </div>
    </div>,
    document.body
  );
}
