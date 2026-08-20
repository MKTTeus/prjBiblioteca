import React, { useEffect, useState } from "react";
import { FiInfo, FiX } from "react-icons/fi";
import "./NoticeBanner.css";

const STORAGE_PREFIX = "noticeBannerDismissed:";

/**
 * NoticeBanner
 *
 * Aviso dispensável para comunicar mudanças temporárias no sistema (ex.:
 * remoção/alteração de uma funcionalidade) sem precisar de um changelog
 * completo. Uma vez fechado pelo usuário, não aparece mais para ele
 * (localStorage). Passado o `expiresAt`, some para todo mundo — assim o
 * aviso realmente é temporário, sem depender de alguém lembrar de tirá-lo
 * do código depois.
 *
 * Para lançar um novo aviso, basta trocar o `id` (isso reresolve
 * automaticamente pra quem já tinha fechado um aviso anterior).
 *
 * Props:
 *   id        — identificador único do aviso (chave no localStorage)
 *   message   — texto exibido
 *   expiresAt — string de data ("2026-09-30") a partir da qual o aviso
 *               para de ser exibido, mesmo para quem nunca o viu
 *   tone      — "info" | "warning" (cor do banner)
 */
export default function NoticeBanner({ id, message, expiresAt, tone = "info" }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (expiresAt && new Date() > new Date(expiresAt)) {
      setVisible(false);
      return;
    }
    try {
      const jaFechado = localStorage.getItem(`${STORAGE_PREFIX}${id}`);
      setVisible(!jaFechado);
    } catch (_) {
      // localStorage indisponível (modo privado, etc.) — mostra mesmo assim
      setVisible(true);
    }
  }, [id, expiresAt]);

  if (!visible) return null;

  function handleDismiss() {
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${id}`, "1");
    } catch (_) {
      // ignora falha de storage — só não vai persistir entre sessões
    }
    setVisible(false);
  }

  return (
    <div className={`notice-banner notice-banner--${tone}`} role="status">
      <FiInfo className="notice-banner-icon" />
      <p className="notice-banner-text">{message}</p>
      <button
        type="button"
        className="notice-banner-close"
        onClick={handleDismiss}
        aria-label="Fechar aviso"
      >
        <FiX />
      </button>
    </div>
  );
}
