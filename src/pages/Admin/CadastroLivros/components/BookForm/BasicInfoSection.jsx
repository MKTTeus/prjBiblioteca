import React, { useState, useCallback } from "react";
import { HiOutlinePhotograph, HiOutlineUpload } from "react-icons/hi";
import { HiOutlineQrCode, HiOutlineMagnifyingGlass } from "react-icons/hi2";
import ISBNScanner from "./ISBNScanner";

export default function BasicInfoSection({
  form,
  categorias,
  generos,
  onFieldChange,
  onUpload,
  onISBNAutoFill,
}) {
  const [scannerAberto, setScannerAberto] = useState(false);
  const [buscandoISBN, setBuscandoISBN] = useState(false);
  const [erroISBN, setErroISBN] = useState(null);

  const buscarPorISBN = useCallback(
    async (isbn) => {
      const isbnLimpo = isbn.replace(/[^0-9X]/gi, "");
      if (!isbnLimpo) {
        setErroISBN("Digite um ISBN válido.");
        return;
      }

      setBuscandoISBN(true);
      setErroISBN(null);

      try {
        const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${isbnLimpo}&format=json&jscmd=data`;
        const res = await fetch(url);
        const json = await res.json();
        const chave = `ISBN:${isbnLimpo}`;
        const livro = json[chave];

        if (!livro) {
          setErroISBN("ISBN não encontrado na Open Library.");
          return;
        }

        const dados = {
          livTitulo: livro.title || "",
          livAutor: livro.authors?.map((a) => a.name).join(", ") || "",
          livEditora: livro.publishers?.[0]?.name || "",
          livAnoPublicacao: livro.publish_date
            ? livro.publish_date.replace(/\D/g, "").slice(0, 4)
            : "",
          livPaginas: livro.number_of_pages ? String(livro.number_of_pages) : "",
          livCapaURL:
            livro.cover?.large ||
            livro.cover?.medium ||
            livro.cover?.small ||
            "",
          livDescricao: "",
          exemplarISBN: isbnLimpo,
        };

        onISBNAutoFill(dados);
      } catch {
        setErroISBN("Erro ao consultar a Open Library. Tente novamente.");
      } finally {
        setBuscandoISBN(false);
      }
    },
    [onISBNAutoFill]
  );

  const handleISBNDetectado = useCallback(
    (isbn) => {
      setScannerAberto(false);
      onFieldChange("exemplarISBN", isbn);
      buscarPorISBN(isbn);
    },
    [buscarPorISBN, onFieldChange]
  );

  return (
    <>
      {scannerAberto && (
        <ISBNScanner
          onDetected={handleISBNDetectado}
          onClose={() => setScannerAberto(false)}
        />
      )}

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

            {/* ── Campo ISBN com scanner e busca ── */}
            <div className="editor-field">
              <span>ISBN</span>
              <div className="isbn-input-row">
                <input
                  name="exemplarISBN"
                  value={form.exemplarISBN}
                  onChange={(e) => {
                    onFieldChange("exemplarISBN", e.target.value);
                    setErroISBN(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      buscarPorISBN(form.exemplarISBN);
                    }
                  }}
                  placeholder="ISBN padrão dos exemplares"
                />
                <button
                  type="button"
                  className="isbn-action-btn isbn-scan-btn"
                  title="Escanear código de barras"
                  onClick={() => setScannerAberto(true)}
                >
                  <HiOutlineQrCode />
                </button>
                <button
                  type="button"
                  className="isbn-action-btn isbn-search-btn"
                  title="Buscar dados pelo ISBN"
                  onClick={() => buscarPorISBN(form.exemplarISBN)}
                  disabled={buscandoISBN}
                >
                  {buscandoISBN ? (
                    <span className="isbn-spinner" />
                  ) : (
                    <HiOutlineMagnifyingGlass />
                  )}
                </button>
              </div>
              {erroISBN && <span className="isbn-error-msg">{erroISBN}</span>}
              <span className="isbn-hint-msg">
                Escaneie ou digite e clique em <HiOutlineMagnifyingGlass style={{ verticalAlign: "middle" }} /> para preencher automaticamente
              </span>
            </div>

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
    </>
  );
}