import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import NoviChat from "./NoviChat";
import { perguntarNovi } from "../../services/api";

jest.mock("../../services/api", () => ({ perguntarNovi: jest.fn() }));
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({ useNavigate: () => mockNavigate }));

beforeAll(() => { Element.prototype.scrollIntoView = jest.fn(); });
afterEach(() => jest.clearAllMocks());

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
