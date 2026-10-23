import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import "./Modal.css";
import useDialogFocus from "../../hooks/useDialogFocus";

const EXIT_DURATION_MS = 200;

const Modal = ({ show, onClose, children, className = "", ariaLabel = "Janela de diálogo" }) => {
  const [mounted, setMounted] = useState(false);
  const [exiting, setExiting] = useState(false);
  const dialogRef = useDialogFocus(show, onClose);

  // Controla montagem/desmontagem do portal com animação de saída.
  useEffect(() => {
    if (show) {
      setExiting(false);
      setMounted(true);
      document.body.style.overflow = "hidden";
      return undefined;
    }

    if (!mounted) return undefined;

    setExiting(true);
    const timer = setTimeout(() => {
      setMounted(false);
      setExiting(false);
      document.body.style.overflow = "";
    }, EXIT_DURATION_MS);

    return () => clearTimeout(timer);
  }, [show, mounted]);

  // Garante que o scroll do body seja liberado se o componente for desmontado aberto.
  useEffect(() => {
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Fechado e já desmontado: não renderiza nada.
  if (!show && !mounted) return null;

  const modalContent = (
    <div
      className={`modal-overlay${exiting ? " exiting" : ""}`}
      onClick={(e) => (e.target === e.currentTarget ? onClose() : null)}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={`modal-content ${className}`.trim() + (exiting ? " exiting" : "")}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="close-btn" onClick={onClose} aria-label="Fechar">
          ×
        </button>
        {children}
      </div>
    </div>
  );

  // Renderiza no body para evitar problemas de z-index/stacking context
  return createPortal(modalContent, document.body);
};

export default Modal;
