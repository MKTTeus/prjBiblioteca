import React, { useState, useCallback } from "react";
import { HiOutlinePhotograph, HiOutlineUpload } from "react-icons/hi";
import { HiOutlineQrCode, HiOutlineMagnifyingGlass } from "react-icons/hi2";
import ISBNScanner from "./ISBNScanner";
import SelectOuCriar from "../../../../../components/SelectOuCriar/SelectOuCriar";

export default function BasicInfoSection({
  form,
  categorias,
  generos,
  autores,
  onFieldChange,
  onUpload,
  onISBNAutoFill,
  onCriarCategoria,
  onCriarGenero,
  onCriarAutor,
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

            {/* Autor com SelectOuCriar */}
            <div className="editor-field">
              <span>Autor</span>
              <SelectOuCriar
                items={autores.map((a) => ({ id: a.idAutor, nome: a.autNome }))}
                value={form.idAutor}
                onChange={(id) => onFieldChange("idAutor", id)}
                onCriar={onCriarAutor}
                placeholder="— selecione o autor —"
                label="autor"
              />
            </div>

            {/* ISBN com scanner e busca — restaurado do commit 4f3dc7a */}
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
                Escaneie ou digite e clique em{" "}
                <HiOutlineMagnifyingGlass style={{ verticalAlign: "middle" }} />{" "}
                para preencher automaticamente
              </span>
            </div>

            {/* Gênero com SelectOuCriar */}
            <div className="editor-field">
              <span>Gênero</span>
              <SelectOuCriar
                items={generos.map((g) => ({ id: g.idGenero, nome: g.genNome }))}
                value={form.idGenero}
                onChange={(id) => onFieldChange("idGenero", id)}
                onCriar={onCriarGenero}
                placeholder="— selecione o gênero —"
                label="gênero"
              />
            </div>
          </div>
        </div>

        <div className="editor-form-panel basic-column">
          <div className="basic-column-header">
            <span>Classificação e resumo</span>
          </div>

          {/* Categoria com SelectOuCriar */}
          <div className="editor-field">
            <span>Categoria</span>
            <SelectOuCriar
              items={categorias.map((c) => ({ id: c.idCategoria, nome: c.catNome }))}
              value={form.idCategoria}
              onChange={(id) => onFieldChange("idCategoria", id)}
              onCriar={onCriarCategoria}
              placeholder="— selecione a categoria —"
              label="categoria"
            />
          </div>

          <label className="editor-field" style={{ marginTop: "12px" }}>
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