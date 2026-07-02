import React, { useState, useCallback } from "react";
import { HiOutlinePhotograph, HiOutlineUpload, HiOutlinePlus } from "react-icons/hi";
import { HiOutlineQrCode, HiOutlineMagnifyingGlass } from "react-icons/hi2";
import ISBNScanner from "./ISBNScanner";

function normalizeText(value = "") {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function findMatchingOption(options = [], value, key) {
  const search = normalizeText(value);
  if (!search) return null;
  return options.find((item) => normalizeText(item?.[key]) === search) || null;
}

export function buildISBNAutoFillData({ livro, categorias = [], generos = [], autores = [], isbn = "" }) {
  const authors = Array.isArray(livro?.authors)
    ? livro.authors
        .map((author) => (typeof author === "string" ? author : author?.name))
        .filter(Boolean)
    : [];
  const categories = Array.isArray(livro?.categories)
    ? livro.categories
        .map((cat) => (typeof cat === "string" ? cat : cat?.name))
        .filter(Boolean)
    : [];
  const subjects = Array.isArray(livro?.subjects)
    ? livro.subjects
        .map((subj) => (typeof subj === "string" ? subj : subj?.name))
        .filter(Boolean)
    : [];
  const publisher = Array.isArray(livro?.publishers)
    ? livro.publishers[0]?.name || livro.publishers[0]
    : livro?.publisher || "";

  const authorName = authors[0] || "";
  const categoryName = categories[0] || subjects[0] || "";
  const matchingAutor = findMatchingOption(autores, authorName, "autNome");
  const matchingCategoria = findMatchingOption(categorias, categoryName, "catNome");
  const matchingGenero = findMatchingOption(generos, categoryName, "genNome");

  return {
    livTitulo: livro?.title || livro?.livTitulo || "",
    livAutor: matchingAutor?.autNome || authorName,
    livEditora: publisher || "",
    livAnoPublicacao: livro?.publish_date
      ? String(livro.publish_date).replace(/\D/g, "").slice(0, 4)
      : livro?.publishedDate
        ? String(livro.publishedDate).slice(0, 4)
        : "",
    livPaginas: livro?.number_of_pages
      ? String(livro.number_of_pages)
      : livro?.pageCount
        ? String(livro.pageCount)
        : "",
    livCapaURL:
      livro?.cover?.large ||
      livro?.cover?.medium ||
      livro?.cover?.small ||
      livro?.imageLinks?.extraLarge ||
      livro?.imageLinks?.large ||
      livro?.imageLinks?.medium ||
      livro?.imageLinks?.small ||
      "",
    livDescricao: livro?.description || "",
    idCategoria: matchingCategoria?.idCategoria ?? "",
    idGenero: matchingGenero?.idGenero ?? "",
    categoriaNome: categoryName,
    generoNome: categoryName,
    autorNome: authorName,
    exemplarISBN: isbn,
  };
}

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
  const [novaCategoria, setNovaCategoria] = useState("");
  const [novoGenero, setNovoGenero] = useState("");
  const [novoAutor, setNovoAutor] = useState("");
  const [criandoCategoria, setCriandoCategoria] = useState(false);
  const [criandoGenero, setCriandoGenero] = useState(false);
  const [criandoAutor, setCriandoAutor] = useState(false);

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
        let dados = null;
        try {
          const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${isbnLimpo}&format=json&jscmd=data`;
          const res = await fetch(url);
          const json = await res.json();
          const chave = `ISBN:${isbnLimpo}`;
          const livro = json[chave];

          if (!livro) {
            setErroISBN("ISBN não encontrado.");
            return;
          }

          dados = buildISBNAutoFillData({
            livro,
            categorias,
            generos,
            autores,
            isbn: isbnLimpo,
          });
        } catch (err) {
          console.error("Erro ao buscar no Open Library:", err);
          dados = null;
        }

        if (!dados) {
          setErroISBN("ISBN não encontrado. Tente novamente.");
          return;
        }

        let autorNome = dados.autorNome || "";
        let categoriaId = dados.idCategoria || "";
        let generoId = dados.idGenero || "";

        if (autorNome) {
          const autorExistente = autores.find((item) => normalizeText(item.autNome) === normalizeText(autorNome));
          if (autorExistente) {
            autorNome = autorExistente.autNome;
          } else {
            const criado = await onCriarAutor(autorNome);
            if (criado) {
              autorNome = criado.autNome;
            }
          }
        }

        if (dados.categoriaNome) {
          const categoriaExistente = categorias.find(
            (item) => normalizeText(item.catNome) === normalizeText(dados.categoriaNome)
          );
          if (categoriaExistente) {
            categoriaId = categoriaExistente.idCategoria;
          } else if (dados.categoriaNome.trim()) {
            setNovaCategoria(dados.categoriaNome);
            const criada = await onCriarCategoria(dados.categoriaNome);
            if (criada?.idCategoria) {
              categoriaId = criada.idCategoria;
            }
            setNovaCategoria("");
          }
        }

        if (dados.generoNome) {
          const generoExistente = generos.find(
            (item) => normalizeText(item.genNome) === normalizeText(dados.generoNome)
          );
          if (generoExistente) {
            generoId = generoExistente.idGenero;
          } else if (dados.generoNome.trim()) {
            setNovoGenero(dados.generoNome);
            const criado = await onCriarGenero(dados.generoNome);
            if (criado?.idGenero) {
              generoId = criado.idGenero;
            }
            setNovoGenero("");
          }
        }

        onISBNAutoFill({
          ...dados,
          livAutor: autorNome,
          idCategoria: categoriaId,
          idGenero: generoId,
        });
      } catch (err) {
        console.error("Erro ao processar ISBN:", err);
        setErroISBN("Erro ao consultar os dados do ISBN. Tente novamente.");
      } finally {
        setBuscandoISBN(false);
      }
    },
    [autores, categorias, generos, onCriarAutor, onCriarCategoria, onCriarGenero, onISBNAutoFill]
  );

  const handleISBNDetectado = useCallback(
    (isbn) => {
      setScannerAberto(false);
      onFieldChange("exemplarISBN", isbn);
      buscarPorISBN(isbn);
    },
    [buscarPorISBN, onFieldChange]
  );

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

             {/* ISBN com scanner e busca */}
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
                    <option value="">Selecione um gênero</option>
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
                  <option value="">Selecione uma categoria</option>
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