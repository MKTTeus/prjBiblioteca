import React, { useCallback, useEffect, useState } from "react";
import {
  addExemplares,
  createBook,
  getBook,
  getCategorias,
  getGeneros,
  getAutores,
  updateBook,
  updateExemplar,
  uploadCover,
  createCategoria,
  createGenero,
} from "../../../../../services/api";
import { HiOutlineSave, HiOutlineX } from "react-icons/hi";
import LoadingButton from "../../../../../components/LoadingButton/LoadingButton";
import { useToast } from "../../../../../contexts/ToastContext";
import BasicInfoSection from "./BasicInfoSection";
import PublicationInfoSection from "./PublicationInfoSection";
import TombosSection from "./TombosSection";
import ConfirmExitModal from "../../../../../components/ConfirmExitModal/ConfirmExitModal";
import "./BookFormModal.css";

function normalizeText(value = "") {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

const TAB_ITEMS = [
  { id: "basic", label: "Informações Básicas" },
  { id: "publication", label: "Informações de Publicação" },
  { id: "copies", label: "Editar Tombos" },
];

const DEFAULT_FORM = {
  livTitulo: "",
  livSubtitulo: "",
  livAutor: "",
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
};

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
  const [loading, setLoading] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");
  const [form, setForm] = useState(DEFAULT_FORM);
  const [initialForm, setInitialForm] = useState(DEFAULT_FORM);
  const [exemplares, setExemplares] = useState([]);
  const [initialExemplares, setInitialExemplares] = useState([]);
  const [addConfig, setAddConfig] = useState(DEFAULT_CREATE_ADD_CONFIG);
  const [initialAddConfig, setInitialAddConfig] = useState(DEFAULT_CREATE_ADD_CONFIG);
  const [confirmandoSaida, setConfirmandoSaida] = useState(false);

  const carregarLivroEmEdicao = useCallback(async () => {
    setActiveTab("basic");

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
        exemplarISBN: livro.exemplarISBN || livro.exeLivISBN || "",
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
      const [cats, gens, auts] = await Promise.all([getCategorias(), getGeneros(), getAutores()]);
      setCategorias(cats || []);
      setGeneros(gens || []);
      setAutores(auts || []);
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
    setForm((prev) => ({
      ...prev,
      livTitulo:        dados.livTitulo        || prev.livTitulo,
      livSubtitulo:     dados.livSubtitulo     || prev.livSubtitulo,
      livAutor:         dados.livAutor         || prev.livAutor,
      livEditora:       dados.livEditora       || prev.livEditora,
      livAnoPublicacao: dados.livAnoPublicacao || prev.livAnoPublicacao,
      livPaginas:       dados.livPaginas       || prev.livPaginas,
      livCapaURL:       dados.livCapaURL       || prev.livCapaURL,
      livDescricao:     dados.livDescricao     || prev.livDescricao,
      idCategoria:      dados.idCategoria ? Number(dados.idCategoria) : prev.idCategoria,
      idGenero:         dados.idGenero ? Number(dados.idGenero) : prev.idGenero,
      exemplarISBN:     dados.exemplarISBN     || prev.exemplarISBN,
    }));
    addToast("Dados preenchidos a partir do ISBN!", "success");
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
      addToast("Falha ao enviar a capa", "error");
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

  async function handleSave() {
    const errosValidacao = validarFormulario();
    if (errosValidacao.length > 0) {
      errosValidacao.forEach((msg) => addToast(msg, "error"));
      return;
    }

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

  // Não cria nada no backend ainda — apenas registra a categoria como
  // "pendente" localmente, com um id temporário. Ela só é persistida de
  // verdade em resolverPendencias(), disparado ao clicar em Salvar/Finalizar.
  async function handleCriarCategoria(nome) {
    const nomeLimpo = nome.trim();
    const existente = categorias.find(
      (item) => normalizeText(item.catNome) === normalizeText(nomeLimpo)
    );
    if (existente) return existente;

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

    const pendente = { autNome: nomeLimpo, pendente: true };
    setAutores((prev) => [...prev, pendente]);
    addToast(`Autor "${nomeLimpo}" adicionado`, "success");
    return pendente;
  }

  function renderActiveSection() {
    if (activeTab === "publication") {
      return <PublicationInfoSection form={form} onFieldChange={handleFieldChange} />;
    }
    if (activeTab === "copies") {
      return (
        <TombosSection
          bookTitle={form.livTitulo}
          isEditing={Boolean(bookToEdit)}
          exemplares={exemplares}
          addConfig={addConfig}
          onExemplarChange={handleExemplarChange}
          onAddConfigChange={handleAddConfigChange}
        />
      );
    }
    return (
      <BasicInfoSection
        form={form}
        categorias={categorias}
        generos={generos}
        autores={autores}
        onFieldChange={handleFieldChange}
        onUpload={handleUpload}
        onISBNAutoFill={handlePreencherISBN}
        onCriarCategoria={handleCriarCategoria}
        onCriarGenero={handleCriarGenero}
        onCriarAutor={handleCriarAutor}
      />
    );
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
              <LoadingButton
                type="button"
                className="top-action primary"
                onClick={handleSave}
                isLoading={loading || loadingDetails}
                loadingText="Salvando..."
              >
                <HiOutlineSave />
                <span>Salvar Atualizações</span>
              </LoadingButton>
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
            {TAB_ITEMS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`editor-tab ${activeTab === tab.id ? "active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="editor-divider" />

          <div className="editor-content">
            {loadingDetails ? (
              <div className="editor-loading-state">Carregando dados do livro...</div>
            ) : (
              renderActiveSection()
            )}
          </div>
        </div>
      </div>

      <ConfirmExitModal
        show={confirmandoSaida}
        onConfirm={confirmarSaida}
        onCancel={() => setConfirmandoSaida(false)}
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
    livDescricao: form.livDescricao || "",
    livEditora: form.livEditora || "",
    livCapaURL: form.livCapaURL || "",
    livIdioma: (form.livIdioma || "").trim(),
    livFaixaEtaria: (form.livFaixaEtaria || "").trim(),
    livPalavrasChave: (form.livPalavrasChave || "").trim(),
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