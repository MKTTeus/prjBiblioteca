import { getBooksForManagement } from "./api";

jest.mock("./session", () => ({ ensureFreshSession: async () => "token" }));

afterEach(() => { jest.restoreAllMocks(); });

test("gestão percorre páginas após o limite sem esconder títulos", async () => {
  const requests = [];
  global.fetch = jest.fn(async (url) => {
    requests.push(url);
    const page = Number(new URL(url).searchParams.get("page"));
    const batch = page === 1 ? Array.from({ length: 1000 }, (_, index) => ({ idLivro: index + 1 })) : [{ idLivro: 1001 }];
    return { ok: true, json: async () => batch };
  });

  const books = await getBooksForManagement();
  expect(books).toHaveLength(1001);
  expect(books.at(-1).idLivro).toBe(1001);
  expect(requests).toHaveLength(2);
  expect(requests[1]).toContain("page=2&per_page=1000");
});
