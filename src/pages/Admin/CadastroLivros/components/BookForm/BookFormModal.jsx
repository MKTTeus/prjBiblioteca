import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  addExemplares,
  createBook,
  getBook,
  getCategorias,
  getGeneros,
  getAutores,
  getEditoras,
  updateBook,
  updateExemplar,
  uploadCover,
  createCategoria,
  createGenero,
} from "../../../../../services/api";
import { HiOutlineSave, HiOutlineX, HiOutlineBookOpen, HiOutlineOfficeBuilding, HiOutlineClipboardList } from "react-icons/hi";
import LoadingButton from "../../../../../components/LoadingButton/LoadingButton";
import { useToast } from "../../../../../contexts/ToastContext";
import BasicInfoSection from "./BasicInfoSection";
import PublicationInfoSection from "./PublicationInfoSection";
import TombosSection from "./TombosSection";
import ConfirmExitModal from "../../../../../components/ConfirmExitModal/ConfirmExitModal";
import ConfirmModal from "../../../../../components/ConfirmModal/ConfirmModal";
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
// nomes de autor/gênero/categoria parecidos (não idênticos) e sugerir ao
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

// Procura, numa lista de categorias/gêneros/autores já cadastrados, um item
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
  categoria: "catNome",
  genero: "genNome",
  autor: "autNome",
};

