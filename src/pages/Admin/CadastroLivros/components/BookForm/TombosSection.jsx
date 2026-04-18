import React from "react";
import { HiOutlineBookOpen, HiOutlinePlusCircle } from "react-icons/hi";

const STATUS_OPTIONS = [
  "Disponível",
  "Emprestado",
  "Indisponível",
  "Tombo Fixo",
  "Reservado",
];

export default function TombosSection({
  bookTitle,
  isEditing,
  exemplares,
  addConfig,
  onExemplarChange,
  onAddConfigChange,
}) {
  const hasPendingNewCopies = Number(addConfig.quantidade || 0) > 0;

  if (!isEditing) {
    return (
      <div className="editor-section-grid tombos-grid-layout">
        <div className="tombos-panel">
          <div className="tombos-panel-header">
            <div>
              <h3>Geração inicial de tombos</h3>
              <p>Defina o prefixo e a quantidade para criar os exemplares junto com o novo livro.</p>
            </div>
          </div>

          <div className="editor-field-grid two-columns compact-grid">
            <label className="editor-field">
              <span>Prefixo</span>
              <input
                value={addConfig.prefixo}
                onChange={(e) => onAddConfigChange("prefixo", e.target.value)}
                placeholder="Ex.: L"
              />
            </label>

            <label className="editor-field">
              <span>Quantidade</span>
              <input
                type="number"
                min="1"
                max="500"
                value={addConfig.quantidade}
                onChange={(e) => onAddConfigChange("quantidade", e.target.value)}
              />
            </label>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="editor-section-grid tombos-grid-layout">
      <div className="tombos-panel">
        <div className="tombos-panel-header">
          <div>
            <h3>Livro: {bookTitle || "Sem título"}</h3>
            <p>Edite os exemplares deste livro e adicione novos tombos quando necessário.</p>
          </div>

          <div className="add-tombo-toolbar">
            <label className="editor-field compact-field">
              <span>Prefixo</span>
              <input
                value={addConfig.prefixo}
                onChange={(e) => onAddConfigChange("prefixo", e.target.value)}
                placeholder="Ex.: L"
              />
            </label>

            <label className="editor-field compact-field">
              <span>Qtd.</span>
              <input
                type="number"
                min="0"
                max="50"
                value={addConfig.quantidade}
                onChange={(e) => onAddConfigChange("quantidade", e.target.value)}
              />
            </label>

            <div className="add-tombo-badge">
              <HiOutlinePlusCircle />
              <span>
                {hasPendingNewCopies
                  ? "Novo lote será criado ao salvar"
                  : "Nenhum novo tombo será criado"}
              </span>
            </div>
          </div>
        </div>

        <div className="tombos-summary-bar">
          <div>
            <strong>{exemplares.length}</strong>
            <span>Total</span>
          </div>
          <div>
            <strong>
              {exemplares.filter((ex) => String(ex.exeLivStatus || "").toLowerCase().includes("dispon")).length}
            </strong>
            <span>Disponíveis</span>
          </div>
          <div>
            <strong>
              {exemplares.filter((ex) => String(ex.exeLivStatus || "").toLowerCase().includes("emprest")).length}
            </strong>
            <span>Emprestados</span>
          </div>
        </div>

        <div className="tombos-list">
          {exemplares.length === 0 ? (
            <div className="empty-tombos-state">
              <HiOutlineBookOpen />
              <span>Nenhum exemplar carregado para este livro.</span>
            </div>
          ) : (
            exemplares.map((ex) => (
              <div key={ex.idExemplar} className="tombo-editor-card">
                <label className="editor-field compact-field">
                  <span>Número do tombo</span>
                  <input
                    value={ex.exeLivTombo || ""}
                    onChange={(e) => onExemplarChange(ex.idExemplar, "exeLivTombo", e.target.value)}
                  />
                </label>

                <label className="editor-field compact-field">
                  <span>Status</span>
                  <select
                    value={ex.exeLivStatus || "Disponível"}
                    onChange={(e) => onExemplarChange(ex.idExemplar, "exeLivStatus", e.target.value)}
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="editor-field grow-field">
                  <span>Descrição</span>
                  <input
                    value={ex.exeLivDescricao || ""}
                    onChange={(e) => onExemplarChange(ex.idExemplar, "exeLivDescricao", e.target.value)}
                    placeholder="Observações do exemplar"
                  />
                </label>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
