import React, { useState } from "react";
import { HiOutlinePhotograph, HiOutlineUpload, HiOutlinePlus } from "react-icons/hi";

export default function BasicInfoSection({
  form,
  categorias,
  generos,
  autores,          // novo
  onFieldChange,
  onUpload,
  onCriarCategoria,
  onCriarGenero,
  onCriarAutor,     // novo
}) {
  const [novaCategoria, setNovaCategoria] = useState("");
  const [novoGenero, setNovoGenero] = useState("");
  const [novoAutor, setNovoAutor] = useState("");
  const [criandoCategoria, setCriandoCategoria] = useState(false);
  const [criandoGenero, setCriandoGenero] = useState(false);
  const [criandoAutor, setCriandoAutor] = useState(false);

  async function handleCriarCategoria() {
    const nome = novaCategoria.trim();
    if (!nome) return;
    const criada = await onCriarCategoria(nome);
    if (criada) {
      onFieldChange("idCategoria", criada.idCategoria);
      setNovaCategoria("");
      setCriandoCategoria(false);
    }
  }

  async function handleCriarGenero() {
    const nome = novoGenero.trim();
    if (!nome) return;
    const criado = await onCriarGenero(nome);
    if (criado) {
      onFieldChange("idGenero", criado.idGenero);
      setNovoGenero("");
      setCriandoGenero(false);
    }
  }

  async function handleCriarAutor() {
    const nome = novoAutor.trim();
    if (!nome) return;
    const criado = await onCriarAutor(nome);
    if (criado) {
      onFieldChange("livAutor", criado.autNome);
      setNovoAutor("");
      setCriandoAutor(false);
    }
  }

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

         {/* AUTOR */}
          <div className="editor-field">
            <span>Autor</span>
            {criandoAutor ? (
              <div className="inline-create-row">
                <input
                  autoFocus
                  value={novoAutor}
                  onChange={(e) => setNovoAutor(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCriarAutor()}
                  placeholder="Nome do novo autor"
                />
                <button type="button" className="inline-create-confirm" onClick={handleCriarAutor}>
                  Confirmar
                </button>
                <button type="button" className="inline-create-cancel" onClick={() => setCriandoAutor(false)}>
                  Cancelar
                </button>
              </div>
            ) : (
              <div className="inline-select-row">
                <select
                  name="livAutor"
                  value={form.livAutor}
                  onChange={(e) => onFieldChange("livAutor", e.target.value)}
                >
                  <option value="">Selecione um autor</option>
                  {autores.map((aut) => (
                    <option key={aut.idAutor} value={aut.autNome}>
                      {aut.autNome}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="inline-create-btn"
                  title="Criar novo autor"
                  onClick={() => { setNovoAutor(""); setCriandoAutor(true); }}
                >
                  <HiOutlinePlus />
                </button>
              </div>
            )}
          </div>

          <label className="editor-field">
            <span>ISBN</span>
            <input
              name="exemplarISBN"
              value={form.exemplarISBN}
              onChange={(e) => onFieldChange("exemplarISBN", e.target.value)}
              placeholder="ISBN padrão dos exemplares"
            />
          </label>

          {/* GÊNERO */}
          <div className="editor-field">
            <span>Gênero</span>
            {criandoGenero ? (
              <div className="inline-create-row">
                <input
                  autoFocus
                  value={novoGenero}
                  onChange={(e) => setNovoGenero(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCriarGenero()}
                  placeholder="Nome do novo gênero"
                />
                <button type="button" className="inline-create-confirm" onClick={handleCriarGenero}>
                  Confirmar
                </button>
                <button type="button" className="inline-create-cancel" onClick={() => setCriandoGenero(false)}>
                  Cancelar
                </button>
              </div>
            ) : (
              <div className="inline-select-row">
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
                <button
                  type="button"
                  className="inline-create-btn"
                  title="Criar novo gênero"
                  onClick={() => { setNovoGenero(""); setCriandoGenero(true); }}
                >
                  <HiOutlinePlus />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="editor-form-panel basic-column">
        <div className="basic-column-header">
          <span>Classificação e resumo</span>
        </div>

        {/* CATEGORIA */}
        <div className="editor-field">
          <span>Categoria</span>
          {criandoCategoria ? (
            <div className="inline-create-row">
              <input
                autoFocus
                value={novaCategoria}
                onChange={(e) => setNovaCategoria(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCriarCategoria()}
                placeholder="Nome da nova categoria"
              />
              <button type="button" className="inline-create-confirm" onClick={handleCriarCategoria}>
                Confirmar
              </button>
              <button type="button" className="inline-create-cancel" onClick={() => setCriandoCategoria(false)}>
                Cancelar
              </button>
            </div>
          ) : (
            <div className="inline-select-row">
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
              <button
                type="button"
                className="inline-create-btn"
                title="Criar nova categoria"
                onClick={() => { setNovaCategoria(""); setCriandoCategoria(true); }}
              >
                <HiOutlinePlus />
              </button>
            </div>
          )}
        </div>

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