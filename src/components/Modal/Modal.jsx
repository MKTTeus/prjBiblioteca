import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./Modal.css";

const Modal = ({ show, onClose, children, className = "" }) => {
  const [mounted, setMounted] = useState(false);
  const [exiting, setExiting] = useState(false);

  // Monta/desmonta no portal para evitar problemas de stacking context
  useEffect(() => {
    if (show) {
      setExiting(false);
      setMounted(true);
      // Previne scroll do body quando modal aberto
      document.body.style.overflow = "hidden";
    } else if (mounted) {
      // Inicia animação de saída
      setExiting(true);
      // Aguarda animação de saída antes de desmontar
      const timer = setTimeout(() => {
        setMounted(false);
        setExiting(false);
        document.body.style.overflow = "";
      }, 200); // mesmo tempo da animação CSS
      return () => clearTimeout(timer);
    }
  }, [show, mounted]);

  if (!mounted) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") onClose();
  };

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const modalContent = (
    <div className={`modal-overlay${exiting ? " exiting" : ""}`} onClick={handleOverlayClick} role="dialog" aria-modal="true">
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
