import React, { useEffect, useState } from "react";
import { HiOutlineX } from "react-icons/hi";
import LoadingButton from "../../../../../../components/LoadingButton/LoadingButton";
import "../../../../../../components/ConfirmModal/ConfirmModal.css";
import "./AutorModal.css";

const EMPTY = {
  autNome: "",
  autABNT: "",
  autAnoNascimento: "",
  autAnoFalecimento: "",
};

export default function AutorModal({ show, autorToEdit, onClose, onSave, saving }) {
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (show) {
      setForm(
        autorToEdit
          ? {
              autNome: autorToEdit.autNome || "",
              autABNT: autorToEdit.autABNT || "",
              autAnoNascimento: autorToEdit.autAnoNascimento ?? "",
              autAnoFalecimento: autorToEdit.autAnoFalecimento ?? "",
            }
          : EMPTY
      );
    }
  }, [show, autorToEdit]);

  if (!show) return null;

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit() {
    if (!form.autNome.trim()) return;
    onSave({
      autNome: form.autNome.trim(),
      autABNT: form.autABNT.trim() || null,
      autAnoNascimento: form.autAnoNascimento ? Number(form.autAnoNascimento) : null,
      autAnoFalecimento: form.autAnoFalecimento ? Number(form.autAnoFalecimento) : null,
    });
  }

  return (
    <div className="autor-modal-overlay" onClick={saving ? undefined : onClose}>
      <div className="autor-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="autor-modal-header">
          <h2>{autorToEdit ? "Editar Autor" : "Novo Autor"}</h2>
          <button
            type="button"
            className="autor-modal-close"
            onClick={onClose}
            disabled={saving}
            aria-label="Fechar"
          >
            <HiOutlineX />
          </button>
        </div>

        <div className="autor-modal-body">
          <label className="autor-modal-field">
            <span>Nome *</span>
            <input
              name="autNome"
              value={form.autNome}
              onChange={handleChange}
              placeholder="Nome do autor"
              autoFocus
            />
          </label>

          <label className="autor-modal-field">
            <span>Nome ABNT</span>
            <input
              name="autABNT"
              value={form.autABNT}
              onChange={handleChange}
              placeholder="Ex.: SOBRENOME, Nome"
            />
          </label>

          <div className="autor-modal-field-row">
            <label className="autor-modal-field">
              <span>Ano de nascimento</span>
              <input
                type="number"
                name="autAnoNascimento"
                value={form.autAnoNascimento}
                onChange={handleChange}
                placeholder="Ex.: 1899"
              />
            </label>

            <label className="autor-modal-field">
              <span>Ano de falecimento</span>
              <input
                type="number"
                name="autAnoFalecimento"
                value={form.autAnoFalecimento}
                onChange={handleChange}
                placeholder="Deixe em branco se vivo"
              />
            </label>
          </div>
        </div>

        <div className="autor-modal-actions">
          <button type="button" className="confirm-modal-btn cancel" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <LoadingButton
            type="button"
            className="confirm-modal-btn confirm"
            loading={saving}
            loadingText="Salvando..."
            disabled={!form.autNome.trim()}
            onClick={handleSubmit}
          >
            {autorToEdit ? "Salvar Alterações" : "Criar Autor"}
          </LoadingButton>
        </div>
      </div>
    </div>
  );
}
