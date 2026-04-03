import React from "react";
import { HiOutlineBookOpen, HiOutlineOfficeBuilding } from "react-icons/hi";

export default function PublicationInfoSection({ form, onFieldChange }) {
  return (
    <div className="editor-section-grid publication-grid">
      <div className="editor-form-panel publication-panel">
        <div className="editor-field-grid three-columns">
          <label className="editor-field">
            <span>Editora</span>
            <input
              name="livEditora"
              value={form.livEditora}
              onChange={(e) => onFieldChange("livEditora", e.target.value)}
              placeholder="Nome da editora"
            />
          </label>

          <label className="editor-field">
            <span>Ano de publicação</span>
            <input
              name="livAnoPublicacao"
              value={form.livAnoPublicacao}
              onChange={(e) => onFieldChange("livAnoPublicacao", e.target.value)}
              placeholder="Ex.: 2024"
            />
          </label>

          <label className="editor-field">
            <span>Páginas</span>
            <input
              name="livPaginas"
              value={form.livPaginas}
              onChange={(e) => onFieldChange("livPaginas", e.target.value)}
              placeholder="Quantidade de páginas"
              type="number"
              min="0"
            />
          </label>
        </div>

        <div className="publication-highlight-grid">
          <div className="publication-highlight-card">
            <HiOutlineOfficeBuilding />
            <div>
              <strong>Dados editoriais</strong>
              <p>Mantenha editora, ano e volume atualizados para facilitar buscas e a catalogação.</p>
            </div>
          </div>

          <div className="publication-highlight-card">
            <HiOutlineBookOpen />
            <div>
              <strong>Leitura rápida</strong>
              <p>Use o campo de páginas para apoiar empréstimos, recomendações e relatórios do acervo.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
