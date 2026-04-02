// src/utils/auth.js
//linka back end

export function setToken(token, user, remember = false) {
  const storage = remember ? localStorage : sessionStorage;
  storage.setItem("authToken", token);
  storage.setItem("user", JSON.stringify(user));
}

export function getToken() {
  return localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
}

export function getUser() {
  const user = localStorage.getItem("user") || sessionStorage.getItem("user");
  return user ? JSON.parse(user) : null;
}

export function clearAuth() {
  localStorage.removeItem("authToken");
  localStorage.removeItem("user");
  sessionStorage.removeItem("authToken");
  sessionStorage.removeItem("user");
}
export function isLoggedIn() {
  return !!getToken();
}