import React, { useId } from "react";
import { createPortal } from "react-dom";
import useDialogFocus from "../../../../../hooks/useDialogFocus";

function displayValue(value) {
  if (value === undefined || value === null || value === "") return "Em branco";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  return String(value);
}

export default function FieldSuggestionModal({ suggestion, fieldLabel, currentValue, onApply, onClose }) {
  const titleId = useId();
  const dialogRef = useDialogFocus(Boolean(suggestion), onClose);
  if (!suggestion) return null;

  return createPortal(
    <div className="field-suggestion-overlay" role="dialog" aria-modal="true" aria-labelledby={titleId} onClick={onClose}>
      <div className="field-suggestion-card" ref={dialogRef} tabIndex={-1} onClick={(event) => event.stopPropagation()}>
        <div className="field-suggestion-header">
          <div>
            <span className="field-suggestion-eyebrow">Sugestão individual</span>
            <h2 id={titleId}>Revisar {fieldLabel || "campo"}</h2>
            <p>Compare os valores antes de aplicar. Os outros campos ficam como estão.</p>
          </div>
          <button type="button" className="field-suggestion-close" aria-label="Fechar sugestão" onClick={onClose}>×</button>
        </div>
        <div className="field-suggestion-content">
          <section className="field-suggestion-panel field-suggestion-current">
            <h3>Valor atual</h3>
            <div className="field-suggestion-value">{displayValue(currentValue)}</div>
          </section>
          <section className="field-suggestion-panel field-suggestion-new">
            <h3>Nova sugestão</h3>
            <div className="field-suggestion-value">{displayValue(suggestion.value)}</div>
          </section>
        </div>
        <div className="field-suggestion-actions">
          <button type="button" className="field-suggestion-cancel" onClick={onClose}>Manter atual</button>
          <button type="button" className="field-suggestion-apply" onClick={onApply}>Aplicar sugestão</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
