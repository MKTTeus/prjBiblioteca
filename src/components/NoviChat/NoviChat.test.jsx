import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import NoviChat from "./NoviChat";
import { perguntarNovi } from "../../services/api";

jest.mock("../../services/api", () => ({ perguntarNovi: jest.fn() }));
jest.mock("../../contexts/AuthContext", () => ({ useAuth: () => ({ user: { email: "gestor@escola.test" } }) }));
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({ useNavigate: () => mockNavigate }));

beforeAll(() => { Element.prototype.scrollIntoView = jest.fn(); });
afterEach(() => { jest.clearAllMocks(); sessionStorage.clear(); });

test("abre o chat, envia a pergunta e navega pelo destino permitido", async () => {
  perguntarNovi.mockResolvedValue({
    resposta: "Abra a lista de solicitações e confira o pedido.",
    destino: { rotulo: "Solicitações de Empréstimo", caminho: "/admin/emprestimos/solicitacoes" },
  });
  render(<NoviChat />);
  fireEvent.click(screen.getByRole("button", { name: "Abrir chat da Novi" }));
  expect(screen.getByRole("dialog", { name: "Conversa com Novi" })).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Digite sua pergunta para a Novi"), { target: { value: "Como aprovo?" } });
  fireEvent.click(screen.getByRole("button", { name: "Enviar pergunta" }));
  expect(perguntarNovi).toHaveBeenCalledWith("Como aprovo?", [], expect.any(AbortSignal));
  expect(await screen.findByText("Abra a lista de solicitações e confira o pedido.")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Abrir Solicitações de Empréstimo/ })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Abrir Solicitações de Empréstimo/ }));
  expect(mockNavigate).toHaveBeenCalledWith("/admin/emprestimos/solicitacoes");
  fireEvent.click(screen.getByRole("button", { name: "Limpar" }));
  expect(screen.queryByText("Abra a lista de solicitações e confira o pedido.")).not.toBeInTheDocument();
});

test("não apresenta navegação fora das rotas de gestor e fecha com Escape", async () => {
  perguntarNovi.mockResolvedValue({ resposta: "Resposta", destino: { rotulo: "Externo", caminho: "https://example.com" } });
  render(<NoviChat />);
  fireEvent.click(screen.getByRole("button", { name: "Abrir chat da Novi" }));
  fireEvent.click(screen.getByRole("button", { name: "Como cadastrar um livro?" }));
  await waitFor(() => expect(screen.getByText("Resposta")).toBeInTheDocument());
  expect(screen.queryByRole("button", { name: /Abrir Externo/ })).not.toBeInTheDocument();
  fireEvent.keyDown(document, { key: "Escape" });
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

test("renderiza negrito e listas sem interpretar HTML enviado na resposta", async () => {
  perguntarNovi.mockResolvedValue({ resposta: "Abra **Cadastro de Livros**.\n- **Novo Livro**\n<img src=x onerror=alert(1)>" });
  const { container } = render(<NoviChat />);
  fireEvent.click(screen.getByRole("button", { name: "Abrir chat da Novi" }));
  fireEvent.click(screen.getByRole("button", { name: "Como cadastrar um livro?" }));
  await waitFor(() => expect(screen.getByText("Cadastro de Livros").tagName).toBe("STRONG"));
  expect(screen.getByText("Novo Livro").tagName).toBe("STRONG");
  expect(container.querySelector("img")).toBeNull();
  expect(screen.getByText(/<img src=x onerror=/)).toBeInTheDocument();
});

test("informa quando a análise da pergunta está indisponível", async () => {
  perguntarNovi.mockRejectedValue({ status: 503 });
  render(<NoviChat />);
  fireEvent.click(screen.getByRole("button", { name: "Abrir chat da Novi" }));
  fireEvent.click(screen.getByRole("button", { name: "Como cadastrar um livro?" }));
  expect(await screen.findByText(/temporariamente indisponível para analisar sua pergunta/)).toBeInTheDocument();
});

test("mostra o diagnóstico seguro de configuração retornado pela API", async () => {
  perguntarNovi.mockRejectedValue({ status: 503, data: { detail: "A Novi não está configurada neste ambiente. Avise a equipe responsável pelo sistema." } });
  render(<NoviChat />);
  fireEvent.click(screen.getByRole("button", { name: "Abrir chat da Novi" }));
  fireEvent.click(screen.getByRole("button", { name: "Como cadastrar um livro?" }));
  expect(await screen.findByText(/não está configurada neste ambiente/)).toBeInTheDocument();
});

test("envia as respostas da Novi como contexto da pergunta seguinte e ignora avisos de erro", async () => {
  perguntarNovi
    .mockResolvedValueOnce({ resposta: "Encontrei **7 títulos** com Harry Potter.", destino: null })
    .mockRejectedValueOnce({ status: 503 })
    .mockResolvedValueOnce({ resposta: "Cada título tem de 2 a 4 exemplares.", destino: null });
  render(<NoviChat />);
  fireEvent.click(screen.getByRole("button", { name: "Abrir chat da Novi" }));
  const campo = screen.getByLabelText("Digite sua pergunta para a Novi");
  const enviar = async (texto, esperado) => {
    fireEvent.change(campo, { target: { value: texto } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar pergunta" }));
    expect(await screen.findByText(esperado)).toBeInTheDocument();
  };
  await enviar("Quantos livros de Harry Potter?", /Encontrei/);
  await enviar("E o segundo?", /temporariamente indisponível/);
  await enviar("Quantos exemplares há de cada?", /Cada título tem/);
  expect(perguntarNovi).toHaveBeenLastCalledWith(
    "Quantos exemplares há de cada?",
    [
      { papel: "gestor", texto: "Quantos livros de Harry Potter?" },
      { papel: "novi", texto: "Encontrei **7 títulos** com Harry Potter." },
    ],
    expect.any(AbortSignal),
  );
});

test("retoma a conversa após remontagem e limpa o contexto quando solicitado", async () => {
  perguntarNovi.mockResolvedValueOnce({ resposta: "Abra Cadastro de Livros." })
    .mockResolvedValueOnce({ resposta: "Use Novo Livro." });
  const first = render(<NoviChat />);
  fireEvent.click(screen.getByRole("button", { name: "Abrir chat da Novi" }));
  fireEvent.click(screen.getByRole("button", { name: "Como cadastrar um livro?" }));
  expect(await screen.findByText("Abra Cadastro de Livros.")).toBeInTheDocument();
  first.unmount();

  render(<NoviChat />);
  fireEvent.click(screen.getByRole("button", { name: "Abrir chat da Novi" }));
  expect(screen.getByText("Abra Cadastro de Livros.")).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Digite sua pergunta para a Novi"), { target: { value: "E depois?" } });
  fireEvent.click(screen.getByRole("button", { name: "Enviar pergunta" }));
  expect(perguntarNovi).toHaveBeenLastCalledWith("E depois?", [
    { papel: "gestor", texto: "Como cadastrar um livro?" },
    { papel: "novi", texto: "Abra Cadastro de Livros." },
  ], expect.any(AbortSignal));
  expect(await screen.findByText("Use Novo Livro.")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Limpar" }));
  expect(JSON.parse(sessionStorage.getItem("novi-conversa-v1")).mensagens).toEqual([]);
});
