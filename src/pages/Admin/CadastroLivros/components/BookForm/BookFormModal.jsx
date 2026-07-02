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
  createAutor,
} from "../../../../../services/api";
import { HiOutlineSave, HiOutlineX } from "react-icons/hi";
import LoadingButton from "../../../../../components/LoadingButton/LoadingButton";
import { useToast } from "../../../../../contexts/ToastContext";
import BasicInfoSection from "./BasicInfoSection";
import PublicationInfoSection from "./PublicationInfoSection";
import TombosSection from "./TombosSection";
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
  livAutor: "",
  livDescricao: "",
  livEditora: "",
  livAnoPublicacao: "",
  livPaginas: "",
  livCapaURL: "",
  idCategoria: "",
  idGenero: "",
  exemplarISBN: "",
};

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
        livAutor: livro.livAutor || "",
        livDescricao: livro.livDescricao || "",
        livEditora: livro.livEditora || "",
        livAnoPublicacao: livro.livAnoPublicacao || "",
        livPaginas: livro.livPaginas || "",
        livCapaURL: livro.livCapaURL || "",
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
      [name]: name === "idCategoria" || name === "idGenero" ? Number(value) : value,
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

  async function handleSave() {
    const errosValidacao = validarFormulario();
    if (errosValidacao.length > 0) {
      errosValidacao.forEach((msg) => addToast(msg, "error"));
      return;
    }

    setLoading(true);
    try {
      if (bookToEdit) {
        const normalizedForm = normalizeBookForm(form);
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
          livro: { ...normalizeBookForm(form) },
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

  async function handleCriarCategoria(nome) {
    try {
      const nova = await createCategoria({ catNome: nome });
      setCategorias((prev) => [...prev, nova]);
      addToast(`Categoria "${nome}" criada com sucesso`, "success");
      return nova;
    } catch (err) {
      if (err?.status === 409) {
        try {
          const catsAtualizadas = await getCategorias();
          setCategorias(catsAtualizadas || []);
          const existente = (catsAtualizadas || []).find(
            (item) => normalizeText(item.catNome) === normalizeText(nome)
          );
          if (existente) return existente;
          console.warn(
            "Categoria reportada como duplicada pelo backend, mas não encontrada na lista atualizada.",
            { nomeBuscado: nome, categoriasCarregadas: (catsAtualizadas || []).map((c) => c.catNome) }
          );
        } catch (refreshErr) {
          console.error("Erro ao recarregar categorias:", refreshErr);
        }
      }
      console.error("Erro ao criar categoria:", err);
      addToast("Erro ao criar categoria", "error");
      return null;
    }
  }

  async function handleCriarGenero(nome) {
    try {
      const novo = await createGenero({ genNome: nome });
      setGeneros((prev) => [...prev, novo]);
      addToast(`Gênero "${nome}" criado com sucesso`, "success");
      return novo;
    } catch (err) {
      if (err?.status === 409) {
        try {
          const gensAtualizados = await getGeneros();
          setGeneros(gensAtualizados || []);
          const existente = (gensAtualizados || []).find(
            (item) => normalizeText(item.genNome) === normalizeText(nome)
          );
          if (existente) return existente;
          console.warn(
            "Gênero reportado como duplicado pelo backend, mas não encontrado na lista atualizada.",
            { nomeBuscado: nome, generosCarregados: (gensAtualizados || []).map((g) => g.genNome) }
          );
        } catch (refreshErr) {
          console.error("Erro ao recarregar gêneros:", refreshErr);
        }
      }
      console.error("Erro ao criar gênero:", err);
      addToast("Erro ao criar gênero", "error");
      return null;
    }
  }

  async function handleCriarAutor(nome) {
    try {
      const novo = await createAutor({ autNome: nome });
      setAutores((prev) => [...prev, novo]);
      addToast(`Autor "${nome}" criado com sucesso`, "success");
      return novo;
    } catch (err) {
      if (err?.status === 409) {
        try {
          const autsAtualizados = await getAutores();
          setAutores(autsAtualizados || []);
          const existente = (autsAtualizados || []).find(
            (item) => normalizeText(item.autNome) === normalizeText(nome)
          );
          if (existente) return existente;
        } catch (refreshErr) {
          console.error("Erro ao recarregar autores:", refreshErr);
        }
      }
      console.error("Erro ao criar autor:", err);
      addToast("Erro ao criar autor", "error");
      return null;
    }
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
                onClick={onClose}
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
    livAutor: (form.livAutor || "").trim(),
    livDescricao: form.livDescricao || "",
    livEditora: form.livEditora || "",
    livCapaURL: form.livCapaURL || "",
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