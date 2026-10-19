import { clearSession, ensureFreshSession, getLastActivity, getSessionTimeout, setSessionTimeout, touchSession, tokenLifetime } from "./session";
import { API_URL } from "./apiConfig";

const makeToken = (exp, ttl = 1) => `header.${btoa(JSON.stringify({ exp, ttl }))}.signature`;

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  global.fetch = jest.fn();
  jest.useRealTimers();
});

afterEach(() => { clearSession(); jest.restoreAllMocks(); });

test("uma ação próxima ao vencimento renova o token e mantém o último acesso", async () => {
  const now = 1700000000000;
  jest.spyOn(Date, "now").mockReturnValue(now);
  const antigo = makeToken(Math.floor((now + 15000) / 1000));
  const novo = makeToken(Math.floor((now + 60000) / 1000));
  localStorage.setItem("token", antigo);
  setSessionTimeout(60000);
  expect(touchSession()).toBe(true);
  fetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ access_token: novo }) });

  expect(await ensureFreshSession()).toBe(novo);
  expect(fetch).toHaveBeenCalledWith(`${API_URL}/sessao/renovar`, expect.objectContaining({ method: "POST", headers: { Authorization: `Bearer ${antigo}` } }));
  expect(localStorage.getItem("token")).toBe(novo);
  expect(getLastActivity()).toBe(now);
  expect(getSessionTimeout()).toBe(tokenLifetime(novo).timeoutMs);
});

test("ações sucessivas adiam o limite de inatividade configurado", () => {
  let now = 1700000000000;
  jest.spyOn(Date, "now").mockImplementation(() => now);
  localStorage.setItem("token", makeToken(Math.floor((now + 600000) / 1000)));
  setSessionTimeout(60000);
  touchSession();
  now += 40000;
  expect(touchSession()).toBe(true);
  now += 40000;
  expect(getLastActivity() + getSessionTimeout() - now).toBe(20000);
});

test("a renovação não aceita conta revogada", async () => {
  const now = 1700000000000;
  jest.spyOn(Date, "now").mockReturnValue(now);
  localStorage.setItem("token", makeToken(Math.floor((now + 15000) / 1000)));
  setSessionTimeout(60000);
  touchSession();
  fetch.mockResolvedValue({ ok: false, status: 401 });
  await expect(ensureFreshSession()).rejects.toThrow("Sessão expirada");
  expect(localStorage.getItem("token")).toBeNull();
});
