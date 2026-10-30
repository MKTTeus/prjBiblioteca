import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import NovoEmprestimo from "./NovoEmprestimo";
import { getBooksPage, criarEmprestimoProfessor } from "../../../services/api";

jest.mock("../../../contexts/AuthContext", () => ({ useAuth: () => ({ user: { email: "professor@escola.test", nome: "Professor" } }) }));
jest.mock("../../../contexts/ToastContext", () => ({ useToast: () => ({ addToast: jest.fn() }) }));
jest.mock("../../../services/api", () => ({ getBooksPage: jest.fn(), getTurmasProfessor: jest.fn(), criarEmprestimoProfessor: jest.fn() }));
jest.mock("../../../components/BookCard/BookCard", () => ({ __esModule: true, default: ({ book, onAddToCart }) =>
  <button type="button" onClick={() => onAddToCart(1)}>Adicionar {book.livTitulo}</button> }));

afterEach(() => { sessionStorage.clear(); jest.clearAllMocks(); });

test("mantém finalidade pessoal e só envia depois da revisão", async () => {
  getBooksPage.mockResolvedValue({ itens: [{ idLivro: 12, livTitulo: "O Livro", disponiveis: 2 }], total: 1 });
  criarEmprestimoProfessor.mockResolvedValue({ finalidade: "PESSOAL", totalLivros: 1, totalExemplares: 1 });
  render(<NovoEmprestimo />);
  expect(screen.getByRole("button", { name: /Para uma turma/ })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Para mim/ }));
  fireEvent.click(await screen.findByRole("button", { name: "Adicionar O Livro" }));
  fireEvent.click(screen.getByRole("button", { name: /Ver livros selecionados/ }));
  fireEvent.click(screen.getByRole("button", { name: "Revisar solicitação" }));
  expect(screen.getByText(/Destino:/).closest("p")).toHaveTextContent("Empréstimo pessoal");
  expect(criarEmprestimoProfessor).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Confirmar e enviar solicitação" }));
  await waitFor(() => expect(criarEmprestimoProfessor).toHaveBeenCalledWith(expect.objectContaining({ finalidade: "PESSOAL", itens: [{ idLivro: 12, quantidade: 1 }] })));
});

test("retoma o carrinho ao voltar para o cadastro do professor", async () => {
  getBooksPage.mockResolvedValue({ itens: [{ idLivro: 12, livTitulo: "O Livro", disponiveis: 2 }], total: 1 });
  const first = render(<NovoEmprestimo />);
  fireEvent.click(screen.getByRole("button", { name: /Para mim/ }));
  fireEvent.click(await screen.findByRole("button", { name: "Adicionar O Livro" }));
  await waitFor(() => expect(screen.getByText("O Livro")).toBeInTheDocument());
  first.unmount();

  render(<NovoEmprestimo />);
  expect(screen.getByText(/pedido em andamento foi recuperado/)).toBeInTheDocument();
  expect(screen.getByText("O Livro")).toBeInTheDocument();
});
