// src/services/api.js

import { API_URL } from "./apiConfig";

// ========================
// TOKEN
// ========================

export const getToken = () => localStorage.getItem("token");

// ========================
// FETCH BASE
// ========================

async function apiFetch(endpoint, options = {}) {
  const token = getToken();
  const isFormData = options.body instanceof FormData;

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(options.headers || {})
    }
  });

  if (!res.ok) {
    const text = await res.text();
    const err = new Error(text || "Erro na requisição");
    err.status = res.status;
    try { err.data = JSON.parse(text); } catch (_) {}
    throw err;
  }

  return res.json();
}

// ========================
// LIVROS
// ========================

export const getBooks = (params = {}) => {
  const query = new URLSearchParams();
  if (params.q) query.append("q", params.q);
  if (params.categoria) query.append("categoria", params.categoria);
  if (params.status) query.append("status", params.status);
  if (params.page) query.append("page", params.page);
  if (params.per_page) query.append("per_page", params.per_page);
  const qs = query.toString();
  const endpoint = qs ? `/livros?${qs}` : "/livros";
  return apiFetch(endpoint);
};

export const getBook = (idLivro) =>
  apiFetch(`/livros/${idLivro}`);

export const createBook = (payload) =>
  apiFetch("/livros", {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const updateBook = (idLivro, payload) =>
  apiFetch(`/livros/${idLivro}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });

export const deleteBook = (idLivro) =>
  apiFetch(`/livros/${idLivro}`, {
    method: "DELETE"
  });

export const addExemplares = (idLivro, quantidade, prefixo) =>
  apiFetch(`/livros/${idLivro}/adicionar-exemplares?quantidade=${quantidade}&prefixo=${prefixo}`, {
    method: "POST"
  });

export const updateExemplar = (idExemplar, payload) =>
  apiFetch(`/exemplares/${idExemplar}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });

// ========================
// CAPA
// ========================

export async function uploadCover(file) {

  const token = getToken();
  const formData = new FormData();

  formData.append("file", file);

  const res = await fetch(`${API_URL}/upload-capa`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: formData
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Erro ao enviar capa");
  }

  return res.json();
}

// ========================
// CATEGORIAS / GENEROS
// ========================

export const getCategorias = () =>
  apiFetch("/categorias");

export const getGeneros = () =>
  apiFetch("/generos");

export const getConfiguracoes = () =>
  apiFetch("/configuracoes");

export const updateConfiguracao = (payload) =>
  apiFetch("/configuracoes", {
    method: "PUT",
    body: JSON.stringify(payload),
  });

// ========================
// DASHBOARD
// ========================

export const getDashboardStats = () =>
  apiFetch("/dashboard-stats");

// ========================
// ADMINS
// ========================

export const getAdmins = () =>
  apiFetch("/admins");

export const createAdmin = (payload) =>
  apiFetch("/admins", {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const updateAdmin = (idAdmin, payload) =>
  apiFetch(`/admins/${idAdmin}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });

export const deleteAdmin = (idAdmin) =>
  apiFetch(`/admins/${idAdmin}`, {
    method: "DELETE"
  });

export const excluirAdminsLote = (ids) =>
  apiFetch("/admins/batch/excluir", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });

export const atualizarStatusAdminsLote = (ids, status) =>
  apiFetch("/admins/batch/status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids, status }),
  });

// ========================
// ALUNOS
// ========================

export const getAlunos = () =>
  apiFetch("/alunos");

export const createAluno = (payload) =>
  apiFetch("/alunos", {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const updateAluno = (idUsuario, payload) =>
  apiFetch(`/alunos/${idUsuario}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });

export const deleteAluno = (idUsuario) =>
  apiFetch(`/alunos/${idUsuario}`, {
    method: "DELETE"
  });

export const excluirAlunosLote = (ids) =>
  apiFetch("/alunos/batch/excluir", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });

export const atualizarStatusLote = (ids, status) =>
  apiFetch("/alunos/batch/status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids, status }),
  });

export const importarAlunos = (file) => {
  const form = new FormData();
  form.append("file", file);
  return apiFetch("/alunos/importar", { method: "POST", body: form });
};

export const reativarAluno = (payload) =>
  apiFetch("/alunos/reativar", { method: "POST", body: JSON.stringify(payload) });

// ========================
// COMUNIDADE
// ========================

export const getComunidade = () =>
  apiFetch("/comunidade");

export const createComunidade = (payload) =>
  apiFetch("/comunidade", {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const updateComunidade = (idUsuario, payload) =>
  apiFetch(`/comunidade/${idUsuario}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });

export const deleteComunidade = (idUsuario) =>
  apiFetch(`/comunidade/${idUsuario}`, {
    method: "DELETE"
  });

export const excluirComunidadeLote = (ids) =>
  apiFetch("/comunidade/batch/excluir", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });

export const atualizarStatusComunidadeLote = (ids, status) =>
  apiFetch("/comunidade/batch/status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids, status }),
  });

export const importarComunidade = (file) => {
  const form = new FormData();
  form.append("file", file);
  return apiFetch("/comunidade/importar", { method: "POST", body: form });
};

export const reativarComunidade = (payload) =>
  apiFetch("/comunidade/reativar", { method: "POST", body: JSON.stringify(payload) });

// ========================
// GOOGLE BOOKS ISBN
// ========================

export async function buscarLivroISBN(isbn) {

  const res = await fetch(
    `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`
  );

  const data = await res.json();

  if (!data.items) {
    throw new Error("Livro não encontrado");
  }

  const livro = data.items[0].volumeInfo;

  return {
    titulo: livro.title || "",
    autor: livro.authors ? livro.authors.join(", ") : "",
    descricao: livro.description || "",
    paginas: livro.pageCount || "",
    editora: livro.publisher || "",
    ano: livro.publishedDate || "",
    capa: livro.imageLinks?.thumbnail || ""
  };
}
// ========================
// EMPRESTIMOS
// ========================

export const getEmprestimos = () =>
  apiFetch("/emprestimos");

export const getAdminLoanNotifications = () =>
  apiFetch("/emprestimos/notificacoes-admin");

export const getAdminNotifications = () =>
  apiFetch("/emprestimos/notificacoes-admin");

export const criarEmprestimo = (payload) =>
  apiFetch("/emprestimos", {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const solicitarEmprestimo = (payload) =>
  apiFetch("/emprestimos/solicitacao", {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const aprovarSolicitacaoEmprestimo = (id) =>
  apiFetch(`/emprestimos/${id}/aprovar`, {
    method: "PUT"
  });

export const rejeitarSolicitacaoEmprestimo = (id) =>
  apiFetch(`/emprestimos/${id}/rejeitar`, {
    method: "PUT"
  });

export const devolverEmprestimo = (id) =>
  apiFetch(`/emprestimos/${id}/devolver`, {
    method: "PUT"
  });

export const renovarEmprestimo = (id) =>
  apiFetch(`/emprestimos/${id}/renovar`, {
    method: "PUT"
  });

export const getExemplaresDisponiveis = () =>
  apiFetch("/exemplares/disponiveis");
export const getExemplares = () =>
  apiFetch("/exemplares");
