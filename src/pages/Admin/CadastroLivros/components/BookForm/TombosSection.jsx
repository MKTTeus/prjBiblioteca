import React from "react";
import { HiOutlineBookOpen, HiOutlinePlusCircle } from "react-icons/hi";

const STATUS_OPTIONS = [
  "Disponível",
  "Emprestado",
  "Indisponível",
  "Tombo Fixo",
  "Reservado",
  "Desativado",
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
              <p>Cadastre pelo menos um exemplar para o livro aparecer no acervo.</p>
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
      <div className="tombos-panel tombos-panel--editing">
        <div className="tombos-editor-head">
          <div className="tombos-editor-head__intro">
            <h3>Livro: {bookTitle || "Sem título"}</h3>
            <p>Gerencie os tombos deste livro e acompanhe a situação dos exemplares.</p>
          </div>

          <div className="tombos-summary-bar" aria-label="Resumo dos exemplares">
            <div className="tombos-summary-bar__total">
              <strong>{exemplares.length}</strong>
              <span>Total</span>
            </div>
            <div className="tombos-summary-bar__available">
              <strong>
                {exemplares.filter((ex) => String(ex.exeLivStatus || "").toLowerCase().includes("dispon")).length}
              </strong>
              <span>Disponíveis</span>
            </div>
            <div className="tombos-summary-bar__loaned">
              <strong>
                {exemplares.filter((ex) => String(ex.exeLivStatus || "").toLowerCase().includes("emprest")).length}
              </strong>
              <span>Emprestados</span>
            </div>
          </div>
        </div>

        <div className="tombos-add-panel">
          <div className="tombos-add-panel__heading">
            <div className="tombos-add-panel__title">
              <HiOutlinePlusCircle aria-hidden="true" />
              <div>
                <h4>Adicionar novos exemplares</h4>
                <p>Informe o prefixo e a quantidade. Os novos tombos serão criados ao salvar o livro.</p>
              </div>
            </div>
            <div className={"add-tombo-badge" + (hasPendingNewCopies ? " add-tombo-badge--pending" : "")} role="status">
              <HiOutlinePlusCircle aria-hidden="true" />
              <span>
                {hasPendingNewCopies
                  ? "Novo lote será criado ao salvar"
                  : "Nenhum novo tombo será criado"}
              </span>
            </div>
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
              <span>Quantidade</span>
              <input
                type="number"
                min="0"
                max="50"
                value={addConfig.quantidade}
                onChange={(e) => onAddConfigChange("quantidade", e.target.value)}
              />
            </label>
          </div>
        </div>

        <div className="tombos-collection">
          <div className="tombos-collection__heading">
            <div>
              <h4><HiOutlineBookOpen aria-hidden="true" /> Exemplares cadastrados</h4>
              <p>Altere o número, o status ou as observações diretamente na lista.</p>
            </div>
            <span className="tombos-collection__count">
              {exemplares.length} {exemplares.length === 1 ? "exemplar" : "exemplares"}
            </span>
          </div>

          {exemplares.length === 0 ? (
            <div className="empty-tombos-state">
              <HiOutlineBookOpen aria-hidden="true" />
              <span>Nenhum exemplar cadastrado. Informe a quantidade acima e salve para adicioná-los.</span>
            </div>
          ) : (
            <>
              <div className="tombos-list-head" aria-hidden="true">
                <span>Nº</span>
                <span>Número do tombo</span>
                <span>Status</span>
                <span>Descrição / observações</span>
              </div>
              <div className="tombos-list">
                {exemplares.map((ex, index) => (
                  <div
                    key={ex.idExemplar}
                    className="tombo-editor-card"
                    data-status={ex.exeLivStatus || "Disponível"}
                  >
                    <span className="tombo-row-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>

                    <label className="editor-field compact-field">
                      <span className="tombo-row-field-label">Número do tombo</span>
                      <input
                        aria-label={"Número do tombo do exemplar " + (index + 1)}
                        value={ex.exeLivTombo || ""}
                        onChange={(e) => onExemplarChange(ex.idExemplar, "exeLivTombo", e.target.value)}
                      />
                    </label>

                    <label className="editor-field compact-field">
                      <span className="tombo-row-field-label">Status</span>
                      <select
                        aria-label={"Status do exemplar " + (index + 1)}
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
                      <span className="tombo-row-field-label">Descrição</span>
                      <input
                        aria-label={"Descrição do exemplar " + (index + 1)}
                        value={ex.exeLivDescricao || ""}
                        onChange={(e) => onExemplarChange(ex.idExemplar, "exeLivDescricao", e.target.value)}
                        placeholder="Observações do exemplar"
                      />
                    </label>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
