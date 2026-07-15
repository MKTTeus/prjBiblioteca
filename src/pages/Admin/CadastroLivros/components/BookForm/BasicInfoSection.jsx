import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
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

// Extrai só o ano (4 dígitos) de uma data em formato livre, como retornada
// pela API de autores do Open Library (ex.: "January 2, 1920", "1920").
function extrairAno(valor) {
  if (!valor) return "";
  const match = String(valor).match(/\d{4}/);
  return match ? match[0] : "";
}

// Busca ano de nascimento/falecimento do autor na API de autores do Open
// Library (best-effort — nem toda fonte de ISBN traz esse dado; hoje só o
// Open Library expõe um registro de autor com essas datas biográficas).
async function buscarAnosAutorOpenLibrary(authorKeyOrUrl) {
  if (!authorKeyOrUrl) return { nascimento: "", falecimento: "" };
  try {
    const key = String(authorKeyOrUrl).replace(/^https?:\/\/openlibrary\.org/, "");
    const url = `https://openlibrary.org${key.endsWith(".json") ? key : `${key}.json`}`;
    const res = await fetch(url);
    if (!res.ok) return { nascimento: "", falecimento: "" };
    const data = await res.json();
    return {
      nascimento: extrairAno(data.birth_date),
      falecimento: extrairAno(data.death_date),
    };
  } catch (err) {
    console.error("Erro ao buscar dados biográficos do autor:", err);
    return { nascimento: "", falecimento: "" };
  }
}

function findMatchingOption(options = [], value, key) {
  const search = normalizeText(value);
  if (!search) return null;
  return options.find((item) => normalizeText(item?.[key]) === search) || null;
}

// Classe do wrapper do campo com destaque visual quando ele acabou de ser
// preenchido automaticamente pelo ISBN ou pela IA.
function fieldClass(name, highlightedFields, base = "editor-field") {
  return highlightedFields?.has(name) ? `${base} field-autofilled` : base;
}

// Selinho "✨ auto" ao lado do rótulo, mesmo critério do fieldClass acima.
function AutoTag({ name, highlightedFields }) {
  if (!highlightedFields?.has(name)) return null;
  return <span className="field-autofilled-tag">✨ auto</span>;
}

// O campo de autor guarda uma única string, mas um livro pode ter vários
// autores — nomes ficam separados por vírgula (ex.: "J.K. Rowling, Mary
// GrandPré"). Estas duas funções centralizam esse formato.
function splitAutores(texto) {
  return String(texto || "")
    .split(",")
    .map((nome) => nome.trim())
    .filter(Boolean);
}

/**
 * AutorMultiInput
 *
 * Campo de texto livre para o(s) autor(es) do livro — permite digitar vários
 * nomes separados por vírgula (relação M:N com LivroAutor). Mantém uma lista
 * de sugestões dos autores já cadastrados, filtrada pelo trecho depois da
 * última vírgula, para reduzir cadastros duplicados por causa de digitação.
 *
 * onSelecionarSugestao(nomeEscolhido, indiceSegmento) é chamado ao clicar
 * numa sugestão — indiceSegmento === 0 indica que é o primeiro autor da
 * lista, usado pelo formulário pra também preencher nascimento/falecimento.
 */
