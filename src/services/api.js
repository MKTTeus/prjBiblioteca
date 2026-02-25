// src/services/api.js
const BASE_URL = "http://localhost:5000"; // ajuste conforme seu backend

// Pega o token salvo no localStorage
export const getToken = () => localStorage.getItem("token");

// Função auxiliar para requisições GET com token
const fetchWithToken = async (endpoint) => {
  const token = getToken();
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Erro na requisição");
  }
  return res.json();
};

// ===================== LIVROS ===================== //
export const getBooks = async () => {
  return fetchWithToken("/livros");
};

export const createBook = async (payload) => {
  const token = getToken();
  const res = await fetch(`${BASE_URL}/livros`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Erro ao criar livro");
  }
  return res.json();
};

export const deleteBook = async (idLivro) => {
  const token = getToken();
  const res = await fetch(`${BASE_URL}/livros/${idLivro}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Erro ao deletar livro");
  }
  return res.json();
};

// ===================== CAPA ===================== //
export const uploadCover = async (file) => {
  const token = getToken();
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${BASE_URL}/upload-capa`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Erro ao enviar capa");
  }
  return res.json();
};

// ===================== CATEGORIAS E GÊNEROS ===================== //
export async function getCategorias() {
  return fetchWithToken("/categorias");
}

export function getGeneros() {
  return fetchWithToken("/generos");
}

export function getDashboardStats() {
  return fetchWithToken("/dashboard-stats");
}

// ===== ADMINS =====
export function getAdmins() {
  return fetchWithToken("/admins");
}

export function createAdmin(payload) {
  const token = getToken();
  return fetch(`${BASE_URL}/admins`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  }).then(async (res) => {
    if (!res.ok) throw new Error((await res.text()) || "Erro ao criar admin");
    return res.json();
  });
}

export function updateAdmin(idAdmin, payload) {
  const token = getToken();
  return fetch(`${BASE_URL}/admins/${idAdmin}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  }).then(async (res) => {
    if (!res.ok) throw new Error((await res.text()) || "Erro ao atualizar admin");
    return res.json();
  });
}

export function deleteAdmin(idAdmin) {
  const token = getToken();
  return fetch(`${BASE_URL}/admins/${idAdmin}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }).then(async (res) => {
    if (!res.ok) throw new Error((await res.text()) || "Erro ao deletar admin");
    return res.json();
  });
}

// ===== ALUNOS =====
export function getAlunos() {
  return fetchWithToken("/alunos");
}

export function createAluno(payload) {
  const token = getToken();
  return fetch(`${BASE_URL}/alunos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  }).then(async (res) => {
    if (!res.ok) throw new Error((await res.text()) || "Erro ao criar aluno");
    return res.json();
  });
}

export function updateAluno(idUsuario, payload) {
  const token = getToken();
  return fetch(`${BASE_URL}/alunos/${idUsuario}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  }).then(async (res) => {
    if (!res.ok) throw new Error((await res.text()) || "Erro ao atualizar aluno");
    return res.json();
  });
}

export function deleteAluno(idUsuario) {
  const token = getToken();
  return fetch(`${BASE_URL}/alunos/${idUsuario}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }).then(async (res) => {
    if (!res.ok) throw new Error((await res.text()) || "Erro ao deletar aluno");
    return res.json();
  });
}

// ===== COMUNIDADE =====
export function getComunidade() {
  return fetchWithToken("/comunidade");
}

export function createComunidade(payload) {
  const token = getToken();
  return fetch(`${BASE_URL}/comunidade`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  }).then(async (res) => {
    if (!res.ok) throw new Error((await res.text()) || "Erro ao criar membro");
    return res.json();
  });
}

export function updateComunidade(idUsuario, payload) {
  const token = getToken();
  return fetch(`${BASE_URL}/comunidade/${idUsuario}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  }).then(async (res) => {
    if (!res.ok) throw new Error((await res.text()) || "Erro ao atualizar membro");
    return res.json();
  });
}

export function deleteComunidade(idUsuario) {
  const token = getToken();
  return fetch(`${BASE_URL}/comunidade/${idUsuario}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  }).then(async (res) => {
    if (!res.ok) throw new Error((await res.text()) || "Erro ao deletar membro");
    return res.json();
  });
}