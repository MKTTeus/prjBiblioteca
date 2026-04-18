import React, { useEffect, useState } from "react";
import { HiCheckCircle, HiXCircle } from "react-icons/hi";

const iconMap = {
  success: HiCheckCircle,
  error: HiXCircle,
};

function ToastItem({ toast, onRemove }) {
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    const closeTimer = setTimeout(() => setIsClosing(true), toast.duration - 250);
    const removeTimer = setTimeout(() => onRemove(toast.id), toast.duration);
    return () => {
      clearTimeout(closeTimer);
      clearTimeout(removeTimer);
    };
  }, [toast, onRemove]);

  const Icon = iconMap[toast.type] || HiCheckCircle;

  return (
    <div className={`toast toast--${toast.type} ${isClosing ? "toast--closing" : ""}`}>
      <div className="toast__icon">
        <Icon />
      </div>
      <div className="toast__body">
        <p>{toast.message}</p>
      </div>
      <button type="button" className="toast__close" onClick={() => onRemove(toast.id)} aria-label="Fechar notificação">
        ×
      </button>
    </div>
  );
}

export default function ToastContainer({ toasts, onRemove }) {
  return (
    <div className="toast-container" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}
