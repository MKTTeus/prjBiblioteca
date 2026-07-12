import React, { useState } from "react";
import "../../../../../components/ConfirmModal/ConfirmModal.css";
import LoadingButton from "../../../../../components/LoadingButton/LoadingButton";

/**
 * MergeModal
 *
 * Exibido quando o administrador tenta excluir uma categoria/gênero/autor
 * que ainda está vinculado a livros. Em vez de bloquear a exclusão, oferece
 * a opção de transferir ("mesclar") todos os livros para outro item já
 * existente e, em seguida, excluir o item original.
 *
 * Props:
 *   show        — boolean
 *   itemNome    — nome do item que está sendo excluído
 *   totalLivros — quantidade de livros vinculados
 *   opcoes      — [{ id, nome }] itens que podem receber os livros
 *   onCancel    — () => void
 *   onConfirm   — async (idDestino: number) => void
 *   confirming  — boolean
 */
export default function MergeModal({
  show,
  itemNome,
  totalLivros = 0,
  opcoes = [],
  onCancel,
  onConfirm,
  confirming = false,
}) {
  const [destino, setDestino] = useState("");

  if (!show) return null;

  function handleConfirm() {
    if (!destino) return;
    onConfirm(Number(destino));
  }

  return (
    <div
      className="confirm-modal-overlay"
      onClick={confirming ? undefined : onCancel}
      role="dialog"
      aria-modal="true"
    >
      <div className="confirm-modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="confirm-modal-body">
          <h2>Não é possível excluir diretamente</h2>
          <div className="confirm-modal-message">
            <p>
              "{itemNome}" está vinculado a <strong>{totalLivros}</strong>{" "}
              {totalLivros === 1 ? "livro" : "livros"}. Deseja transferir todos eles para outro
              item antes de excluir "{itemNome}"?
            </p>

            <label style={{ display: "block", marginTop: 12 }}>
              <span style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>
                Transferir livros para:
              </span>
              <select
                value={destino}
                onChange={(e) => setDestino(e.target.value)}
                disabled={confirming}
              >
                <option value="">— selecione —</option>
                {opcoes.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nome}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="confirm-modal-warning">
            Essa ação não poderá ser desfeita: os livros passarão a apontar para o item escolhido
            e "{itemNome}" será excluído.
          </p>
        </div>
        <div className="confirm-modal-actions">
          <button
            type="button"
            className="confirm-modal-btn cancel"
            onClick={onCancel}
            disabled={confirming}
          >
            Cancelar
          </button>
          <LoadingButton
            type="button"
            className="confirm-modal-btn confirm"
            loading={confirming}
            loadingText="Mesclando..."
            disabled={!destino}
            onClick={handleConfirm}
          >
            Mesclar e excluir
          </LoadingButton>
        </div>
      </div>
    </div>
  );
}
