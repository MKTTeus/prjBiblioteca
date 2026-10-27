import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import useDialogFocus from "../../../../../hooks/useDialogFocus";
import {
  addExemplares,
  createBook,
  getBook,
  getGeneros,
  getAutores,
  getEditoras,
  updateBook,
  updateExemplar,
  uploadCover,
  createGenero,
  completarLivroComIA,
} from "../../../../../services/api";
import { HiOutlineSave, HiOutlineX, HiOutlineBookOpen, HiOutlineOfficeBuilding, HiOutlineClipboardList } from "react-icons/hi";
import LoadingButton from "../../../../../components/LoadingButton/LoadingButton";
import { useToast } from "../../../../../contexts/ToastContext";
import { useAuth } from "../../../../../contexts/AuthContext";
import useRegistrationDraft, { readRegistrationDraft } from "../../../../../hooks/useRegistrationDraft";
import BasicInfoSection from "./BasicInfoSection";
import PublicationInfoSection from "./PublicationInfoSection";
import TombosSection from "./TombosSection";
import ConfirmExitModal from "../../../../../components/ConfirmExitModal/ConfirmExitModal";
import ConfirmModal from "../../../../../components/ConfirmModal/ConfirmModal";
import FieldOriginIcon, { FIELD_LABELS } from "./FieldOriginIcon";
import FieldSuggestionModal from "./FieldSuggestionModal";
import "./BookFormModal.css";

function normalizeText(value = "") {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

// Distância de Levenshtein simples (número mínimo de inserções/remoções/
// substituições para transformar uma string na outra) — usada para detectar
// nomes de autor/gênero parecidos (não idênticos) e sugerir ao
// admin reaproveitar o já cadastrado em vez de criar uma entrada duplicada.
function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  let anterior = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const atual = [i];
    for (let j = 1; j <= n; j++) {
      const custo = a[i - 1] === b[j - 1] ? 0 : 1;
      atual[j] = Math.min(
        anterior[j] + 1, // remoção
        atual[j - 1] + 1, // inserção
        anterior[j - 1] + custo // substituição
      );
    }
    anterior = atual;
  }
  return anterior[n];
}

