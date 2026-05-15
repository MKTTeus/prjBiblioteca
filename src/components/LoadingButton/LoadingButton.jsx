import React from "react";
import "./LoadingButton.css";

export default function LoadingButton({
  children,
  loading = false,
  isLoading = false,
  disabled = false,
  loadingText = "Aguarde...",
  className = "",
  type = "button",
  onClick,
  ariaLabel,
  ...props
}) {
  const activeLoading = loading || isLoading;

  return (
    <button
      type={type}
      className={`loading-button ${className}`.trim()}
      disabled={disabled || activeLoading}
      onClick={onClick}
      aria-label={ariaLabel}
      {...props}
    >
      {activeLoading ? loadingText : children}
    </button>
  );
}