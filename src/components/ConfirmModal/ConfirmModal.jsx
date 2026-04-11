import React from "react";
import { HiOutlineExclamationCircle } from "react-icons/hi";
import "./ConfirmModal.css";

export default function ConfirmModal({ show, title, message, onConfirm, onCancel, confirmText = "Excluir", cancelText = "Cancelar" }) {
  if (!show) return null;

  return (
    <div className="confirm-modal-overlay" onClick={onCancel} role="dialog" aria-modal="true">
      <div className="confirm-modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="confirm-modal-icon">
          <HiOutlineExclamationCircle />
        </div>
        <div className="confirm-modal-body">
          <h2>{title}</h2>
          <p>{message}</p>
          <p className="confirm-modal-warning">Essa ação não poderá ser desfeita.</p>
        </div>
        <div className="confirm-modal-actions">
          <button type="button" className="confirm-modal-btn cancel" onClick={onCancel}>
            {cancelText}
          </button>
          <button type="button" className="confirm-modal-btn confirm" onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
