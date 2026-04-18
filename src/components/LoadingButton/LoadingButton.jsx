import React from "react";
import "./LoadingButton.css";

export default function LoadingButton({
  children,
  loading = false,
  disabled = false,
  loadingText = "Aguarde...",
  className = "",
  type = "button",
  onClick,
  ariaLabel,
  ...props
}) {
  return (
    <button
      type={type}
      className={`loading-button ${className}`.trim()}
      disabled={disabled || loading}
      onClick={onClick}
      aria-label={ariaLabel}
      {...props}
    >
      {loading ? loadingText : children}
    </button>
  );
}