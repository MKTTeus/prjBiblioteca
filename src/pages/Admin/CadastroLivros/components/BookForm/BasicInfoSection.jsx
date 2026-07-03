import React, { useState, useCallback, useRef, useEffect } from "react";
import { HiOutlinePhotograph, HiOutlineUpload, HiOutlinePlus } from "react-icons/hi";
import { HiOutlineQrCode, HiOutlineMagnifyingGlass, HiOutlineSparkles, HiOutlineCheck, HiOutlineXMark } from "react-icons/hi2";
import ISBNScanner from "./ISBNScanner";
import SearchableSelect from "./SearchableSelect";
import { completarLivroComIA } from "../../../../../services/api";

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
    livSubtitulo: livro?.subtitle || livro?.livSubtitulo || "",
    livAutor: matchingAutor?.autNome || authorName,
    livEditora: publisher || "",
    livAnoPublicacao: livro?.publish_date
      ? String(livro.publish_date).replace(/\D/g, "").slice(0, 4)
      : livro?.publishedDate
        ? String(livro.publishedDate).slice(0, 4)
        : livro?.year
          ? String(livro.year).slice(0, 4)
          : "",
    livPaginas: livro?.number_of_pages
      ? String(livro.number_of_pages)
      : livro?.pageCount
        ? String(livro.pageCount)
        : livro?.page_count
          ? String(livro.page_count)
          : "",
    livCapaURL:
      livro?.cover?.large ||
      livro?.cover?.medium ||
      livro?.cover?.small ||
      livro?.imageLinks?.extraLarge ||
      livro?.imageLinks?.large ||
      livro?.imageLinks?.medium ||
      livro?.imageLinks?.small ||
      livro?.cover_url ||
      "",
    livDescricao: livro?.description || livro?.synopsis || "",
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

  const [iaCarregando, setIaCarregando] = useState(false);
  const [iaErro, setIaErro] = useState(null);
  const [iaSugestao, setIaSugestao] = useState(null);
  const [iaCamposMarcados, setIaCamposMarcados] = useState({});
  const iaReviewPanelRef = useRef(null);

  // Rola até o painel de sugestões assim que ele aparece, para o admin não
  // precisar procurar as sugestões geradas mais abaixo na tela.
  useEffect(() => {
    if (iaSugestao && iaReviewPanelRef.current) {
      iaReviewPanelRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [iaSugestao]);

  // Encontra uma categoria/gênero já cadastrado pelo nome ou cria um novo.
  // Compartilhado entre a busca por ISBN e a sugestão da IA para não duplicar a lógica.
  const resolverCategoria = useCallback(
    async (nomeCategoria) => {
      if (!nomeCategoria || !nomeCategoria.trim()) return "";
      const existente = categorias.find(
        (item) => normalizeText(item.catNome) === normalizeText(nomeCategoria)
      );
      if (existente) return existente.idCategoria;
      try {
        const criada = await onCriarCategoria(nomeCategoria);
        return criada?.idCategoria ?? "";
      } catch (err) {
        if (err.status === 409) {
          const achada = categorias.find(
            (item) => normalizeText(item.catNome) === normalizeText(nomeCategoria)
          );
          if (achada) return achada.idCategoria;
        }
        return "";
      }
    },
    [categorias, onCriarCategoria]
  );

  const resolverGenero = useCallback(
    async (nomeGenero) => {
      if (!nomeGenero || !nomeGenero.trim()) return "";
      const existente = generos.find(
        (item) => normalizeText(item.genNome) === normalizeText(nomeGenero)
      );
      if (existente) return existente.idGenero;
      try {
        const criado = await onCriarGenero(nomeGenero);
        return criado?.idGenero ?? "";
      } catch (err) {
        if (err.status === 409) {
          const achado = generos.find(
            (item) => normalizeText(item.genNome) === normalizeText(nomeGenero)
          );
          if (achado) return achado.idGenero;
        }
        return "";
      }
    },
    [generos, onCriarGenero]
  );

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
        let livro = null;

        // 1) BrasilAPI: agrega CBL (registro oficial do ISBN no Brasil), Mercado
        // Editorial e Open Library. É a fonte mais precisa para edições nacionais.
        try {
          const url = `https://brasilapi.com.br/api/isbn/v1/${isbnLimpo}`;
          const res = await fetch(url);
          if (res.ok) {
            livro = await res.json();
          }
        } catch (err) {
          console.error("Erro ao buscar no BrasilAPI:", err);
          livro = null;
        }

        // 2) Open Library: bom fallback para obras estrangeiras/gerais.
        if (!livro) {
          try {
            const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${isbnLimpo}&format=json&jscmd=data`;
            const res = await fetch(url);
            const json = await res.json();
            livro = json[`ISBN:${isbnLimpo}`] || null;
          } catch (err) {
            console.error("Erro ao buscar no Open Library:", err);
            livro = null;
          }
        }

        // 3) Google Books: último fallback, maior cobertura geral.
        if (!livro) {
          try {
            const googleBooksKey = process.env.REACT_APP_GOOGLE_BOOKS_KEY;
            const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbnLimpo}${
              googleBooksKey ? `&key=${googleBooksKey}` : ""
            }`;
            const res = await fetch(url);
            const json = await res.json();
            livro = json?.items?.[0]?.volumeInfo || null;
          } catch (err) {
            console.error("Erro ao buscar no Google Books:", err);
            livro = null;
          }
        }

        if (!livro) {
          setErroISBN("ISBN não encontrado em nenhuma fonte. Tente novamente ou preencha manualmente.");
          return;
        }

        const dados = buildISBNAutoFillData({
          livro,
          autores,
          isbn: isbnLimpo,
        });

        // Não cria o autor aqui — só reaproveita a grafia já cadastrada, se
        // houver. O backend resolve (busca ou cria) o autor pelo nome
        // automaticamente ao salvar o livro.
        let autorNome = dados.autorNome || "";
        if (autorNome) {
          const autorExistente = autores.find((item) => normalizeText(item.autNome) === normalizeText(autorNome));
          if (autorExistente) {
            autorNome = autorExistente.autNome;
          }
        }

        const categoriaId = await resolverCategoria(dados.categoriaNome);
        const generoId = await resolverGenero(dados.generoNome);

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
    [autores, onISBNAutoFill, resolverCategoria, resolverGenero]
  );

  const handleISBNDetectado = useCallback(
    (isbn) => {
      setScannerAberto(false);
      onFieldChange("exemplarISBN", isbn);
      buscarPorISBN(isbn);
    },
    [buscarPorISBN, onFieldChange]
  );

  // onCriarCategoria/onCriarGenero/onCriarAutor agora só enfileiram o item
  // localmente (ver BookFormModal) — nunca chamam a API nem lançam 409, então
  // não há mais nada para tratar aqui além de aplicar o resultado ao form.
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

  const handleCompletarComIA = useCallback(async () => {
    setIaErro(null);
    setIaSugestao(null);

    if (!form.exemplarISBN && !form.livTitulo && !form.livAutor) {
      setIaErro("Informe pelo menos o ISBN, título ou autor antes de pedir ajuda da IA.");
      return;
    }

    const categoriaAtual = categorias.find((c) => String(c.idCategoria) === String(form.idCategoria));
    const generoAtual = generos.find((g) => String(g.idGenero) === String(form.idGenero));

    setIaCarregando(true);
    try {
      const sugestao = await completarLivroComIA({
        isbn: form.exemplarISBN || undefined,
        livTitulo: form.livTitulo || undefined,
        livAutor: form.livAutor || undefined,
        livEditora: form.livEditora || undefined,
        livAnoPublicacao: form.livAnoPublicacao ? Number(form.livAnoPublicacao) : undefined,
        livPaginas: form.livPaginas ? Number(form.livPaginas) : undefined,
        livDescricao: form.livDescricao || undefined,
        categoriaNome: categoriaAtual?.catNome,
        generoNome: generoAtual?.genNome,
        categorias_existentes: categorias.map((c) => c.catNome),
        generos_existentes: generos.map((g) => g.genNome),
      });

      const incertos = new Set(sugestao.campos_incertos || []);
      const marcarPorPadrao = (campo) => !incertos.has(campo);

      setIaSugestao(sugestao);
      setIaCamposMarcados({
        titulo: marcarPorPadrao("titulo"),
        subtitulo: marcarPorPadrao("subtitulo"),
        autor_principal: marcarPorPadrao("autor_principal"),
        editora: marcarPorPadrao("editora"),
        ano_publicacao: marcarPorPadrao("ano_publicacao"),
        paginas: marcarPorPadrao("paginas"),
        idioma: marcarPorPadrao("idioma"),
        descricao: marcarPorPadrao("descricao"),
        categoria_sugerida: marcarPorPadrao("categoria_sugerida"),
        genero_sugerido: marcarPorPadrao("genero_sugerido"),
        faixa_etaria: marcarPorPadrao("faixa_etaria"),
        palavras_chave: marcarPorPadrao("palavras_chave"),
      });
    } catch (err) {
      console.error("Erro ao completar com IA:", err);
      setIaErro(err?.data?.detail || "Não foi possível consultar a IA agora. Tente novamente.");
    } finally {
      setIaCarregando(false);
    }
  }, [form, categorias, generos]);

  const handleToggleCampoIA = (campo) => {
    setIaCamposMarcados((prev) => ({ ...prev, [campo]: !prev[campo] }));
  };

  const handleAplicarSugestoesIA = useCallback(async () => {
    if (!iaSugestao) return;
    const marcados = iaCamposMarcados;
    const atualizacoes = {};

    if (marcados.titulo && iaSugestao.titulo) atualizacoes.livTitulo = iaSugestao.titulo;
    if (marcados.subtitulo && iaSugestao.subtitulo) atualizacoes.livSubtitulo = iaSugestao.subtitulo;
    if (marcados.autor_principal && iaSugestao.autor_principal) atualizacoes.livAutor = iaSugestao.autor_principal;
    if (marcados.editora && iaSugestao.editora) atualizacoes.livEditora = iaSugestao.editora;
    if (marcados.ano_publicacao && iaSugestao.ano_publicacao) atualizacoes.livAnoPublicacao = String(iaSugestao.ano_publicacao);
    if (marcados.paginas && iaSugestao.paginas) atualizacoes.livPaginas = String(iaSugestao.paginas);
    if (marcados.idioma && iaSugestao.idioma) atualizacoes.livIdioma = iaSugestao.idioma;
    if (marcados.descricao && iaSugestao.descricao) atualizacoes.livDescricao = iaSugestao.descricao;
    if (marcados.faixa_etaria && iaSugestao.faixa_etaria) atualizacoes.livFaixaEtaria = iaSugestao.faixa_etaria;
    if (marcados.palavras_chave && iaSugestao.palavras_chave?.length > 0) {
      atualizacoes.livPalavrasChave = iaSugestao.palavras_chave.join(", ");
    }

    if (marcados.categoria_sugerida && iaSugestao.categoria_sugerida) {
      atualizacoes.idCategoria = await resolverCategoria(iaSugestao.categoria_sugerida);
    }
    if (marcados.genero_sugerido && iaSugestao.genero_sugerido) {
      atualizacoes.idGenero = await resolverGenero(iaSugestao.genero_sugerido);
    }

    Object.entries(atualizacoes).forEach(([campo, valor]) => onFieldChange(campo, valor));

    setIaSugestao(null);
    setIaCamposMarcados({});
  }, [iaSugestao, iaCamposMarcados, resolverCategoria, resolverGenero, onFieldChange]);

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
                  <SearchableSelect
                    name="livAutor"
                    value={form.livAutor}
                    options={autores.map((aut) => ({ value: aut.autNome, label: aut.autNome }))}
                    onChange={(val) => onFieldChange("livAutor", val)}
                    placeholder="Selecione um autor"
                  />
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
                  <SearchableSelect
                    name="idGenero"
                    value={form.idGenero}
                    options={generos.map((gen) => ({ value: gen.idGenero, label: gen.genNome }))}
                    onChange={(val) => onFieldChange("idGenero", val)}
                    placeholder="Selecione um gênero"
                  />
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
                <SearchableSelect
                  name="idCategoria"
                  value={form.idCategoria}
                  options={categorias.map((cat) => ({ value: cat.idCategoria, label: cat.catNome }))}
                  onChange={(val) => onFieldChange("idCategoria", val)}
                  placeholder="Selecione uma categoria"
                />
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

          <button
            type="button"
            className="ia-completar-btn"
            onClick={handleCompletarComIA}
            disabled={iaCarregando}
            style={{ marginTop: "12px" }}
          >
            {iaCarregando ? (
              <span className="isbn-spinner" />
            ) : (
              <HiOutlineSparkles />
            )}
            <span>{iaCarregando ? "Consultando IA..." : "Completar com IA"}</span>
          </button>
          {iaErro && <span className="isbn-error-msg">{iaErro}</span>}
          <span className="isbn-hint-msg">
            A IA sugere os campos que faltam com base no que já foi preenchido. Sempre revise antes de aplicar.
          </span>
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

      {iaSugestao && (
        <div className="ia-review-panel" ref={iaReviewPanelRef}>
          <div className="ia-review-header">
            <span className="ia-review-title">
              <HiOutlineSparkles /> Sugestões da IA
            </span>
            <span className={`ia-confianca-badge ia-confianca-${iaSugestao.confianca_geral}`}>
              Confiança {iaSugestao.confianca_geral}
            </span>
          </div>
          <p className="ia-review-hint">
            Marque os campos que quer aplicar ao cadastro. Campos com confiança baixa vêm desmarcados por padrão.
          </p>

          <div className="ia-review-fields">
            {[
              { campo: "titulo", label: "Título", valor: iaSugestao.titulo },
              { campo: "subtitulo", label: "Subtítulo", valor: iaSugestao.subtitulo },
              { campo: "autor_principal", label: "Autor", valor: iaSugestao.autor_principal },
              { campo: "editora", label: "Editora", valor: iaSugestao.editora },
              { campo: "ano_publicacao", label: "Ano", valor: iaSugestao.ano_publicacao },
              { campo: "paginas", label: "Páginas", valor: iaSugestao.paginas },
              { campo: "idioma", label: "Idioma", valor: iaSugestao.idioma },
              { campo: "categoria_sugerida", label: "Categoria", valor: iaSugestao.categoria_sugerida },
              { campo: "genero_sugerido", label: "Gênero", valor: iaSugestao.genero_sugerido },
              { campo: "faixa_etaria", label: "Faixa etária", valor: iaSugestao.faixa_etaria },
              {
                campo: "palavras_chave",
                label: "Palavras-chave",
                valor: iaSugestao.palavras_chave?.length > 0 ? iaSugestao.palavras_chave.join(", ") : "",
              },
              { campo: "descricao", label: "Descrição", valor: iaSugestao.descricao },
            ]
              .filter((item) => item.valor)
              .map((item) => (
                <label key={item.campo} className="ia-review-field">
                  <input
                    type="checkbox"
                    checked={!!iaCamposMarcados[item.campo]}
                    onChange={() => handleToggleCampoIA(item.campo)}
                  />
                  <span className="ia-review-field-label">{item.label}</span>
                  <span className="ia-review-field-valor">{item.valor}</span>
                </label>
              ))}
          </div>

          <div className="ia-review-actions">
            <button type="button" className="ia-review-aplicar" onClick={handleAplicarSugestoesIA}>
              <HiOutlineCheck /> Aplicar selecionados
            </button>
            <button
              type="button"
              className="ia-review-descartar"
              onClick={() => { setIaSugestao(null); setIaCamposMarcados({}); }}
            >
              <HiOutlineXMark /> Descartar
            </button>
          </div>
        </div>
      )}
    </>
  );
}