const LABEL_POR_TIPO = {
  categoria: "categoria",
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
  idCategoria: "",
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
  { key: "idCategoria", label: "Categoria" },
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

// Prefixo usado para identificar, dentro do próprio form, uma categoria/gênero
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

export default function BookFormModal({ onClose, onBookSaved, bookToEdit }) {
  const { addToast } = useToast();
  const [categorias, setCategorias] = useState([]);
  const [generos, setGeneros] = useState([]);
  const [autores, setAutores] = useState([]);
  const [editoras, setEditoras] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [initialForm, setInitialForm] = useState(DEFAULT_FORM);
  const [exemplares, setExemplares] = useState([]);
  const [initialExemplares, setInitialExemplares] = useState([]);
  const [addConfig, setAddConfig] = useState(DEFAULT_CREATE_ADD_CONFIG);
  const [initialAddConfig, setInitialAddConfig] = useState(DEFAULT_CREATE_ADD_CONFIG);
  const [confirmandoSaida, setConfirmandoSaida] = useState(false);
  const [confirmandoCamposEmBranco, setConfirmandoCamposEmBranco] = useState(false);
  const [camposEmBrancoDetectados, setCamposEmBrancoDetectados] = useState([]);

  // Guarda a sugestão de possível duplicata (autor/gênero/categoria) em
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
  // Diferente do highlightedFields acima (que é só o "brilho" visual e some
  // sozinho depois de alguns segundos), este aqui não expira — serve para o
  // painel de sugestões da IA saber, a qualquer momento, quais campos já
  // vieram do ISBN e evitar que o admin sobrescreva sem perceber.
  const [isbnFilledFields, setIsbnFilledFields] = useState(() => new Set());
  const highlightTimeoutRef = useRef(null);
  const basicSectionRef = useRef(null);
  const publicationSectionRef = useRef(null);
  const copiesSectionRef = useRef(null);
  const sectionRefs = {
    basic: basicSectionRef,
    publication: publicationSectionRef,
    copies: copiesSectionRef,
  };

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
        publicationSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 120);
    }
  }

  const carregarLivroEmEdicao = useCallback(async () => {
    setHighlightedFields(new Set());
    setIsbnFilledFields(new Set());

    if (!bookToEdit) {
      setForm(DEFAULT_FORM);
      setInitialForm(DEFAULT_FORM);
      setExemplares([]);
      setInitialExemplares([]);
      setAddConfig(DEFAULT_CREATE_ADD_CONFIG);
      setInitialAddConfig(DEFAULT_CREATE_ADD_CONFIG);
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
            exeLivStatus: ex.exeLivStatus || "Disponível",
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
        idCategoria: livro.idCategoria || 1,
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

      setForm(nextForm);
      setInitialForm(nextForm);
      setExemplares(exemplaresCarregados);
      setInitialExemplares(exemplaresCarregados);
      setAddConfig(DEFAULT_EDIT_ADD_CONFIG);
      setInitialAddConfig(DEFAULT_EDIT_ADD_CONFIG);
    } catch (err) {
      console.error(err);
      addToast("Falha ao carregar detalhes do livro", "error");
    } finally {
      setLoadingDetails(false);
    }
  }, [bookToEdit, addToast]);

  const carregarMetadados = useCallback(async () => {
    try {
      const [cats, gens, auts, eds] = await Promise.all([getCategorias(), getGeneros(), getAutores(), getEditoras()]);
      setCategorias(cats || []);
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
        (name === "idCategoria" || name === "idGenero") && !isPendingId(value)
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

    if (dados.idCategoria !== "" && dados.idCategoria !== null && dados.idCategoria !== undefined) {
      const valorCategoria = isPendingId(dados.idCategoria) ? dados.idCategoria : Number(dados.idCategoria);
      if (valorCategoria !== form.idCategoria) {
        next.idCategoria = valorCategoria;
        camposAlterados.push("idCategoria");
      }
    }
    if (dados.idGenero !== "" && dados.idGenero !== null && dados.idGenero !== undefined) {
      const valorGenero = isPendingId(dados.idGenero) ? dados.idGenero : Number(dados.idGenero);
      if (valorGenero !== form.idGenero) {
        next.idGenero = valorGenero;
        camposAlterados.push("idGenero");
      }
    }

    setForm(next);
    marcarCamposPreenchidosAutomaticamente(camposAlterados);
    if (camposAlterados.length > 0) {
      setIsbnFilledFields((prev) => new Set([...prev, ...camposAlterados]));
    }
    addToast("Dados preenchidos a partir do ISBN! Campos alterados foram destacados.", "success");
  }

  // Chamado pela seção Básica ao clicar em "Aplicar selecionados" no painel
  // de sugestões da IA — aplica tudo de uma vez e marca os campos para
  // destaque, com o mesmo tratamento usado no preenchimento por ISBN.
  function handleCamposAutoFillIA(atualizacoes) {
    const entradas = Object.entries(atualizacoes || {});
    if (entradas.length === 0) return;

    setForm((prev) => ({ ...prev, ...atualizacoes }));
    marcarCamposPreenchidosAutomaticamente(entradas.map(([campo]) => campo));
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setLoading(true);
      const res = await uploadCover(file);
      setForm((prev) => ({ ...prev, livCapaURL: res.url }));
    } catch (err) {
      console.error(err);
      addToast(err?.message || "Falha ao enviar a capa", "error");
    } finally {
      setLoading(false);
      e.target.value = "";
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

  // Persiste de fato, no backend, qualquer categoria/gênero que ainda esteja
  // pendente (id no formato "novo:Nome"), e devolve o form já com os ids
  // reais. É só aqui — no momento de salvar o livro — que esses registros
  // passam a existir no banco; se o usuário cancelar antes disso, nada foi
  // gravado por causa de um nome digitado errado.
  async function resolverPendencias(formAtual) {
    const resolvido = { ...formAtual };

    if (isPendingId(resolvido.idCategoria)) {
      const nome = pendingNomeFrom(resolvido.idCategoria);
      try {
        const criada = await createCategoria({ catNome: nome });
        setCategorias((prev) => [
          ...prev.filter((item) => item.idCategoria !== resolvido.idCategoria),
          criada,
        ]);
        resolvido.idCategoria = criada.idCategoria;
      } catch (err) {
        if (err?.status === 409) {
          const catsAtualizadas = await getCategorias();
          setCategorias(catsAtualizadas || []);
          const existente = (catsAtualizadas || []).find(
            (item) => normalizeText(item.catNome) === normalizeText(nome)
          );
          if (existente) {
            resolvido.idCategoria = existente.idCategoria;
          } else {
            throw err;
          }
        } else {
          throw err;
        }
      }
    }

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
      onClose();
    }
  }

  function confirmarSaida() {
    setConfirmandoSaida(false);
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
    try {
      let formResolvido;
      try {
        formResolvido = await resolverPendencias(form);
      } catch (err) {
        console.error("Erro ao criar categoria/gênero pendente:", err);
        addToast("Falha ao criar categoria/gênero pendente. Tente novamente.", "error");
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

        const saveErrors = [];

        if (formChanged) {
          try {
            await updateBook(bookToEdit.idLivro, normalizedForm);
          } catch (err) {
            console.error("Erro ao salvar dados do livro:", err);
            saveErrors.push(`Livro: ${getErrorMessage(err)}`);
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
              saveErrors.push(
                `Tombo ${exemplar.exeLivTombo || exemplar.idExemplar}: ${getErrorMessage(result.reason)}`
              );
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
          } catch (err) {
            saveErrors.push(`Novos tombos: ${getErrorMessage(err)}`);
          }
        }

        if (saveErrors.length > 0) {
          addToast("Falha ao atualizar o livro", "error");
          return;
        }
      } else {
        if (Number(addConfig.quantidade) < 1) {
          addToast("Falha ao cadastrar o livro", "error");
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
      if (onBookSaved) onBookSaved();
    } catch (err) {
      console.error(err);
      addToast(bookToEdit ? "Falha ao atualizar o livro" : "Falha ao cadastrar o livro", "error");
    } finally {
      setLoading(false);
    }
  }

  // Abre o modal perguntando se o admin quer reaproveitar um item já
  // cadastrado (parecido com o que está sendo digitado/preenchido via ISBN
  // ou IA) em vez de criar uma entrada nova possivelmente duplicada.
  // Devolve uma Promise<boolean> que só resolve quando o admin responder —
  // as funções handleCriarCategoria/Genero/Autor abaixo já são async e
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

  // Não cria nada no backend ainda — apenas registra a categoria como
  // "pendente" localmente, com um id temporário. Ela só é persistida de
  // verdade em resolverPendencias(), disparado ao clicar em Salvar/Finalizar.
  async function handleCriarCategoria(nome) {
    const nomeLimpo = nome.trim();
    const existente = categorias.find(
      (item) => normalizeText(item.catNome) === normalizeText(nomeLimpo)
    );
    if (existente) return existente;

    // Antes de criar algo novo, verifica se já existe uma categoria com
    // nome parecido (possível duplicata/erro de digitação) e, se houver,
    // pergunta ao admin se prefere reaproveitar a já cadastrada.
    const parecida = encontrarNomeParecido(nomeLimpo, categorias, "catNome");
    if (parecida) {
      const usarExistente = await perguntarSubstituicao("categoria", nomeLimpo, parecida);
      if (usarExistente) {
        addToast(`Usando a categoria já cadastrada "${parecida.catNome}"`, "success");
        return parecida;
      }
    }

    const idCategoria = pendingIdFor(nomeLimpo);
    const jaPendente = categorias.find((item) => item.idCategoria === idCategoria);
    if (jaPendente) return jaPendente;

    const pendente = { idCategoria, catNome: nomeLimpo, pendente: true };
    setCategorias((prev) => [...prev, pendente]);
    addToast(`Categoria "${nomeLimpo}" adicionada`, "success");
    return pendente;
  }

  // Mesma lógica de pendência local da categoria, aplicada ao gênero.
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
    <div className="modal-overlay">
      <div className="editor-modal-container">
        <div className="editor-shell">
          <div className="editor-topbar">
            <div className="editor-topbar-copy">
              <h2>{bookToEdit ? "Editar Livro" : "Novo Livro"}</h2>
              <p>Edite as informações do livro selecionado.</p>
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
                className="editor-tab"
                onClick={() =>
                  sectionRefs[section.id]?.current?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
              >
                {section.label}
              </button>
            ))}
          </div>
          <p className="editor-tabs-hint">
            <strong>Use os atalhos acima para pular direto até uma seção.</strong>
          </p>

          <div className="editor-divider" />

          <div className="editor-content">
            {loadingDetails ? (
              <div className="editor-loading-state">Carregando dados do livro...</div>
            ) : (
              <>
                <section ref={basicSectionRef} className="editor-page-section">
                  <h3 className="editor-page-section-title">
                    <HiOutlineBookOpen /> Informações Básicas
                  </h3>
                  <BasicInfoSection
                    form={form}
                    categorias={categorias}
                    generos={generos}
                    autores={autores}
                    highlightedFields={highlightedFields}
                    isbnFilledFields={isbnFilledFields}
                    onFieldChange={handleFieldChange}
                    onUpload={handleUpload}
                    onISBNAutoFill={handlePreencherISBN}
                    onCamposAutoFillIA={handleCamposAutoFillIA}
                    onCriarCategoria={handleCriarCategoria}
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

                <div className="editor-bottom-save-bar">
                  <LoadingButton
                    type="button"
                    className="top-action primary bottom-save-button"
                    onClick={handleSave}
                    isLoading={loading || loadingDetails}
                    loadingText="Salvando..."
                  >
                    <HiOutlineSave />
                    <span>Salvar Atualizações</span>
                  </LoadingButton>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <ConfirmExitModal
        show={confirmandoSaida}
        onConfirm={confirmarSaida}
        onCancel={() => setConfirmandoSaida(false)}
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
    idCategoria: form.idCategoria !== "" && form.idCategoria != null ? Number(form.idCategoria) : null,
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