import React, { createContext, useCallback, useContext, useState } from "react";
import ToastContainer from "../components/Toast/ToastProvider";
import "../components/Toast/Toast.css";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((previousToasts) => previousToasts.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback((message, type = "success", duration = 4500) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((previousToasts) => [...previousToasts, { id, message, type, duration }]);
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }

  return context;
}
