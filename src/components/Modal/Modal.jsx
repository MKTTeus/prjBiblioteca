import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import "./Modal.css";

const Modal = ({ show, onClose, children, className = "" }) => {
  const [mounted, setMounted] = useState(false);
  const [exiting, setExiting] = useState(false);

  // useEffect de montagem/desmontagem do portal.
  useEffect(() => {
    if (show) {
      setExiting(false);
      setMounted(true);
      document.body.style.overflow = "hidden";
    } else if (mounted && !show) {
      setExiting(true);
      setTimeout(() => {
        setMounted(false);
        setExiting(false);
        document.body.style.overflow = "";
      }, 200);
    }
  }, [show, mounted]);

  // Effect para fechamento com tecla Escape
  useEffect(() => {
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") onClose();
    });
    return () => document.removeEventListener("keydown", (e) => {
      if (e.key === "Escape") onClose();
    });
  }, [onClose]);

  // Sem early return que pule hooks - sempre renderizamos o portal.
  // A visibilidade é controlada por CSS/state, não por pular o retorno.
  const modalContent = (
    <div
      className={`modal-overlay${exiting ? " exiting" : ""}`}
      onClick={(e) => (e.target === e.currentTarget ? onClose() : null)}
      role="dialog"
      aria-modal="true"
    >
      <div
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