import { API_URL } from "./apiConfig";

const LAST_ACTIVITY = "session-last-activity";
const TIMEOUT = "session-timeout-ms";
const DEFAULT_TIMEOUT = 30 * 60 * 1000;
let renewal = null;
let renewalTimer = null;

export function tokenLifetime(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return { expiresAt: Number(payload.exp) * 1000, timeoutMs: Number(payload.ttl) * 60000 };
  } catch {
    return { expiresAt: 0, timeoutMs: 0 };
  }
}

export function getSessionTimeout() {
  return Number(localStorage.getItem(TIMEOUT)) || DEFAULT_TIMEOUT;
}

export function getLastActivity() {
  return Number(localStorage.getItem(LAST_ACTIVITY)) || 0;
}

export function setSessionTimeout(ms) {
  if (Number.isFinite(ms) && ms >= 60000) localStorage.setItem(TIMEOUT, String(ms));
  window.dispatchEvent(new Event("session-activity"));
}

export function clearSession() {
  if (renewalTimer) clearTimeout(renewalTimer);
  renewalTimer = null;
  localStorage.removeItem(LAST_ACTIVITY);
  localStorage.removeItem(TIMEOUT);
  localStorage.removeItem("user");
  localStorage.removeItem("token");
  localStorage.removeItem("tipo");
}

export function rememberSessionPath() {
  const path = window.location.hash.slice(1).split("?")[0];
  if (/^\/admin\/(livros|alunos|comunidade|admins)$/.test(path)) {
    sessionStorage.setItem("session-return-path", path);
  }
  sessionStorage.setItem("session-expired-message", "Sua sessão expirou. Entre novamente para continuar. Rascunhos de cadastros, se houver, serão recuperados.");
}

export function expireSession() {
  rememberSessionPath();
  clearSession();
  window.location.href = "/#/login";
}

export function touchSession() {
  const last = getLastActivity();
  if (last && Date.now() - last >= getSessionTimeout()) {
    expireSession();
    return false;
  }
  if (last && Date.now() - last < 1000) return true;
  localStorage.setItem(LAST_ACTIVITY, String(Date.now()));
  window.dispatchEvent(new Event("session-activity"));
  return true;
}

export function scheduleRenewal() {
  if (renewalTimer) clearTimeout(renewalTimer);
  renewalTimer = null;
  const token = localStorage.getItem("token");
  if (!token) return;
  const { expiresAt } = tokenLifetime(token);
  if (!expiresAt) return; // tokens legados são tratados pelas chamadas normais
  const lead = Math.min(30000, getSessionTimeout() / 2);
  renewalTimer = setTimeout(() => {
    renewSession().catch(() => {
      // Falhas transitórias não encerram uma sessão ainda válida.
      if (localStorage.getItem("token") && Date.now() < expiresAt) {
        renewalTimer = setTimeout(scheduleRenewal, 5000);
      }
    });
  }, Math.max(0, expiresAt - Date.now() - lead));
}

export async function renewSession() {
  if (renewal) return renewal;
  const token = localStorage.getItem("token");
  if (!token) return null;
  const last = getLastActivity();
  if (last && Date.now() - last >= getSessionTimeout()) {
    expireSession();
    throw new Error("Sessão expirada por inatividade");
  }
  renewal = (async () => {
    const res = await fetch(`${API_URL}/sessao/renovar`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) {
      if (localStorage.getItem("token") === token) expireSession();
      throw new Error("Sessão expirada. Entre novamente para continuar.");
    }
    if (!res.ok) throw new Error("Não foi possível renovar a sessão. Tente novamente.");
    const data = await res.json();
    if (!data.access_token) throw new Error("Resposta inválida ao renovar a sessão.");
    if (localStorage.getItem("token") === token) {
      localStorage.setItem("token", data.access_token);
      const { timeoutMs } = tokenLifetime(data.access_token);
      if (timeoutMs) setSessionTimeout(timeoutMs);
      window.dispatchEvent(new CustomEvent("session-token", { detail: data.access_token }));
      scheduleRenewal();
    }
    return localStorage.getItem("token");
  })();
  try { return await renewal; } finally { renewal = null; }
}

export async function ensureFreshSession() {
  const token = localStorage.getItem("token");
  if (!token) return null;
  const last = getLastActivity();
  if (last && Date.now() - last >= getSessionTimeout()) {
    expireSession();
    throw new Error("Sessão expirada por inatividade");
  }
  const { expiresAt } = tokenLifetime(token);
  if (expiresAt && expiresAt - Date.now() <= Math.min(30000, getSessionTimeout() / 2)) {
    return renewSession();
  }
  return token;
}
