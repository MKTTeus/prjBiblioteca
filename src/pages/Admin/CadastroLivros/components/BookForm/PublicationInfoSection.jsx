import React from "react";
import { HiOutlineBookOpen, HiOutlineOfficeBuilding } from "react-icons/hi";
const IDIOMAS_COMUNS = ["Português", "Inglês", "Espanhol", "Francês", "Alemão", "Italiano", "Mandarim", "Japonês", "Russo", "Árabe", "Hindi", "Bengali", "Coreano", "Turco", "Vietnamita"];
const FAIXAS_ETARIAS = ["Infantil", "Juvenil", "Adulto", "Livre"];

export default function PublicationInfoSection({ form, onFieldChange, editoras = [] }) {
  return (
    <div className="editor-section-grid publication-grid">
      <div className="editor-form-panel publication-panel">
        <div className="editor-field-grid three-columns">
          {/* ── Editora ── */}
          <label className="editor-field">
            <span>Editora</span>
            <input
              name="livEditora"
              value={form.livEditora}
              onChange={(e) => onFieldChange("livEditora", e.target.value)}
              placeholder="Nome da editora (existente ou nova)"
              list="editoras-list"
              autoComplete="off"
            />
            <datalist id="editoras-list">
              {editoras.map((e) => (
                <option key={e.idEditora} value={e.ediNome} />
              ))}
            </datalist>
          </label>
          <label className="editor-field">
            <span>Cidade da Editora</span>
            <input
              name="ediCidade"
              value={form.ediCidade || ""}
              onChange={(e) => onFieldChange("ediCidade", e.target.value)}
              placeholder="Ex.: São Paulo"
            />
          </label>
          <label className="editor-field">
            <span>Estado / País da Editora</span>
            <input
              name="ediEstado"
              value={form.ediEstado || ""}
              onChange={(e) => onFieldChange("ediEstado", e.target.value)}
              placeholder="Ex.: SP"
            />
          </label>
          {/* ── Publicação ── */}
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
            <span>Páginas *</span>
            <input
              name="livPaginas"
              value={form.livPaginas}
              onChange={(e) => onFieldChange("livPaginas", e.target.value)}
              placeholder="Quantidade de páginas"
              type="number"
              min="1"
              required
            />
          </label>
          <label className="editor-field">
            <span>Edição</span>
            <input
              name="livEdicao"
              value={form.livEdicao || ""}
              onChange={(e) => onFieldChange("livEdicao", e.target.value)}
              placeholder="Ex.: 3"
              type="number"
              min="1"
            />
          </label>
          {/* ── Subtítulo / Idioma ── */}
          <label className="editor-field">
            <span>Subtítulo</span>
            <input
              name="livSubtitulo"
              value={form.livSubtitulo || ""}
              onChange={(e) => onFieldChange("livSubtitulo", e.target.value)}
              placeholder="Subtítulo do livro, se houver"
            />
          </label>
          <label className="editor-field">
            <span>Idioma</span>
            <input
              name="livIdioma"
              value={form.livIdioma || ""}
              onChange={(e) => onFieldChange("livIdioma", e.target.value)}
              placeholder="Ex.: Português"
              list="idiomas-list"
              autoComplete="off"
            />
            <datalist id="idiomas-list">
              {IDIOMAS_COMUNS.map((idioma) => (
                <option key={idioma} value={idioma} />
              ))}
            </datalist>
          </label>
          <label className="editor-field">
            <span>Faixa etária</span>
            <select
              name="livFaixaEtaria"
              value={form.livFaixaEtaria || ""}
              onChange={(e) => onFieldChange("livFaixaEtaria", e.target.value)}
            >
              <option value="">Não informada</option>
              {FAIXAS_ETARIAS.map((faixa) => (
                <option key={faixa} value={faixa}>{faixa}</option>
              ))}
            </select>
          </label>
          {/* ── Catalogação ── */}
          <label className="editor-field">
            <span>CDD {form.livCDDSugerida && <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontStyle: "italic" }}>(sugerida por IA)</span>}</span>
            <input
              name="livCDD"
              value={form.livCDD || ""}
              onChange={(e) => onFieldChange("livCDD", e.target.value)}
              placeholder="Ex.: 823.914"
            />
          </label>
          <label className="editor-field">
            <span>Altura (cm)</span>
            <input
              name="livAlturaCm"
              value={form.livAlturaCm || ""}
              onChange={(e) => onFieldChange("livAlturaCm", e.target.value)}
              placeholder="Ex.: 23"
              type="number"
              step="0.1"
              min="0"
            />
          </label>
          <label className="editor-field">
            <span>Largura (cm)</span>
            <input
              name="livLarguraCm"
              value={form.livLarguraCm || ""}
              onChange={(e) => onFieldChange("livLarguraCm", e.target.value)}
              placeholder="Ex.: 15"
              type="number"
              step="0.1"
              min="0"
            />
          </label>
          <label className="editor-field" style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: "10px", flexDirection: "row" }}>
            <input
              type="checkbox"
              id="livIlustrado"
              name="livIlustrado"
              checked={Boolean(form.livIlustrado)}
              onChange={(e) => onFieldChange("livIlustrado", e.target.checked)}
              style={{ width: "auto" }}
            />
            <span htmlFor="livIlustrado" style={{ margin: 0 }}>Livro ilustrado</span>
          </label>
          <label className="editor-field" style={{ gridColumn: "1 / -1" }}>
            <span>Palavras-chave</span>
            <input
              name="livPalavrasChave"
              value={form.livPalavrasChave || ""}
              onChange={(e) => onFieldChange("livPalavrasChave", e.target.value)}
              placeholder="Separe por vírgula — usadas na catalogação e busca"
            />
          </label>
        </div>
        <div className="publication-highlight-grid">
          <div className="publication-highlight-card">
            <HiOutlineOfficeBuilding />
            <div>
              <strong>Dados editoriais</strong>
              <p>Mantenha editora, cidade e ano atualizados para facilitar a geração da ficha catalográfica.</p>
            </div>
          </div>
          <div className="publication-highlight-card">
            <HiOutlineBookOpen />
            <div>
              <strong>Classificação CDD</strong>
              <p>Informe o CDD manualmente ou deixe em branco para a IA sugerir automaticamente ao gerar a ficha.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
