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