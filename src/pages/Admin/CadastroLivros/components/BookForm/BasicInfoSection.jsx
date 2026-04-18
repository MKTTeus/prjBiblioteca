import React from "react";
import { HiOutlinePhotograph, HiOutlineUpload } from "react-icons/hi";

export default function BasicInfoSection({
  form,
  categorias,
  generos,
  onFieldChange,
  onUpload,
}) {
  return (
    <div className="editor-section-grid basic-grid">
      <div className="editor-form-panel basic-column">
        <div className="basic-column-header">
          <span>Informações principais</span>
        </div>

        <div className="editor-field-grid basic-column-grid">
          <label className="editor-field">
            <span>Título</span>
            <input
              name="livTitulo"
              value={form.livTitulo}
              onChange={(e) => onFieldChange("livTitulo", e.target.value)}
              placeholder="Digite o título do livro"
              required
            />
          </label>

          <label className="editor-field">
            <span>Autor</span>
            <input
              name="livAutor"
              value={form.livAutor}
              onChange={(e) => onFieldChange("livAutor", e.target.value)}
              placeholder="Nome do autor"
            />
          </label>

          <label className="editor-field">
            <span>ISBN</span>
            <input
              name="exemplarISBN"
              value={form.exemplarISBN}
              onChange={(e) => onFieldChange("exemplarISBN", e.target.value)}
              placeholder="ISBN padrão dos exemplares"
            />
          </label>

          <label className="editor-field">
            <span>Gênero</span>
            <select
              name="idGenero"
              value={form.idGenero}
              onChange={(e) => onFieldChange("idGenero", e.target.value)}
            >
              {generos.map((gen) => (
                <option key={gen.idGenero} value={gen.idGenero}>
                  {gen.genNome}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="editor-form-panel basic-column">
        <div className="basic-column-header">
          <span>Classificação e resumo</span>
        </div>

        <label className="editor-field">
          <span>Categoria</span>
          <select
            name="idCategoria"
            value={form.idCategoria}
            onChange={(e) => onFieldChange("idCategoria", e.target.value)}
          >
            {categorias.map((cat) => (
              <option key={cat.idCategoria} value={cat.idCategoria}>
                {cat.catNome}
              </option>
            ))}
          </select>
        </label>

        <label className="editor-field">
          <span>Descrição</span>
          <textarea
            name="livDescricao"
            value={form.livDescricao}
            onChange={(e) => onFieldChange("livDescricao", e.target.value)}
            placeholder="Resumo ou sinopse do livro"
            rows={5}
          />
        </label>
      </div>

      <div className="editor-side-panel basic-cover-column">
        <div className="basic-column-header">
          <span>Capa do livro</span>
        </div>

        <div className="cover-uploader">
          <div className="cover-uploader-actions">
            <label className="upload-cover-button">
              <HiOutlineUpload />
              <span>Enviar capa</span>
              <input type="file" accept="image/*" onChange={onUpload} hidden />
            </label>
            <span className="cover-or-divider">ou</span>
          </div>

          <label className="editor-field">
            <span>URL da capa</span>
            <input
              name="livCapaURL"
              value={form.livCapaURL}
              onChange={(e) => onFieldChange("livCapaURL", e.target.value)}
              placeholder="https://..."
            />
          </label>

          <div className="cover-preview-frame">
            {form.livCapaURL ? (
              <img src={form.livCapaURL} alt={form.livTitulo || "Capa do livro"} />
            ) : (
              <div className="cover-preview-empty">
                <HiOutlinePhotograph />
                <span>Pré-visualização da capa</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