function AutorMultiInput({ value, autores, onChangeTexto, onSelecionarSugestao, placeholder }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  // Guarda o id do setTimeout usado pra fechar a lista no blur, pra poder
  // cancelar quando o fechamento foi só um efeito colateral de clicar numa
  // sugestão (ver handleBlur/handleSelecionar abaixo).
  const closeTimeoutRef = useRef(null);

  useEffect(() => {
    function handleClickFora(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickFora);
    return () => {
      document.removeEventListener("mousedown", handleClickFora);
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  const partes = String(value || "").split(",");
  const indiceSegmentoAtual = partes.length - 1;
  const segmentoAtual = normalizeText(partes[indiceSegmentoAtual]);

  const sugestoes = useMemo(() => {
    const disponiveis = autores.filter(
      (item) => !splitAutores(value).some((nome) => normalizeText(nome) === normalizeText(item.autNome))
    );
    if (!segmentoAtual) return disponiveis.slice(0, 8);
    return disponiveis
      .filter((item) => normalizeText(item.autNome).includes(segmentoAtual))
      .slice(0, 8);
  }, [autores, segmentoAtual, value]);

  function handleBlur() {
    closeTimeoutRef.current = setTimeout(() => setOpen(false), 150);
  }

  function handleSelecionar(autor) {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    const novasPartes = [...partes];
    novasPartes[indiceSegmentoAtual] = ` ${autor.autNome}`;
    const novoValor = novasPartes
      .map((p, idx) => (idx === 0 ? p.trim() : ` ${p.trim()}`))
      .join(",");
    onChangeTexto(`${novoValor}, `);
    onSelecionarSugestao(autor.autNome, indiceSegmentoAtual);
    setOpen(true);
    inputRef.current?.focus();
  }

  return (
    <div className="searchable-select" ref={containerRef}>
      <input
        ref={inputRef}
        type="text"
        className="searchable-select-input"
        value={value || ""}
        onFocus={() => setOpen(true)}
        onChange={(e) => onChangeTexto(e.target.value)}
        onBlur={handleBlur}
        placeholder={placeholder}
        autoComplete="off"
      />
      {open && sugestoes.length > 0 && (
        <ul
          className="searchable-select-list"
          onMouseDown={(e) => e.preventDefault()}
        >
          {sugestoes.map((autor) => (
            <li
              key={autor.idAutor}
              className="searchable-select-option"
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelecionar(autor);
              }}
            >
              {autor.autNome}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function buildISBNAutoFillData({ livro, categorias = [], generos = [], autores = [], isbn = "" }) {
  const authors = Array.isArray(livro?.authors)
    ? livro.authors
        .map((author) => (typeof author === "string" ? author : author?.name))
        .filter(Boolean)
    : [];
  const authorKey = Array.isArray(livro?.authors)
    ? livro.authors[0]?.url || livro.authors[0]?.key || ""
    : "";
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

  // Um livro pode ter vários autores (BrasilAPI e Open Library normalmente
  // trazem a lista completa) — cada nome já tenta bater com um autor já
  // cadastrado, senão mantém como veio da fonte. Quem consome isso decide
  // como juntar/criar cada um (ver resolverAutores em BasicInfoSection).
  const autoresNomes = authors.map(
    (nome) => findMatchingOption(autores, nome, "autNome")?.autNome || nome
  );

  // Palavras-chave: BrasilAPI e Open Library trazem em "subjects", Google
  // Books em "categories" — juntamos as duas listas (sem repetir), já que
  // ambas servem igualmente bem como palavras-chave do livro.
  const palavrasChave = Array.from(new Set([...subjects, ...categories])).slice(0, 10);

  // Local da editora: só a BrasilAPI traz isso de forma estruturada, no
  // formato "CIDADE, UF" (ex.: "SÃO PAULO, SP") — como essa fonte agrega
  // registros nacionais (CBL/Mercado Editorial), o país é sempre Brasil
  // quando esse campo vem preenchido. Open Library às vezes traz a cidade
  // solta em "publish_places", sem estado/país.
  let editoraCidade = "";
  let editoraEstado = "";
  let editoraPais = "";
  if (typeof livro?.location === "string" && livro.location.trim()) {
    const partes = livro.location.split(",").map((p) => p.trim()).filter(Boolean);
    editoraCidade = partes[0] || "";
    editoraEstado = partes[1] || "";
    editoraPais = "Brasil";
  } else if (Array.isArray(livro?.publish_places) && livro.publish_places.length > 0) {
    const local = String(livro.publish_places[0] || "");
    const partes = local.split(",").map((p) => p.trim()).filter(Boolean);
    editoraCidade = partes[0] || "";
    editoraEstado = partes[1] || "";
  }

  return {
    livTitulo: livro?.title || livro?.livTitulo || "",
    livSubtitulo: livro?.subtitle || livro?.livSubtitulo || "",
    livAutor: autoresNomes.length > 0 ? autoresNomes.join(", ") : matchingAutor?.autNome || authorName,
    autoresNomes,
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
    livPalavrasChave: palavrasChave.join(", "),
    ediCidade: editoraCidade,
    ediEstado: editoraEstado,
    ediPais: editoraPais,
    idCategoria: matchingCategoria?.idCategoria ?? "",
    idGenero: matchingGenero?.idGenero ?? "",
    categoriaNome: categoryName,
    generoNome: categoryName,
    autorNome: authorName,
    autorKey: authorKey,
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
  onCamposAutoFillIA,
  onCriarCategoria,
  onCriarGenero,
  onCriarAutor,
  highlightedFields,
  isbnFilledFields,
}) {
  const [novaCategoria, setNovaCategoria] = useState("");
  const [novoGenero, setNovoGenero] = useState("");
  const [novoAutor, setNovoAutor] = useState("");
  const [criandoCategoria, setCriandoCategoria] = useState(false);
  const [criandoGenero, setCriandoGenero] = useState(false);
  const [criandoAutor, setCriandoAutor] = useState(false);
  const [mostrarFalecimento, setMostrarFalecimento] = useState(false);

  // Mantém o campo de falecimento visível se o form já chegar com um valor
  // (ex.: editando um livro cujo autor já tem ano de falecimento salvo).
  useEffect(() => {
    if (form.autorAnoFalecimento) {
      setMostrarFalecimento(true);
    }
  }, [form.autorAnoFalecimento]);

  const [scannerAberto, setScannerAberto] = useState(false);
  const [buscandoISBN, setBuscandoISBN] = useState(false);
  const [erroISBN, setErroISBN] = useState(null);
  const isbnInputRef = useRef(null);
  // Guarda o texto acumulado e o horário da última tecla para detectar
  // "rajadas" de digitação de leitores de código de barras (ver useEffect
  // logo abaixo de handleISBNDetectado).
  const scanBufferRef = useRef({ texto: "", ultimaTecla: 0 });
  // Debounce do auto-disparo da busca quando o valor do campo já forma um
  // ISBN completo — não depende do Enter, porque nem todo leitor físico de
  // código de barras está configurado para enviar Enter como terminador
  // (alguns mandam Tab, outros nada).
  const isbnDebounceRef = useRef(null);
  const isbnAutoBuscadoRef = useRef("");

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

  // Igual a resolverCategoria/resolverGenero: reaproveita o autor já cadastrado
  // pelo nome ou cria uma entrada "pendente" (mesmo mecanismo do botão "+ Novo
  // autor"), para que o nome apareça de fato selecionado no campo — e não fique
  // em branco por não bater com nenhuma opção do select.
  const resolverAutor = useCallback(
    async (nomeAutor) => {
      if (!nomeAutor || !nomeAutor.trim()) return "";
      const existente = autores.find(
        (item) => normalizeText(item.autNome) === normalizeText(nomeAutor)
      );
      if (existente) return existente.autNome;
      try {
        const criado = await onCriarAutor(nomeAutor);
        return criado?.autNome ?? nomeAutor;
      } catch (err) {
        if (err.status === 409) {
          const achado = autores.find(
            (item) => normalizeText(item.autNome) === normalizeText(nomeAutor)
          );
          if (achado) return achado.autNome;
        }
        return nomeAutor;
      }
    },
    [autores, onCriarAutor]
  );

  // Um livro pode ter vários autores — aceita tanto um array (vindo do ISBN,
  // que às vezes já traz a lista completa) quanto uma string com nomes
  // separados por vírgula (o que o campo do formulário aceita digitado à
  // mão), resolve/cria cada um e devolve tudo já junto em uma única string.
  const resolverAutores = useCallback(
    async (nomesAutor) => {
      const lista = Array.isArray(nomesAutor)
        ? nomesAutor
        : String(nomesAutor || "").split(",");
      const nomesLimpos = lista.map((n) => n.trim()).filter(Boolean);
      if (nomesLimpos.length === 0) return "";

      const resolvidos = [];
      for (const nome of nomesLimpos) {
        const resolvido = await resolverAutor(nome);
        if (resolvido && !resolvidos.some((r) => normalizeText(r) === normalizeText(resolvido))) {
          resolvidos.push(resolvido);
        }
      }
      return resolvidos.join(", ");
    },
    [resolverAutor]
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

        // Best-effort: só o Open Library retorna uma key/url de autor que dá
        // pra consultar nascimento/falecimento; outras fontes não trazem isso.
        const anosAutor = dados.autorKey
          ? await buscarAnosAutorOpenLibrary(dados.autorKey)
          : { nascimento: "", falecimento: "" };

        // Reaproveita os autores já cadastrados pelo nome ou cria uma entrada
        // pendente pra cada um (mesmo mecanismo do botão "+ Novo autor" e do
        // que já é feito aqui para categoria/gênero) — um livro pode ter
        // vários autores, então resolve a lista inteira, não só o primeiro.
        const autorTexto = await resolverAutores(
          dados.autoresNomes && dados.autoresNomes.length > 0 ? dados.autoresNomes : dados.autorNome
        );
        const categoriaId = await resolverCategoria(dados.categoriaNome);
        const generoId = await resolverGenero(dados.generoNome);

        onISBNAutoFill({
          ...dados,
          livAutor: autorTexto,
          autorAnoNascimento: anosAutor.nascimento,
          autorAnoFalecimento: anosAutor.falecimento,
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
    [onISBNAutoFill, resolverAutores, resolverCategoria, resolverGenero, autores]
  );

  const handleISBNDetectado = useCallback(
    (isbn) => {
      setScannerAberto(false);
      onFieldChange("exemplarISBN", isbn);
      buscarPorISBN(isbn);
    },
    [buscarPorISBN, onFieldChange]
  );

  // Autofoca o campo ISBN assim que a seção monta (ou seja, quando o modal de
  // cadastro/edição abre). Isso permite que um leitor de código de barras
  // USB/Bluetooth — que o sistema operacional enxerga como um teclado —
  // já escreva direto nesse campo sem o usuário precisar clicar nele antes.
  // O pequeno atraso evita disputar o foco com a animação de abertura do modal.
  useEffect(() => {
    const timer = setTimeout(() => {
      isbnInputRef.current?.focus();
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  // Limpa o debounce de auto-busca do ISBN se o componente desmontar no meio
  // do caminho (ex.: usuário fecha o modal logo depois de escanear).
  useEffect(() => {
    return () => {
      if (isbnDebounceRef.current) clearTimeout(isbnDebounceRef.current);
    };
  }, []);

  // Detecta a "rajada" de digitação típica de um leitor de código de barras
  // físico mesmo quando o foco não está no campo ISBN (ex.: o usuário clicou
  // em outro lugar da página antes de escanear). Um leitor desses digita
  // dezenas de caracteres em poucos milissegundos — bem mais rápido que
  // qualquer digitação humana — e normalmente finaliza com Enter.
  //
  // Só entra em ação quando o elemento focado no momento NÃO é um campo de
  // formulário (input/textarea/select), para nunca atrapalhar quem está de
  // fato digitando em outro campo (ex.: Título). Quando o foco já está no
  // próprio campo ISBN, o onChange/onKeyDown dele (mais abaixo) já dão conta
  // do recado, então este listener global se mantém de fora.
  useEffect(() => {
    const INTERVALO_MAX_MS = 50; // intervalo entre teclas compatível com scanner
    const TAMANHO_MIN_CODIGO = 8; // menor tamanho plausível de EAN/ISBN
    let debounceBuffer = null; // timer do fallback por padrão de ISBN completo

    function ehCampoDeFormulario(el) {
      if (!el) return false;
      const tag = el.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
    }

    function dispararBusca(codigo) {
      const buffer = scanBufferRef.current;
      buffer.texto = "";
      if (debounceBuffer) clearTimeout(debounceBuffer);
      onFieldChange("exemplarISBN", codigo);
      setErroISBN(null);
      isbnInputRef.current?.focus();
      buscarPorISBN(codigo);
    }

    function handleKeyDown(e) {
      if (ehCampoDeFormulario(document.activeElement)) return;

      const buffer = scanBufferRef.current;
      const agora = Date.now();

      if (e.key === "Enter") {
        if (buffer.texto.length >= TAMANHO_MIN_CODIGO) {
          e.preventDefault();
          dispararBusca(buffer.texto);
        }
        return;
      }

      // Só acumula dígitos (e "X", dígito verificador do ISBN-10); qualquer
      // outra tecla (setas, letras, atalhos etc.) reinicia o buffer, pois não
      // faz parte de um código de barras válido.
      if (!/^[0-9Xx]$/.test(e.key)) {
        buffer.texto = "";
        return;
      }

      // Se passou tempo demais desde a última tecla, não é uma rajada de
      // scanner — é o início de uma digitação humana comum. Reinicia o buffer.
      if (buffer.texto && agora - buffer.ultimaTecla > INTERVALO_MAX_MS) {
        buffer.texto = "";
      }

      buffer.texto += e.key;
      buffer.ultimaTecla = agora;

      // Fallback: mesmo sem Enter (scanner configurado sem terminador, ou
      // com Tab), se o que já foi digitado bate com um ISBN completo, dispara
      // a busca sozinha depois de uma pequena pausa sem nenhuma tecla nova.
      if (debounceBuffer) clearTimeout(debounceBuffer);
      const candidato = buffer.texto;
      if (/^(978|979|97[0-9])\d{10}$|^\d{9}[\dX]$/i.test(candidato)) {
        debounceBuffer = setTimeout(() => {
          if (scanBufferRef.current.texto === candidato) {
            dispararBusca(candidato);
          }
        }, 300);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (debounceBuffer) clearTimeout(debounceBuffer);
    };
  }, [onFieldChange, buscarPorISBN]);

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
      const atuais = splitAutores(form.livAutor);
      if (!atuais.some((n) => normalizeText(n) === normalizeText(criado.autNome))) {
        atuais.push(criado.autNome);
      }
      onFieldChange("livAutor", atuais.join(", "));
      setNovoAutor("");
      setCriandoAutor(false);
    }
  }

  // Ao selecionar um autor já cadastrado (num dos nomes separados por
  // vírgula), preenche os campos de ano de nascimento/falecimento com o que
  // já está salvo pra esse autor — mas só quando é o primeiro nome da
  // lista, já que o formulário só tem esses dois campos pra um autor.
  const handleSelecionarAutor = useCallback(
    (nomeAutor, indiceSegmento) => {
      if (indiceSegmento !== 0) return;
      const encontrado = autores.find(
        (item) => normalizeText(item.autNome) === normalizeText(nomeAutor)
      );
      onFieldChange("autorAnoNascimento", encontrado?.autAnoNascimento || "");
      onFieldChange("autorAnoFalecimento", encontrado?.autAnoFalecimento || "");
    },
    [autores, onFieldChange]
  );

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
        autor_ano_nascimento: marcarPorPadrao("autor_ano_nascimento"),
        autor_ano_falecimento: marcarPorPadrao("autor_ano_falecimento"),
        editora: marcarPorPadrao("editora"),
        ano_publicacao: marcarPorPadrao("ano_publicacao"),
        paginas: marcarPorPadrao("paginas"),
        idioma: marcarPorPadrao("idioma"),
        descricao: marcarPorPadrao("descricao"),
        categoria_sugerida: marcarPorPadrao("categoria_sugerida"),
        genero_sugerido: marcarPorPadrao("genero_sugerido"),
        faixa_etaria: marcarPorPadrao("faixa_etaria"),
        palavras_chave: marcarPorPadrao("palavras_chave"),
        edicao: marcarPorPadrao("edicao"),
        ilustrado: marcarPorPadrao("ilustrado"),
        editora_cidade: marcarPorPadrao("editora_cidade"),
        editora_estado: marcarPorPadrao("editora_estado"),
        editora_pais: marcarPorPadrao("editora_pais"),
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
    if (marcados.autor_principal && iaSugestao.autor_principal) {
      // A IA pode retornar mais de um autor (ex.: "Fulano de Tal, Ciclana
      // Pereira") — divide por vírgula e resolve/cria cada um, em vez de
      // tratar a string inteira como um único nome de autor.
      const atuais = splitAutores(form.livAutor);
      for (const nome of splitAutores(iaSugestao.autor_principal)) {
        const resolvido = await resolverAutor(nome);
        if (resolvido && !atuais.some((n) => normalizeText(n) === normalizeText(resolvido))) {
          atuais.push(resolvido);
        }
      }
      atualizacoes.livAutor = atuais.join(", ");
    }
    if (marcados.autor_ano_nascimento && iaSugestao.autor_ano_nascimento) {
      atualizacoes.autorAnoNascimento = String(iaSugestao.autor_ano_nascimento);
    }
    if (marcados.autor_ano_falecimento && iaSugestao.autor_ano_falecimento) {
      atualizacoes.autorAnoFalecimento = String(iaSugestao.autor_ano_falecimento);
    }
    if (marcados.editora && iaSugestao.editora) atualizacoes.livEditora = iaSugestao.editora;
    if (marcados.ano_publicacao && iaSugestao.ano_publicacao) atualizacoes.livAnoPublicacao = String(iaSugestao.ano_publicacao);
    if (marcados.paginas && iaSugestao.paginas) atualizacoes.livPaginas = String(iaSugestao.paginas);
    if (marcados.idioma && iaSugestao.idioma) atualizacoes.livIdioma = iaSugestao.idioma;
    if (marcados.descricao && iaSugestao.descricao) atualizacoes.livDescricao = iaSugestao.descricao;
    if (marcados.faixa_etaria && iaSugestao.faixa_etaria) atualizacoes.livFaixaEtaria = iaSugestao.faixa_etaria;
    if (marcados.palavras_chave && iaSugestao.palavras_chave?.length > 0) {
      atualizacoes.livPalavrasChave = iaSugestao.palavras_chave.join(", ");
    }
    if (marcados.edicao && iaSugestao.edicao) {
      atualizacoes.livEdicao = String(iaSugestao.edicao);
    }
    if (marcados.ilustrado && iaSugestao.ilustrado === true) {
      atualizacoes.livIlustrado = true;
    }
    if (marcados.editora_cidade && iaSugestao.editora_cidade) {
      atualizacoes.ediCidade = iaSugestao.editora_cidade;
    }
    if (marcados.editora_estado && iaSugestao.editora_estado) {
      atualizacoes.ediEstado = iaSugestao.editora_estado;
    }
    if (marcados.editora_pais && iaSugestao.editora_pais) {
      atualizacoes.ediPais = iaSugestao.editora_pais;
    }

    if (marcados.categoria_sugerida && iaSugestao.categoria_sugerida) {
      atualizacoes.idCategoria = await resolverCategoria(iaSugestao.categoria_sugerida);
    }
    if (marcados.genero_sugerido && iaSugestao.genero_sugerido) {
      atualizacoes.idGenero = await resolverGenero(iaSugestao.genero_sugerido);
    }

    if (onCamposAutoFillIA) {
      onCamposAutoFillIA(atualizacoes);
    } else {
      Object.entries(atualizacoes).forEach(([campo, valor]) => onFieldChange(campo, valor));
    }

    setIaSugestao(null);
    setIaCamposMarcados({});
  }, [iaSugestao, iaCamposMarcados, resolverAutor, resolverCategoria, resolverGenero, onFieldChange, onCamposAutoFillIA, form.livAutor]);

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
            <label className={fieldClass("livTitulo", highlightedFields)}>
              <span>Título <AutoTag name="livTitulo" highlightedFields={highlightedFields} /></span>
              <input
                name="livTitulo"
                value={form.livTitulo}
                onChange={(e) => onFieldChange("livTitulo", e.target.value)}
                placeholder="Digite o título do livro"
                required
              />
            </label>

             {/* ISBN com scanner e busca */}
            <div className={fieldClass("exemplarISBN", highlightedFields)}>
              <span>ISBN <AutoTag name="exemplarISBN" highlightedFields={highlightedFields} /></span>
              <div className="isbn-input-row">
                <input
                  ref={isbnInputRef}
                  name="exemplarISBN"
                  value={form.exemplarISBN}
                  onChange={(e) => {
                    const valor = e.target.value;
                    onFieldChange("exemplarISBN", valor);
                    setErroISBN(null);

                    // Dispara a busca sozinha assim que o valor já formar um
                    // ISBN-10/13 completo, sem depender de Enter — nem todo
                    // leitor físico de código de barras está configurado para
                    // mandar Enter no final da leitura (alguns mandam Tab,
                    // outros nada). Uma pequena pausa (debounce) evita disparar
                    // no meio da digitação manual, e o "já buscado" evita
                    // repetir a mesma busca a cada re-render.
                    if (isbnDebounceRef.current) clearTimeout(isbnDebounceRef.current);
                    const limpo = valor.replace(/[^0-9X]/gi, "");
                    const pareceCompleto = /^(978|979|97[0-9])\d{10}$|^\d{9}[\dX]$/i.test(limpo);
                    if (pareceCompleto && isbnAutoBuscadoRef.current !== limpo) {
                      isbnDebounceRef.current = setTimeout(() => {
                        isbnAutoBuscadoRef.current = limpo;
                        buscarPorISBN(valor);
                      }, 300);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (isbnDebounceRef.current) clearTimeout(isbnDebounceRef.current);
                      // Lê o valor direto do DOM (e.target.value), não do
                      // estado do React (form.exemplarISBN). Um leitor físico
                      // digita o código inteiro + Enter em poucos milissegundos
                      // — mais rápido do que o React consegue re-renderizar —
                      // então form.exemplarISBN pode ainda estar desatualizado
                      // nesse instante. O valor do input em si nunca está.
                      isbnAutoBuscadoRef.current = e.target.value.replace(/[^0-9X]/gi, "");
                      buscarPorISBN(e.target.value);
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
                Escaneie (câmera ou leitor USB/Bluetooth) ou digite e toque no
                ícone{" "}
                <HiOutlineMagnifyingGlass size={15} style={{ verticalAlign: "middle", flexShrink: 0 }} />{" "}
                para buscar os dados
              </span>
            </div>

            {/* AUTOR */}
            <div className={fieldClass("livAutor", highlightedFields)}>
              <span>Autor <AutoTag name="livAutor" highlightedFields={highlightedFields} /></span>
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
                  <AutorMultiInput
                    value={form.livAutor}
                    autores={autores}
                    onChangeTexto={(texto) => onFieldChange("livAutor", texto)}
                    onSelecionarSugestao={handleSelecionarAutor}
                    placeholder="Ex.: J.K. Rowling, Mary GrandPré"
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
              <span className="isbn-hint-msg">
                Selecione um ou mais autores da lista ou digite novos nomes separados por vírgula.
              </span>

              {/* Anos de nascimento/falecimento do autor — opcionais, usados
                  na ficha catalográfica ao lado do nome (ex.: "1892-1973").
                  Quando há mais de um autor, referem-se só ao primeiro da lista. */}
              <div className="editor-field-grid" style={{ marginTop: "8px", gridTemplateColumns: "1fr 1fr" }}>
                <label className={fieldClass("autorAnoNascimento", highlightedFields)}>
                  <span>Ano de nascimento <AutoTag name="autorAnoNascimento" highlightedFields={highlightedFields} /></span>
                  <input
                    type="number"
                    name="autorAnoNascimento"
                    value={form.autorAnoNascimento}
                    onChange={(e) => onFieldChange("autorAnoNascimento", e.target.value)}
                    placeholder="Ex.: 1892"
                  />
                </label>
                {mostrarFalecimento ? (
                  <label className={fieldClass("autorAnoFalecimento", highlightedFields)}>
                    <span>Ano de falecimento <AutoTag name="autorAnoFalecimento" highlightedFields={highlightedFields} /></span>
                    <div className="inline-select-row">
                      <input
                        type="number"
                        name="autorAnoFalecimento"
                        value={form.autorAnoFalecimento}
                        onChange={(e) => onFieldChange("autorAnoFalecimento", e.target.value)}
                        placeholder="Ex.: 1973"
                      />
                      <button
                        type="button"
                        className="inline-create-btn"
                        title="Remover ano de falecimento"
                        onClick={() => {
                          onFieldChange("autorAnoFalecimento", "");
                          setMostrarFalecimento(false);
                        }}
                      >
                        <HiOutlineXMark />
                      </button>
                    </div>
                  </label>
                ) : (
                  <button
                    type="button"
                    className="isbn-hint-msg"
                    style={{
                      alignSelf: "flex-end",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                      padding: 0,
                      textDecoration: "underline",
                    }}
                    onClick={() => setMostrarFalecimento(true)}
                  >
                    <HiOutlinePlus style={{ verticalAlign: "middle" }} /> Adicionar ano de falecimento
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="editor-form-panel basic-column">
          <div className="basic-column-header">
            <span>Classificação e resumo</span>
          </div>

          {/* GÊNERO */}
          <div className={fieldClass("idGenero", highlightedFields)}>
            <span>Gênero <AutoTag name="idGenero" highlightedFields={highlightedFields} /></span>
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

          {/* CATEGORIA */}
          <div className={fieldClass("idCategoria", highlightedFields)} style={{ marginTop: "12px" }}>
            <span>Categoria <AutoTag name="idCategoria" highlightedFields={highlightedFields} /></span>
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

          <label className={fieldClass("livDescricao", highlightedFields)} style={{ marginTop: "12px" }}>
            <span>Descrição <AutoTag name="livDescricao" highlightedFields={highlightedFields} /></span>
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

            <label className={fieldClass("livCapaURL", highlightedFields)}>
              <span>URL da capa <AutoTag name="livCapaURL" highlightedFields={highlightedFields} /></span>
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
              { campo: "titulo", label: "Título", valor: iaSugestao.titulo, campoFormulario: "livTitulo" },
              { campo: "subtitulo", label: "Subtítulo", valor: iaSugestao.subtitulo, campoFormulario: "livSubtitulo" },
              { campo: "autor_principal", label: "Autor", valor: iaSugestao.autor_principal, campoFormulario: "livAutor" },
              {
                campo: "autor_ano_nascimento",
                label: "Ano de nascimento do autor",
                valor: iaSugestao.autor_ano_nascimento,
                campoFormulario: "autorAnoNascimento",
              },
              {
                campo: "autor_ano_falecimento",
                label: "Ano de falecimento do autor",
                valor: iaSugestao.autor_ano_falecimento,
                campoFormulario: "autorAnoFalecimento",
              },
              { campo: "editora", label: "Editora", valor: iaSugestao.editora, campoFormulario: "livEditora" },
              { campo: "ano_publicacao", label: "Ano", valor: iaSugestao.ano_publicacao, campoFormulario: "livAnoPublicacao" },
              { campo: "paginas", label: "Páginas", valor: iaSugestao.paginas, campoFormulario: "livPaginas" },
              { campo: "idioma", label: "Idioma", valor: iaSugestao.idioma, campoFormulario: "livIdioma" },
              { campo: "categoria_sugerida", label: "Categoria", valor: iaSugestao.categoria_sugerida, campoFormulario: "idCategoria" },
              { campo: "genero_sugerido", label: "Gênero", valor: iaSugestao.genero_sugerido, campoFormulario: "idGenero" },
              { campo: "faixa_etaria", label: "Faixa etária", valor: iaSugestao.faixa_etaria },
              {
                campo: "palavras_chave",
                label: "Palavras-chave",
                valor: iaSugestao.palavras_chave?.length > 0 ? iaSugestao.palavras_chave.join(", ") : "",
                campoFormulario: "livPalavrasChave",
              },
              { campo: "edicao", label: "Edição", valor: iaSugestao.edicao ? `${iaSugestao.edicao}ª ed.` : "" },
              { campo: "ilustrado", label: "Ilustrado", valor: iaSugestao.ilustrado === true ? "Sim" : "" },
              { campo: "editora_cidade", label: "Cidade da editora", valor: iaSugestao.editora_cidade, campoFormulario: "ediCidade" },
              { campo: "editora_estado", label: "Estado da editora", valor: iaSugestao.editora_estado, campoFormulario: "ediEstado" },
              { campo: "editora_pais", label: "País da editora", valor: iaSugestao.editora_pais, campoFormulario: "ediPais" },
              { campo: "descricao", label: "Descrição", valor: iaSugestao.descricao, campoFormulario: "livDescricao" },
            ]
              .filter((item) => item.valor)
              .map((item) => {
                const jaPreenchidoPeloISBN =
                  item.campoFormulario && isbnFilledFields?.has(item.campoFormulario);
                return (
                  <label key={item.campo} className="ia-review-field">
                    <input
                      type="checkbox"
                      checked={!!iaCamposMarcados[item.campo]}
                      onChange={() => handleToggleCampoIA(item.campo)}
                    />
                    <span className="ia-review-field-label">
                      {item.label}
                      {jaPreenchidoPeloISBN && (
                        <span className="ia-review-field-isbn-tag">via ISBN</span>
                      )}
                    </span>
                    <span className="ia-review-field-valor">{item.valor}</span>
                  </label>
                );
              })}
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