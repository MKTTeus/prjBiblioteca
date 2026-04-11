import React, { useCallback, useEffect, useState } from "react";
import {
  addExemplares,
  createBook,
  getBook,
  getCategorias,
  getGeneros,
  updateBook,
  updateExemplar,
  uploadCover,
} from "../../../../../services/api";
import { HiOutlineSave, HiOutlineX } from "react-icons/hi";
import { useToast } from "../../../../../contexts/ToastContext";
import BasicInfoSection from "./BasicInfoSection";
import PublicationInfoSection from "./PublicationInfoSection";
import TombosSection from "./TombosSection";
import "./BookFormModal.css";

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
  idCategoria: 1,
  idGenero: 1,
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
  }, [bookToEdit]);

  async function carregarMetadados() {
    try {
      const [cats, gens] = await Promise.all([getCategorias(), getGeneros()]);
      setCategorias(cats || []);
      setGeneros(gens || []);
    } catch (err) {
      console.error(err);
      addToast("Falha ao carregar categorias e gêneros", "error");
    }
  }

  useEffect(() => {
    carregarMetadados();
  }, []);

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

  async function handleSave() {
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
              console.error(`Erro ao salvar exemplar ${exemplar.exeLivTombo}:`, result.reason);
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
            console.error("Erro ao adicionar novos tombos:", err);
            saveErrors.push(`Novos tombos: ${getErrorMessage(err)}`);
          }
        }

        if (saveErrors.length > 0) {
          addToast(bookToEdit ? "Falha ao atualizar o livro" : "Falha ao cadastrar o livro", "error");
          return;
        }
      } else {
        if (Number(addConfig.quantidade) < 1) {
          addToast("Falha ao cadastrar o livro", "error");
          setLoading(false);
          return;
        }

        await createBook({
          livro: {
            ...normalizeBookForm(form),
          },
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
        onFieldChange={handleFieldChange}
        onUpload={handleUpload}
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
              <button
                type="button"
                className="top-action primary"
                onClick={handleSave}
                disabled={loading || loadingDetails}
              >
                <HiOutlineSave />
                <span>{loading ? "Salvando..." : "Salvar Atualizações"}</span>
              </button>

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

function normalizeBookForm(form) {
  return {
    ...form,
    livPaginas: form.livPaginas ? Number(form.livPaginas) : null,
    exemplarISBN: (form.exemplarISBN || "").trim(),
    livTitulo: (form.livTitulo || "").trim(),
    livAutor: (form.livAutor || "").trim(),
    livDescricao: form.livDescricao || "",
    livEditora: form.livEditora || "",
    livAnoPublicacao: form.livAnoPublicacao || "",
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

  if (!message) {
    return "Erro ao salvar alterações.";
  }

  return message.startsWith("Erro")
    ? message
    : `Erro ao salvar alterações: ${message}`;
}