// Similaridade normalizada entre 0 (nada parecido) e 1 (idêntico), baseada
// na distância de Levenshtein relativa ao tamanho do maior texto.
function similaridadeTexto(a, b) {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

// Limiar a partir do qual dois nomes são considerados "parecidos o
// suficiente" para valer a pena perguntar ao admin — calibrado para pegar
// erros de digitação e pequenas variações (plural, acentuação já é
// ignorada por normalizeText) sem disparar para nomes genuinamente
// diferentes. Nomes muito curtos (< 3 caracteres) são ignorados, pois
// qualquer palavra curta tende a "parecer" com outra por acaso.
const LIMIAR_SIMILARIDADE = 0.72;

// Procura, numa lista de gêneros/autores já cadastrados, um item
// cujo nome seja parecido (mas não idêntico — isso já é tratado à parte)
// com o nome informado. Devolve o item mais parecido acima do limiar, ou
// null se nenhum for parecido o bastante.
function encontrarNomeParecido(nome, lista, chaveNome) {
  const nomeNormalizado = normalizeText(nome);
  if (nomeNormalizado.length < 3) return null;

  let melhorItem = null;
  let melhorScore = 0;
  for (const item of lista) {
    if (item?.pendente) continue; // não compara com outra pendência ainda não salva
    const itemNormalizado = normalizeText(item?.[chaveNome]);
    if (!itemNormalizado || itemNormalizado === nomeNormalizado) continue;
    const score = similaridadeTexto(nomeNormalizado, itemNormalizado);
    if (score >= LIMIAR_SIMILARIDADE && score > melhorScore) {
      melhorItem = item;
      melhorScore = score;
    }
  }
  return melhorItem;
}

const CAMPO_NOME_POR_TIPO = {
  genero: "genNome",
  autor: "autNome",
};

const LABEL_POR_TIPO = {
  genero: "gênero",
  autor: "autor",
};

const SECTIONS = [
  { id: "basic", label: "Informações Básicas" },
  { id: "publication", label: "Informações de Publicação" },
  { id: "copies", label: "Editar Tombos" },
];

// Campos que vivem na seção "Informações de Publicação". Usado só para saber
// se devemos rolar a tela até ela quando o ISBN ou a IA preenchem algo lá —
// antes essa seção ficava atrás de uma aba não visitada e o preenchimento
// passava despercebido; agora ela está sempre visível, mas ainda pode estar
// fora da área de rolagem no momento em que o dado chega.
const PUBLICATION_FIELD_KEYS = new Set([
  "livSubtitulo",
  "livEditora",
  "livAnoPublicacao",
  "livPaginas",
  "livEdicao",
  "livIdioma",
  "livFaixaEtaria",
  "livCDD",
  "livAlturaCm",
  "livLarguraCm",
  "livIlustrado",
  "livPalavrasChave",
  "ediCidade",
  "ediEstado",
  "ediPais",
]);

const AI_FIELD_KEYS = {
  livTitulo: "titulo", livSubtitulo: "subtitulo", livAutor: "autor_principal",
  autorAnoNascimento: "autor_ano_nascimento", autorAnoFalecimento: "autor_ano_falecimento",
  livEditora: "editora", livAnoPublicacao: "ano_publicacao", livPaginas: "paginas",
  livDescricao: "descricao", idGenero: "genero_sugerido", livIdioma: "idioma",
  livFaixaEtaria: "faixa_etaria", livPalavrasChave: "palavras_chave",
  livEdicao: "edicao", livIlustrado: "ilustrado", ediCidade: "editora_cidade",
  ediEstado: "editora_estado", ediPais: "editora_pais", livCDD: "cdd",
  livAlturaCm: "altura_cm", livLarguraCm: "largura_cm", livCapaURL: "url_capa",
  exemplarISBN: "isbn_sugerido",
};

const DEFAULT_FORM = {
  livTitulo: "",
  livSubtitulo: "",
  livAutor: "",
  autorAnoNascimento: "",
  autorAnoFalecimento: "",
  livDescricao: "",
  livEditora: "",
  livAnoPublicacao: "",
  livPaginas: "",
  livCapaURL: "",
  livIdioma: "",
  livFaixaEtaria: "",
  livPalavrasChave: "",
  idGenero: "",
  exemplarISBN: "",
  livCDD: "",
  livCDDSugerida: false,
  livEdicao: "",
  livAlturaCm: "",
  livLarguraCm: "",
  livIlustrado: false,
  ediCidade: "",
  ediEstado: "",
  ediPais: "Brasil",
};

// Campos de texto que podem vir de uma busca por ISBN (usado para limpar
// dados de uma busca anterior quando uma nova busca não os retorna — ver
// handlePreencherISBN). idGenero é tratado à parte, pois tem
// lógica de conversão numérica própria.
const ISBN_FILLABLE_FIELDS = [
  "livTitulo",
  "livSubtitulo",
  "livAutor",
  "autorAnoNascimento",
  "autorAnoFalecimento",
  "livEditora",
  "livAnoPublicacao",
  "livPaginas",
  "livCapaURL",
  "livDescricao",
  "livIdioma",
  "livPalavrasChave",
  "ediCidade",
  "ediEstado",
  "ediPais",
];

// Campos que, embora não bloqueiem o salvamento (diferente de título/páginas,
// validados em validarFormulario), costumam ser preenchidos em um cadastro
// completo. Se algum estiver em branco, o usuário é avisado antes de salvar —
// mas o aviso deixa claro que vários deles podem legitimamente não existir
// para aquele livro específico (ex: nem todo livro tem subtítulo ou edição).
const CAMPOS_OPCIONAIS_PARA_CONFIRMACAO = [
  { key: "livSubtitulo", label: "Subtítulo" },
  { key: "livAutor", label: "Autor" },
  { key: "autorAnoNascimento", label: "Ano de nascimento do autor" },
  { key: "autorAnoFalecimento", label: "Ano de falecimento do autor" },
  { key: "livDescricao", label: "Descrição / Sinopse" },
  { key: "livEditora", label: "Editora" },
  { key: "livAnoPublicacao", label: "Ano de publicação" },
  { key: "livCapaURL", label: "Capa do livro" },
  { key: "livIdioma", label: "Idioma" },
  { key: "livFaixaEtaria", label: "Faixa etária" },
  { key: "livPalavrasChave", label: "Palavras-chave" },
  { key: "idGenero", label: "Gênero" },
  { key: "exemplarISBN", label: "ISBN" },
  { key: "livEdicao", label: "Edição" },
  { key: "livAlturaCm", label: "Altura (cm)" },
  { key: "livLarguraCm", label: "Largura (cm)" },
  { key: "ediCidade", label: "Cidade da editora" },
  { key: "ediEstado", label: "Estado da editora" },
];

function obterCamposEmBranco(form) {
  return CAMPOS_OPCIONAIS_PARA_CONFIRMACAO.filter(({ key }) => {
    const valor = form[key];
    return valor === "" || valor === null || valor === undefined;
  });
}

// Prefixo usado para identificar, dentro do próprio form, um gênero
// que ainda não existe no banco — só é persistido de fato ao salvar o livro.
const PENDING_PREFIX = "novo:";

function isPendingId(value) {
  return typeof value === "string" && value.startsWith(PENDING_PREFIX);
}

function pendingIdFor(nome) {
  return `${PENDING_PREFIX}${nome}`;
}

function pendingNomeFrom(pendingId) {
  return pendingId.slice(PENDING_PREFIX.length);
}

const DEFAULT_CREATE_ADD_CONFIG = {
  prefixo: "T",
  quantidade: 1,
};

const DEFAULT_EDIT_ADD_CONFIG = {
  prefixo: "T",
  quantidade: 0,
};

function BookCoverPreview({ src, title, onClose }) {
  const previewRef = useDialogFocus(true, onClose);
  return createPortal(
    <div className="book-editor-cover-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={previewRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={`Capa completa de ${title}`} className="book-editor-cover-dialog">
        <button type="button" onClick={onClose} className="book-editor-cover-close" aria-label="Fechar visualização da capa"><HiOutlineX /></button>
        <img src={src} alt={`Capa completa de ${title}`} />
        <span>{title}</span>
      </div>
    </div>, document.body
  );
}

export default function BookFormModal({ onClose, onBookSaved, bookToEdit, initialSection = "basic" }) {
  const { addToast } = useToast();
  const { user } = useAuth();
  const [generos, setGeneros] = useState([]);
  const [autores, setAutores] = useState([]);
  const [editoras, setEditoras] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saveErrors, setSaveErrors] = useState([]);
  const [savedParts, setSavedParts] = useState(0);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [loadedBookId, setLoadedBookId] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [initialForm, setInitialForm] = useState(DEFAULT_FORM);
  const [exemplares, setExemplares] = useState([]);
  const [initialExemplares, setInitialExemplares] = useState([]);
  const [addConfig, setAddConfig] = useState(DEFAULT_CREATE_ADD_CONFIG);
  const [initialAddConfig, setInitialAddConfig] = useState(DEFAULT_CREATE_ADD_CONFIG);
  const draftExtra = useMemo(() => ({ exemplares, addConfig }), [exemplares, addConfig]);
  const { clearDraft } = useRegistrationDraft("livros", user, {
    open: true,
    dirty: !loadingDetails && (!bookToEdit || loadedBookId === bookToEdit.idLivro) && formTemAlteracoes(),
    form,
    recordId: bookToEdit?.idLivro || null,
    extra: draftExtra,
  });
  const [confirmandoSaida, setConfirmandoSaida] = useState(false);
  const [confirmandoCamposEmBranco, setConfirmandoCamposEmBranco] = useState(false);
  const [camposEmBrancoDetectados, setCamposEmBrancoDetectados] = useState([]);

  // Guarda a sugestão de possível duplicata (autor/gênero) em
  // análise no momento, para exibir o modal de confirmação pedindo ao admin
  // que decida entre reaproveitar o item já existente ou manter o novo.
  const [duplicidadeSugestao, setDuplicidadeSugestao] = useState(null);
  // Guarda a função "resolve" da Promise pendente enquanto o admin não
  // responde ao modal de duplicidade (ver perguntarSubstituicao abaixo).
  const duplicidadeResolverRef = useRef(null);

  // Campos preenchidos automaticamente pelo ISBN ou pela IA ficam aqui
  // temporariamente para receber destaque visual na tela — some sozinho
  // depois de um tempo ou assim que o usuário edita o campo manualmente.
  const [highlightedFields, setHighlightedFields] = useState(() => new Set());
  // Apenas memória do modal: a origem nunca entra no form enviado ao backend.
  const [fieldOrigins, setFieldOrigins] = useState({});
  const [regeneratingField, setRegeneratingField] = useState(null);
  const [fieldSuggestion, setFieldSuggestion] = useState(null);
  const [coverPreviewOpen, setCoverPreviewOpen] = useState(false);
  // Diferente do highlightedFields acima (que é só o "brilho" visual e some
  // sozinho depois de alguns segundos), este aqui não expira — serve para o
  // painel de sugestões da IA saber, a qualquer momento, quais campos já
  // vieram do ISBN e evitar que o admin sobrescreva sem perceber.
  const [isbnFilledFields, setIsbnFilledFields] = useState(() => new Set());
  const highlightTimeoutRef = useRef(null);
  const basicSectionRef = useRef(null);
  const publicationSectionRef = useRef(null);
  const copiesSectionRef = useRef(null);
  const editorContentRef = useRef(null);
  const [activeSection, setActiveSection] = useState("basic");
  const sectionRefs = {
    basic: basicSectionRef,
    publication: publicationSectionRef,
    copies: copiesSectionRef,
  };

  function scrollToSection(id) {
    const content = editorContentRef.current;
    const section = sectionRefs[id]?.current;
    if (!content || !section) return;
    setActiveSection(id);
    content.scrollTo({
      top: content.scrollTop + section.getBoundingClientRect().top - content.getBoundingClientRect().top - 16,
      behavior: "smooth",
    });
  }

  function updateActiveSection() {
    const content = editorContentRef.current;
    if (!content) return;
    const current = [...SECTIONS].reverse().find(({ id }) => {
      const section = sectionRefs[id]?.current;
      return section && section.getBoundingClientRect().top <= content.getBoundingClientRect().top + 90;
    });
    setActiveSection(current?.id || "basic");
  }

  const semExemplares = !loadingDetails && Number(addConfig.quantidade || 0) === 0 &&
    (bookToEdit ? loadedBookId === bookToEdit.idLivro && exemplares.every((ex) => String(ex.exeLivStatus || "").toLowerCase().includes("desativado")) : true);

  function irParaExemplares() {
    scrollToSection("copies");
    copiesSectionRef.current?.querySelector('input[type="number"]')?.focus({ preventScroll: true });
  }

  useEffect(() => {
    if (initialSection === "copies" && bookToEdit && loadedBookId === bookToEdit.idLivro && !loadingDetails) irParaExemplares();
  }, [initialSection, bookToEdit, loadedBookId, loadingDetails]);

  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
    };
  }, []);

  // Marca campos como "preenchidos automaticamente" (destaque visual) e, se
  // algum deles vive na seção de Publicação, rola a tela até lá — é o caso
  // que mais gerava a sensação de "não sei o que mudou".
  function marcarCamposPreenchidosAutomaticamente(nomesCampos) {
    if (!nomesCampos || nomesCampos.length === 0) return;

    setHighlightedFields((prev) => new Set([...prev, ...nomesCampos]));

    if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
    highlightTimeoutRef.current = setTimeout(() => {
      setHighlightedFields(new Set());
    }, 9000);

    const tocaPublicacao = nomesCampos.some((campo) => PUBLICATION_FIELD_KEYS.has(campo));
    if (tocaPublicacao && publicationSectionRef.current) {
      setTimeout(() => {
        scrollToSection("publication");
      }, 120);
    }
  }

  const carregarLivroEmEdicao = useCallback(async () => {
    setLoadedBookId(null);
    setHighlightedFields(new Set());
    setIsbnFilledFields(new Set());
    setFieldOrigins({});

    if (!bookToEdit) {
      const draft = readRegistrationDraft("livros", user);
      const restored = draft && !draft.recordId;
      setForm(restored ? { ...DEFAULT_FORM, ...draft.form } : DEFAULT_FORM);
      setInitialForm(DEFAULT_FORM);
      setExemplares(restored ? draft.extra?.exemplares || [] : []);
      setInitialExemplares([]);
      setAddConfig(restored ? { ...DEFAULT_CREATE_ADD_CONFIG, ...draft.extra?.addConfig } : DEFAULT_CREATE_ADD_CONFIG);
      setInitialAddConfig(DEFAULT_CREATE_ADD_CONFIG);
      if (restored) addToast("Rascunho de livro recuperado.", "success");
      return;
    }

    try {
      setLoadingDetails(true);
      const detalhes = await getBook(bookToEdit.idLivro);
      const livro = detalhes?.livro || bookToEdit;
      const exemplaresCarregados = Array.isArray(detalhes?.exemplares)
        ? detalhes.exemplares.map((ex) => ({
            ...ex,
            exeLivTombo: ex.exeLivTombo || "",
            exeLivStatus: String(ex.exeLivStatus || "").toLowerCase().includes("desativado") ? "Desativado" : ex.exeLivStatus || "Disponível",
            exeLivDescricao: ex.exeLivDescricao || "",
          }))
        : [];

      const nextForm = {
        livTitulo: livro.livTitulo || "",
        livSubtitulo: livro.livSubtitulo || "",
        livAutor: livro.livAutor || "",
        autorAnoNascimento: livro.autorAnoNascimento || "",
        autorAnoFalecimento: livro.autorAnoFalecimento || "",
        livDescricao: livro.livDescricao || "",
        livEditora: livro.livEditora || "",
        livAnoPublicacao: livro.livAnoPublicacao || "",
        livPaginas: livro.livPaginas || "",
        livCapaURL: livro.livCapaURL || "",
        livIdioma: livro.livIdioma || "",
        livFaixaEtaria: livro.livFaixaEtaria || "",
        livPalavrasChave: livro.livPalavrasChave || "",
        idGenero: livro.idGenero || 1,
        exemplarISBN: livro.livISBN || livro.exemplarISBN || livro.exeLivISBN || "",
        livCDD: livro.livCDD || "",
        livCDDSugerida: livro.livCDDSugerida || false,
        livEdicao: livro.livEdicao || "",
        livAlturaCm: livro.livAlturaCm || "",
        livLarguraCm: livro.livLarguraCm || "",
        livIlustrado: livro.livIlustrado || false,
        ediCidade: livro.ediCidade || "",
        ediEstado: livro.ediEstado || "",
        ediPais: livro.ediPais || "Brasil",
      };

      const draft = readRegistrationDraft("livros", user);
      const restored = draft && draft.recordId === bookToEdit.idLivro;
      setForm(restored ? { ...nextForm, ...draft.form } : nextForm);
      setInitialForm(nextForm);
      setExemplares(restored ? draft.extra?.exemplares || exemplaresCarregados : exemplaresCarregados);
      setInitialExemplares(exemplaresCarregados);
      setAddConfig(restored ? { ...DEFAULT_EDIT_ADD_CONFIG, ...draft.extra?.addConfig } : DEFAULT_EDIT_ADD_CONFIG);
      setInitialAddConfig(DEFAULT_EDIT_ADD_CONFIG);
      setLoadedBookId(bookToEdit.idLivro);
      if (restored) addToast("Rascunho de livro recuperado.", "success");
    } catch (err) {
      console.error(err);
      addToast("Falha ao carregar detalhes do livro", "error");
    } finally {
      setLoadingDetails(false);
    }
  }, [bookToEdit, addToast, user?.email]);

  const carregarMetadados = useCallback(async () => {
    try {
      const [gens, auts, eds] = await Promise.all([getGeneros(), getAutores(), getEditoras()]);
      setGeneros(gens || []);
      setAutores(auts || []);
      setEditoras(eds || []);
    } catch (err) {
      console.error(err);
      addToast("Falha ao carregar metadados do formulário", "error");
    }
  }, [addToast]);

  useEffect(() => {
    carregarMetadados();
  }, [carregarMetadados]);

  useEffect(() => {
    carregarLivroEmEdicao();
  }, [carregarLivroEmEdicao]);

  function handleFieldChange(name, value) {
    setForm((prev) => ({
      ...prev,
      [name]:
        name === "idGenero" && !isPendingId(value)
          ? value === "" || value === null || value === undefined
            ? ""
            : Number(value)
          : value,
    }));

    // Editar manualmente um campo que tinha sido preenchido automaticamente
    // (ISBN/IA) faz o destaque perder o sentido — ele some na hora.
    setHighlightedFields((prev) => {
      if (!prev.has(name)) return prev;
      const next = new Set(prev);
      next.delete(name);
      return next;
    });
    setIsbnFilledFields((prev) => {
      if (!prev.has(name)) return prev;
      const next = new Set(prev);
      next.delete(name);
      return next;
    });
    setFieldOrigins((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }

  function handleExemplarChange(id, field, value) {
    setExemplares((prev) =>
      prev.map((ex) => (ex.idExemplar === id ? { ...ex, [field]: value } : ex))
    );
  }

  function handleAddConfigChange(field, value) {
    setAddConfig((prev) => ({
      ...prev,
      [field]: field === "quantidade" ? Math.max(0, Number(value)) : value,
    }));
  }

  function handlePreencherISBN(dados) {
    const camposAlterados = [];
    const next = { ...form };

    // Cada busca por ISBN representa a consulta de um livro (possivelmente
    // diferente do que estava no formulário até então). Campos que ainda
    // estavam marcados como "vindos do ISBN anterior" (ou seja, o usuário
    // não os editou manualmente) e que a busca atual não retornou são
    // limpos aqui — do contrário eles ficariam com o valor do livro
    // anterior, mas continuariam etiquetados como "já preenchido via ISBN"
    // referentes ao ISBN atual, o que é enganoso.
    ISBN_FILLABLE_FIELDS.forEach((campo) => {
      if (isbnFilledFields.has(campo) && (dados[campo] === undefined || dados[campo] === null || dados[campo] === "")) {
        next[campo] = DEFAULT_FORM[campo];
      }
    });

    const setSeHouver = (campo, valor) => {
      if (valor !== undefined && valor !== null && valor !== "" && valor !== form[campo]) {
        next[campo] = valor;
        camposAlterados.push(campo);
      }
    };

    setSeHouver("livTitulo", dados.livTitulo);

    setSeHouver("livSubtitulo", dados.livSubtitulo);
    setSeHouver("livAutor", dados.livAutor);
    setSeHouver("autorAnoNascimento", dados.autorAnoNascimento);
    setSeHouver("autorAnoFalecimento", dados.autorAnoFalecimento);
    setSeHouver("livEditora", dados.livEditora);
    setSeHouver("livAnoPublicacao", dados.livAnoPublicacao);
    setSeHouver("livPaginas", dados.livPaginas);
    setSeHouver("livCapaURL", dados.livCapaURL);
    setSeHouver("livDescricao", dados.livDescricao);
    setSeHouver("livIdioma", dados.livIdioma);
    setSeHouver("livPalavrasChave", dados.livPalavrasChave);
    setSeHouver("ediCidade", dados.ediCidade);
    setSeHouver("ediEstado", dados.ediEstado);
    setSeHouver("ediPais", dados.ediPais);
    setSeHouver("exemplarISBN", dados.exemplarISBN);

    if (isbnFilledFields.has("idGenero") && (dados.idGenero === "" || dados.idGenero === null || dados.idGenero === undefined)) {
      next.idGenero = DEFAULT_FORM.idGenero;
    }

    if (dados.idGenero !== "" && dados.idGenero !== null && dados.idGenero !== undefined) {
      const valorGenero = isPendingId(dados.idGenero) ? dados.idGenero : Number(dados.idGenero);
      if (valorGenero !== form.idGenero) {
        next.idGenero = valorGenero;
        camposAlterados.push("idGenero");
      }
    }

    setForm(next);
    setFieldOrigins((prev) => {
      const origins = { ...prev };
      for (const campo of [...ISBN_FILLABLE_FIELDS, "idGenero"]) {
        if (origins[campo] === "isbn" && !next[campo]) delete origins[campo];
      }
      camposAlterados.forEach((campo) => { origins[campo] = "isbn"; });
      return origins;
    });
    marcarCamposPreenchidosAutomaticamente(camposAlterados);
    // Substitui (em vez de somar) o conjunto anterior: os campos "vindos do
    // ISBN" precisam refletir apenas a busca atual, não a de um livro
    // anterior que o usuário tenha consultado antes neste mesmo formulário.
    setIsbnFilledFields((prev) => new Set([
      ...[...prev].filter((campo) => Boolean(next[campo])),
      ...camposAlterados,
    ]));
    addToast("Dados preenchidos a partir do ISBN! Campos alterados foram destacados.", "success");
  }

  // Chamado pela seção Básica ao clicar em "Aplicar selecionados" no painel
  // de sugestões da IA — aplica tudo de uma vez e marca os campos para
  // destaque, com o mesmo tratamento usado no preenchimento por ISBN.
  function handleCamposAutoFillIA(atualizacoes) {
    const entradas = Object.entries(atualizacoes || {});
    if (entradas.length === 0) return;

    setForm((prev) => ({ ...prev, ...atualizacoes }));
    setFieldOrigins((prev) => ({
      ...prev,
      ...Object.fromEntries(entradas.map(([campo]) => [campo, "ia"])),
    }));
    setIsbnFilledFields((prev) => new Set([...prev].filter((campo) => !Object.hasOwn(atualizacoes, campo))));
    marcarCamposPreenchidosAutomaticamente(entradas.map(([campo]) => campo));
  }

  async function regenerateField(campo) {
    if (regeneratingField || !AI_FIELD_KEYS[campo]) return;
    if (!form.exemplarISBN && !form.livTitulo && !form.livAutor) {
      addToast("Informe ISBN, título ou autor para gerar uma sugestão.", "error");
      return;
    }
    setRegeneratingField(campo);
    setFieldSuggestion(null);
    try {
      const genero = generos.find((item) => String(item.idGenero) === String(form.idGenero));
      const result = await completarLivroComIA({
        campo_alvo: campo,
        valor_atual: String(form[campo] ?? ""),
        isbn: form.exemplarISBN || undefined,
        livTitulo: form.livTitulo || undefined,
        livAutor: form.livAutor || undefined,
        livEditora: form.livEditora || undefined,
        livAnoPublicacao: Number(form.livAnoPublicacao) || undefined,
        livPaginas: Number(form.livPaginas) || undefined,
        livDescricao: form.livDescricao || undefined,
        generoNome: genero?.genNome,
        generos_existentes: generos.map((item) => item.genNome),
      });
      const value = result?.[AI_FIELD_KEYS[campo]];
      if (value === undefined || value === null || value === "" || (Array.isArray(value) && !value.length)) {
        addToast("A IA não encontrou uma sugestão segura para este campo.", "info");
        return;
      }
      setFieldSuggestion({ campo, value });
    } catch (err) {
      addToast(err?.data?.detail || "Não foi possível gerar uma sugestão agora.", "error");
    } finally {
      setRegeneratingField(null);
    }
  }

  async function applyFieldSuggestion() {
    if (!fieldSuggestion) return;
    const { campo, value } = fieldSuggestion;
    let normalized = Array.isArray(value) ? value.join(", ") : value;
    if (campo === "idGenero") {
      const existing = generos.find((item) => normalizeText(item.genNome) === normalizeText(value));
      const item = existing || await handleCriarGenero(String(value));
      if (!item) return;
      normalized = item.idGenero;
    }
    if (campo === "livFaixaEtaria" && !["Infantil", "Juvenil", "Adulto", "Livre"].includes(normalized)) {
      addToast("A sugestão de faixa etária não corresponde às opções do cadastro.", "error");
      return;
    }
    handleCamposAutoFillIA({ [campo]: normalized });
    setFieldSuggestion(null);
  }

  // Recebe o arquivo já ajustado (giro/redimensionamento) pelo
  // CoverImageEditor — a otimização final (WebP, limite de 1600px)
  // continua acontecendo no backend, no endpoint de upload.
  async function handleUpload(file) {
    if (!file) return;
    try {
      setLoading(true);
      const res = await uploadCover(file);
      setForm((prev) => ({ ...prev, livCapaURL: res.url }));
      setFieldOrigins((prev) => {
        const next = { ...prev };
        delete next.livCapaURL;
        return next;
      });
      setIsbnFilledFields((prev) => new Set([...prev].filter((campo) => campo !== "livCapaURL")));
    } catch (err) {
      console.error(err);
      addToast(err?.message || "Falha ao enviar a capa", "error");
    } finally {
      setLoading(false);
    }
  }

  function validarFormulario() {
    const erros = [];
    if (!form.livTitulo || !form.livTitulo.trim()) {
      erros.push("Informe o título do livro.");
    }
    if (form.livPaginas === "" || form.livPaginas === null || form.livPaginas === undefined) {
      erros.push("Informe o número de páginas (a busca por ISBN nem sempre traz esse dado).");
    } else if (Number(form.livPaginas) <= 0) {
      erros.push("O número de páginas deve ser maior que zero.");
    }
    return erros;
  }

  // Persiste de fato, no backend, qualquer gênero que ainda esteja
  // pendente (id no formato "novo:Nome"), e devolve o form já com os ids
  // reais. É só aqui — no momento de salvar o livro — que esse registro
  // passa a existir no banco; se o usuário cancelar antes disso, nada foi
  // gravado por causa de um nome digitado errado.
  async function resolverPendencias(formAtual) {
    const resolvido = { ...formAtual };

    if (isPendingId(resolvido.idGenero)) {
      const nome = pendingNomeFrom(resolvido.idGenero);
      try {
        const criado = await createGenero({ genNome: nome });
        setGeneros((prev) => [
          ...prev.filter((item) => item.idGenero !== resolvido.idGenero),
          criado,
        ]);
        resolvido.idGenero = criado.idGenero;
      } catch (err) {
        if (err?.status === 409) {
          const gensAtualizados = await getGeneros();
          setGeneros(gensAtualizados || []);
          const existente = (gensAtualizados || []).find(
            (item) => normalizeText(item.genNome) === normalizeText(nome)
          );
          if (existente) {
            resolvido.idGenero = existente.idGenero;
          } else {
            throw err;
          }
        } else {
          throw err;
        }
      }
    }

    return resolvido;
  }

  // Mesma lógica usada para decidir se há algo a persistir ao editar um
  // livro (handleSave), reaproveitada aqui para saber se vale a pena avisar
  // o usuário antes de fechar o formulário sem salvar.
  function formTemAlteracoes() {
    const normalizedForm = normalizeBookForm(form);
    const normalizedInitialForm = normalizeBookForm(initialForm);
    if (JSON.stringify(normalizedForm) !== JSON.stringify(normalizedInitialForm)) {
      return true;
    }

    const normalizedExemplares = normalizeExemplares(exemplares);
    const normalizedInitialExemplares = normalizeExemplares(initialExemplares);
    if (JSON.stringify(normalizedExemplares) !== JSON.stringify(normalizedInitialExemplares)) {
      return true;
    }

    if (
      Number(addConfig.quantidade || 0) > 0 &&
      JSON.stringify(normalizeAddConfig(addConfig)) !==
        JSON.stringify(normalizeAddConfig(initialAddConfig))
    ) {
      return true;
    }

    return false;
  }

  function handleRequestClose() {
    if (formTemAlteracoes()) {
      setConfirmandoSaida(true);
    } else {
      clearDraft();
      onClose();
    }
  }

  function confirmarSaida() {
    setConfirmandoSaida(false);
    clearDraft();
    onClose();
  }

  // Ponto de entrada do botão "Salvar". Faz a validação obrigatória (título,
  // páginas) e, se passar, verifica se há campos opcionais em branco para
  // pedir confirmação antes de seguir para o salvamento de fato.
  function handleSave() {
    const errosValidacao = validarFormulario();
    if (errosValidacao.length > 0) {
      errosValidacao.forEach((msg) => addToast(msg, "error"));
      return;
    }

    const camposEmBranco = obterCamposEmBranco(form);
    if (camposEmBranco.length > 0) {
      setCamposEmBrancoDetectados(camposEmBranco);
      setConfirmandoCamposEmBranco(true);
      return;
    }

    executarSalvar();
  }

  function confirmarSalvarComCamposEmBranco() {
    setConfirmandoCamposEmBranco(false);
    executarSalvar();
  }

  async function executarSalvar() {
    setLoading(true);
    setSaveErrors([]);
    setSavedParts(0);
    try {
      let formResolvido;
      try {
        formResolvido = await resolverPendencias(form);
      } catch (err) {
        console.error("Erro ao criar gênero pendente:", err);
        addToast("Falha ao criar gênero pendente. Tente novamente.", "error");
        return;
      }
      if (formResolvido !== form) {
        setForm(formResolvido);
      }

      if (bookToEdit) {
        const normalizedForm = normalizeBookForm(formResolvido);
        const normalizedInitialForm = normalizeBookForm(initialForm);
        const formChanged =
          JSON.stringify(normalizedForm) !== JSON.stringify(normalizedInitialForm);

        const normalizedExemplares = normalizeExemplares(exemplares);
        const normalizedInitialExemplares = normalizeExemplares(initialExemplares);
        const changedExemplares = normalizedExemplares.filter((exemplar) => {
          const initialExemplar = normalizedInitialExemplares.find(
            (item) => item.idExemplar === exemplar.idExemplar
          );
          return JSON.stringify(exemplar) !== JSON.stringify(initialExemplar);
        });

        const addConfigChanged =
          Number(addConfig.quantidade || 0) > 0 &&
          JSON.stringify(normalizeAddConfig(addConfig)) !==
            JSON.stringify(normalizeAddConfig(initialAddConfig));

        const errors = [];
        let succeeded = 0;

        if (formChanged) {
          try {
            await updateBook(bookToEdit.idLivro, normalizedForm);
            setInitialForm(formResolvido);
            succeeded += 1;
          } catch (err) {
            console.error("Erro ao salvar dados do livro:", err);
            errors.push(`Dados do livro: ${getErrorMessage(err)}`);
          }
        }

        if (changedExemplares.length > 0) {
          const exemplarResults = await Promise.allSettled(
            changedExemplares.map((exemplar) =>
              updateExemplar(exemplar.idExemplar, {
                exeLivTombo: exemplar.exeLivTombo,
                exeLivStatus: exemplar.exeLivStatus,
                exeLivDescricao: exemplar.exeLivDescricao,
              })
            )
          );
          exemplarResults.forEach((result, index) => {
            if (result.status === "rejected") {
              const exemplar = changedExemplares[index];
              errors.push(
                `Tombo ${exemplar.exeLivTombo || exemplar.idExemplar}: ${getErrorMessage(result.reason)}`
              );
            } else {
              const exemplar = changedExemplares[index];
              setInitialExemplares((prev) => prev.map((item) => item.idExemplar === exemplar.idExemplar ? exemplar : item));
              succeeded += 1;
            }
          });
        }

        if (addConfigChanged) {
          try {
            await addExemplares(
              bookToEdit.idLivro,
              Number(addConfig.quantidade),
              addConfig.prefixo || "T"
            );
            setAddConfig(DEFAULT_EDIT_ADD_CONFIG);
            setInitialAddConfig(DEFAULT_EDIT_ADD_CONFIG);
            succeeded += 1;
          } catch (err) {
            errors.push(`Novos tombos: ${getErrorMessage(err)}`);
          }
        }

        if (errors.length > 0) {
          setSaveErrors(errors);
          setSavedParts(succeeded);
          addToast("Algumas alterações não foram salvas. Consulte os detalhes no formulário.", "error", 8000);
          return;
        }
      } else {
        if (Number(addConfig.quantidade) < 1) {
          addToast("Informe ao menos um exemplar para cadastrar o livro no acervo.", "error");
          setLoading(false);
          return;
        }
        await createBook({
          livro: { ...normalizeBookForm(formResolvido) },
          quantidade_exemplares: Number(addConfig.quantidade),
          prefixo_tombo: addConfig.prefixo || "T",
        });
      }

      addToast(bookToEdit ? "Livro atualizado com sucesso" : "Livro cadastrado com sucesso", "success");
      setFieldOrigins({});
      clearDraft();
      if (onBookSaved) onBookSaved();
    } catch (err) {
      console.error(err);
      const message = getErrorMessage(err, bookToEdit ? "Não foi possível atualizar o livro. Confira o cadastro e tente novamente." : "Não foi possível cadastrar o livro. Confira os dados e tente novamente.");
      setSaveErrors([message]);
      addToast(message, "error", 8000);
    } finally {
      setLoading(false);
    }
  }

  // Abre o modal perguntando se o admin quer reaproveitar um item já
  // cadastrado (parecido com o que está sendo digitado/preenchido via ISBN
  // ou IA) em vez de criar uma entrada nova possivelmente duplicada.
  // Devolve uma Promise<boolean> que só resolve quando o admin responder —
  // as funções handleCriarGenero/Autor abaixo já são async e
  // aguardam essa resposta antes de decidir o que fazer.
  function perguntarSubstituicao(tipo, nomeDigitado, itemExistente) {
    return new Promise((resolve) => {
      duplicidadeResolverRef.current = resolve;
      setDuplicidadeSugestao({ tipo, nomeDigitado, itemExistente });
    });
  }

  function confirmarUsarExistenteNaDuplicidade() {
    duplicidadeResolverRef.current?.(true);
    duplicidadeResolverRef.current = null;
    setDuplicidadeSugestao(null);
  }

  function manterNovoNaDuplicidade() {
    duplicidadeResolverRef.current?.(false);
    duplicidadeResolverRef.current = null;
    setDuplicidadeSugestao(null);
  }

  // Não cria nada no backend ainda — apenas registra o gênero como
  // "pendente" localmente, com um id temporário. Ele só é persistido de
  // verdade em resolverPendencias(), disparado ao clicar em Salvar/Finalizar.
  // Mesma lógica de pendência local, aplicada ao gênero.
  async function handleCriarGenero(nome) {
    const nomeLimpo = nome.trim();
    const existente = generos.find(
      (item) => normalizeText(item.genNome) === normalizeText(nomeLimpo)
    );
    if (existente) return existente;

    const parecido = encontrarNomeParecido(nomeLimpo, generos, "genNome");
    if (parecido) {
      const usarExistente = await perguntarSubstituicao("genero", nomeLimpo, parecido);
      if (usarExistente) {
        addToast(`Usando o gênero já cadastrado "${parecido.genNome}"`, "success");
        return parecido;
      }
    }

    const idGenero = pendingIdFor(nomeLimpo);
    const jaPendente = generos.find((item) => item.idGenero === idGenero);
    if (jaPendente) return jaPendente;

    const pendente = { idGenero, genNome: nomeLimpo, pendente: true };
    setGeneros((prev) => [...prev, pendente]);
    addToast(`Gênero "${nomeLimpo}" adicionado`, "success");
    return pendente;
  }

  // O backend resolve/cria o autor pelo nome automaticamente ao salvar o
  // livro (resolver_autor em livros.py), então não existe chamada de API
  // aqui — só reaproveitamos a grafia já cadastrada quando bate (case
  // insensitive) para evitar duplicar "machado de assis" x "Machado de Assis".
  async function handleCriarAutor(nome) {
    const nomeLimpo = nome.trim();
    const existente = autores.find(
      (item) => normalizeText(item.autNome) === normalizeText(nomeLimpo)
    );
    if (existente) return existente;

    const parecido = encontrarNomeParecido(nomeLimpo, autores, "autNome");
    if (parecido) {
      const usarExistente = await perguntarSubstituicao("autor", nomeLimpo, parecido);
      if (usarExistente) {
        addToast(`Usando o autor já cadastrado "${parecido.autNome}"`, "success");
        return parecido;
      }
    }

    const pendente = { autNome: nomeLimpo, pendente: true };
    setAutores((prev) => [...prev, pendente]);
    addToast(`Autor "${nomeLimpo}" adicionado`, "success");
    return pendente;
  }

  return (
    <div className="modal-overlay book-editor-overlay">
      <div className="editor-modal-container book-editor-modal" role="dialog" aria-modal="true" aria-labelledby="book-editor-title">
        <div className="editor-shell">
          <div className="editor-topbar">
            <span className="editor-topbar-icon" aria-hidden="true"><HiOutlineBookOpen /></span>
            <div className="editor-topbar-copy">
              <h2 id="book-editor-title">{bookToEdit ? "Editar Livro" : "Novo Livro"}</h2>
              <p>{bookToEdit ? "Edite as informações do livro selecionado." : "Cadastre os dados do título e dos exemplares."}</p>
            </div>
            <div className="editor-top-actions">
              <button
                type="button"
                className="editor-close-button"
                onClick={handleRequestClose}
                aria-label="Fechar"
              >
                <HiOutlineX />
              </button>
            </div>
          </div>

          <div className="editor-tabs-bar">
            {SECTIONS.map((section) => (
              <button
                key={section.id}
                type="button"
                className={`editor-tab${activeSection === section.id ? " is-active" : ""}`}
                aria-current={activeSection === section.id ? "location" : undefined}
                onClick={() => scrollToSection(section.id)}
              >
                {section.label}
              </button>
            ))}
          </div>
          <div className="editor-origin-legend" aria-label="Origem dos campos preenchidos automaticamente">
            <span><FieldOriginIcon name="isbn" fieldOrigins={{ isbn: "isbn" }} /> ISBN</span>
            <span><FieldOriginIcon name="ia" fieldOrigins={{ ia: "ia" }} /> IA</span>
          </div>
          <div className="editor-content" ref={editorContentRef} onScroll={updateActiveSection}>
            {Boolean(bookToEdit) && !loadingDetails && (
              <div className="editor-book-overview">
                <div className="editor-book-overview__details">
                  {form.livCapaURL
                    ? <img src={form.livCapaURL} alt={`Capa de ${form.livTitulo || "livro"}`} className="editor-book-overview__cover" />
                    : <span className="editor-book-overview__placeholder"><HiOutlineBookOpen /></span>}
                  <div className="editor-book-overview__text">
                    <strong>{form.livTitulo || "Livro sem título"}</strong>
                    <span>{form.livAutor || "Autor não informado"}</span>
                    <small>{[form.livAnoPublicacao, form.livPaginas ? `${form.livPaginas} páginas` : ""].filter(Boolean).join(" · ")}</small>
                  </div>
                </div>
                {Boolean(form.livCapaURL) && (
                  <button type="button" className="editor-book-overview__action" onClick={() => setCoverPreviewOpen(true)}>
                    <HiOutlineBookOpen aria-hidden="true" /> Ver capa completa
                  </button>
                )}
              </div>
            )}

            {saveErrors.length > 0 && <div className="editor-copies-warning editor-save-errors" role="alert">
              <p><strong>Não foi possível salvar todas as alterações.</strong> {savedParts > 0 ? `${savedParts} parte(s) já foram salvas; ao tentar novamente, somente as pendências serão enviadas.` : "Revise os erros e tente novamente."}</p>
              <ul>{saveErrors.map((message, index) => <li key={`${index}-${message}`}>{message}</li>)}</ul>
            </div>}
            {semExemplares && (
              <div className="editor-copies-warning" role="status">
                <p><strong>{exemplares.length === 0 ? "Nenhum exemplar cadastrado." : "Todos os exemplares estão desativados."}</strong> Adicione ou reative um exemplar para exibir o livro no acervo.{bookToEdit?.livAtivo === false ? " O título também precisa ser reativado." : ""}</p>
                <button type="button" onClick={irParaExemplares}>Ir para exemplares</button>
              </div>
            )}
            {loadingDetails ? (
              <div className="editor-loading-state" role="status">Carregando dados do livro...</div>
            ) : (
              <>
                <section ref={basicSectionRef} className="editor-page-section">
                  <h3 className="editor-page-section-title">
                    <HiOutlineBookOpen /> Informações Básicas
                  </h3>
                  <BasicInfoSection
                    form={form}
                    generos={generos}
                    autores={autores}
                    highlightedFields={highlightedFields}
                    fieldOrigins={fieldOrigins}
                    onRegenerate={regenerateField}
                    regeneratingField={regeneratingField}
                    isbnFilledFields={isbnFilledFields}
                    onFieldChange={handleFieldChange}
                    onUpload={handleUpload}
                    onISBNAutoFill={handlePreencherISBN}
                    onCamposAutoFillIA={handleCamposAutoFillIA}
                    onCriarGenero={handleCriarGenero}
                    onCriarAutor={handleCriarAutor}
                  />
                </section>

                <div className="editor-section-separator" />

                <section ref={publicationSectionRef} className="editor-page-section">
                  <h3 className="editor-page-section-title">
                    <HiOutlineOfficeBuilding /> Informações de Publicação
                  </h3>
                  <PublicationInfoSection
                    form={form}
                    onFieldChange={handleFieldChange}
                    editoras={editoras}
                    highlightedFields={highlightedFields}
                    fieldOrigins={fieldOrigins}
                    onRegenerate={regenerateField}
                    regeneratingField={regeneratingField}
                  />
                </section>

                <div className="editor-section-separator" />

                <section ref={copiesSectionRef} className="editor-page-section">
                  <h3 className="editor-page-section-title">
                    <HiOutlineClipboardList /> Editar Tombos
                  </h3>
                  <TombosSection
                    bookTitle={form.livTitulo}
                    isEditing={Boolean(bookToEdit)}
                    exemplares={exemplares}
                    addConfig={addConfig}
                    onExemplarChange={handleExemplarChange}
                    onAddConfigChange={handleAddConfigChange}
                  />
                </section>

              </>
            )}
          </div>
          <div className="editor-bottom-save-bar">
            <button type="button" className="top-action editor-cancel-button" onClick={handleRequestClose} disabled={loading}>
              Cancelar
            </button>
            <LoadingButton
              type="button"
              className="top-action primary bottom-save-button"
              onClick={handleSave}
              isLoading={loading || loadingDetails}
              loadingText="Salvando..."
            >
              <HiOutlineSave />
              <span>{bookToEdit ? "Salvar alterações" : "Salvar livro"}</span>
            </LoadingButton>
          </div>
        </div>
      </div>

      {coverPreviewOpen && Boolean(form.livCapaURL) && (
        <BookCoverPreview src={form.livCapaURL} title={form.livTitulo || "Livro"} onClose={() => setCoverPreviewOpen(false)} />
      )}

      <ConfirmExitModal
        show={confirmandoSaida}
        onConfirm={confirmarSaida}
        onCancel={() => setConfirmandoSaida(false)}
      />

      <FieldSuggestionModal
        suggestion={fieldSuggestion}
        fieldLabel={fieldSuggestion && FIELD_LABELS[fieldSuggestion.campo]}
        currentValue={fieldSuggestion?.campo === "idGenero"
          ? generos.find((item) => String(item.idGenero) === String(form.idGenero))?.genNome
          : fieldSuggestion && form[fieldSuggestion.campo]}
        onApply={applyFieldSuggestion}
        onClose={() => setFieldSuggestion(null)}
      />

      <ConfirmModal
        show={confirmandoCamposEmBranco}
        title="Campos não preenchidos"
        message={
          <>
            <p>Existem campos não preenchidos. Deseja realmente salvar?</p>
            <ul className="confirm-modal-fields-list">
              {camposEmBrancoDetectados.map((campo) => (
                <li key={campo.key}>{campo.label}</li>
              ))}
            </ul>
            <p className="confirm-modal-fields-note">
              Alguns desses campos podem realmente não existir para este livro (por exemplo,
              "Subtítulo" ou "Edição" nem sempre se aplicam) — preencha apenas o que fizer sentido.
            </p>
          </>
        }
        onConfirm={confirmarSalvarComCamposEmBranco}
        onCancel={() => setConfirmandoCamposEmBranco(false)}
        confirming={loading}
        confirmText="Salvar mesmo assim"
        cancelText="Revisar campos"
      />

      <ConfirmModal
        show={Boolean(duplicidadeSugestao)}
        title="Possível duplicata encontrada"
        message={
          duplicidadeSugestao && (
            <>
              <p>
                Já existe {duplicidadeSugestao.tipo === "autor" ? "um" : "uma"}{" "}
                {LABEL_POR_TIPO[duplicidadeSugestao.tipo]} cadastrado(a) chamado(a){" "}
                <strong>
                  "{duplicidadeSugestao.itemExistente[CAMPO_NOME_POR_TIPO[duplicidadeSugestao.tipo]]}"
                </strong>
                , parecido com "{duplicidadeSugestao.nomeDigitado}".
              </p>
              <p>Deseja substituir pelo já existente em vez de criar um novo cadastro?</p>
            </>
          )
        }
        onConfirm={confirmarUsarExistenteNaDuplicidade}
        onCancel={manterNovoNaDuplicidade}
        confirmText="Sim, usar o existente"
        cancelText="Não, manter novo"
      />
    </div>
  );
}

export function normalizeBookForm(form = {}) {
  return {
    ...form,
    idGenero: form.idGenero !== "" && form.idGenero != null ? Number(form.idGenero) : null,
    livPaginas: form.livPaginas ? Number(form.livPaginas) : null,
    livAnoPublicacao: form.livAnoPublicacao ? Number(form.livAnoPublicacao) : null,
    exemplarISBN: (form.exemplarISBN || "").trim(),
    livTitulo: (form.livTitulo || "").trim(),
    livSubtitulo: (form.livSubtitulo || "").trim(),
    livAutor: (form.livAutor || "").trim(),
    autorAnoNascimento: form.autorAnoNascimento !== "" && form.autorAnoNascimento != null ? Number(form.autorAnoNascimento) : null,
    autorAnoFalecimento: form.autorAnoFalecimento !== "" && form.autorAnoFalecimento != null ? Number(form.autorAnoFalecimento) : null,
    livDescricao: form.livDescricao || "",
    livEditora: form.livEditora || "",
    livCapaURL: form.livCapaURL || "",
    livIdioma: (form.livIdioma || "").trim(),
    livFaixaEtaria: (form.livFaixaEtaria || "").trim(),
    livPalavrasChave: (form.livPalavrasChave || "").trim(),
    livCDD: (form.livCDD || "").trim(),
    livCDDSugerida: Boolean(form.livCDDSugerida),
    livEdicao: form.livEdicao !== "" && form.livEdicao != null ? Number(form.livEdicao) : null,
    livAlturaCm: form.livAlturaCm !== "" && form.livAlturaCm != null ? Number(form.livAlturaCm) : null,
    livLarguraCm: form.livLarguraCm !== "" && form.livLarguraCm != null ? Number(form.livLarguraCm) : null,
    livIlustrado: Boolean(form.livIlustrado),
    ediCidade: (form.ediCidade || "").trim(),
    ediEstado: (form.ediEstado || "").trim(),
    ediPais: (form.ediPais || "").trim(),
  };
}

function normalizeExemplares(exemplares) {
  return exemplares.map((exemplar) => ({
    idExemplar: exemplar.idExemplar,
    exeLivTombo: exemplar.exeLivTombo || "",
    exeLivStatus: exemplar.exeLivStatus || "Disponível",
    exeLivDescricao: exemplar.exeLivDescricao || "",
  }));
}

function normalizeAddConfig(addConfig) {
  return {
    prefixo: addConfig.prefixo || "T",
    quantidade: Number(addConfig.quantidade || 0),
  };
}

function getErrorMessage(err) {
  const message = String(err?.message || "").trim();
  if (!message) return "Erro ao salvar alterações.";
  return message.startsWith("Erro") ? message : `Erro ao salvar alterações: ${message}`;
}
