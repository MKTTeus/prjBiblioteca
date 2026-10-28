import React from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Emprestimos from "./Emprestimos";
import { getEmprestimos } from "../../../services/api";

jest.mock("../../../services/api", () => ({ getEmprestimos: jest.fn() }));
const sample = [
  { idEmprestimo: 1, idExemplar: 10, titulo: "A Marca de Atena", codigo: "T0012", status: "pendente", dataEmprestimo: "2026-10-27" },
  { idEmprestimo: 2, idExemplar: 11, titulo: "O Último Olimpiano", codigo: "T0018", status: "aprovado" },
  { idEmprestimo: 3, idExemplar: 12, titulo: "O Ladrão de Raios", codigo: "T0003", status: "ativo", dataEmprestimo: "2026-10-20", dataPrevistaDevolucao: "2026-11-03", renovacoes: 1 },
  { idEmprestimo: 4, idExemplar: 13, titulo: "O Mar de Monstros", codigo: "T0007", status: "atrasado", dataPrevistaDevolucao: "2026-10-06" },
  { idEmprestimo: 5, idExemplar: 14, titulo: "Livro devolvido", codigo: "T0009", status: "devolvido", dataDevolucao: "2026-10-18" },
];

beforeEach(() => {
  jest.clearAllMocks();
  getEmprestimos.mockResolvedValue(sample);
});

const renderPage = () => render(<MemoryRouter initialEntries={["/user/emprestimos"]}><Emprestimos /></MemoryRouter>);

test("apresenta categorias sem misturar pendentes e aprovados", async () => {
  renderPage();
  expect(await screen.findByText("A Marca de Atena")).toBeInTheDocument();
  expect(screen.getByText("O Último Olimpiano")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Em análise \(1\)/ }));
  expect(screen.getByText("A Marca de Atena")).toBeInTheDocument();
  expect(screen.queryByText("O Último Olimpiano")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Aguardando retirada \(1\)/ }));
  expect(screen.getByText("O Último Olimpiano")).toBeInTheDocument();
});

test("busca por tombo, abre detalhes e exibe datas formatadas", async () => {
  renderPage();
  await screen.findByText("O Ladrão de Raios");
  fireEvent.change(screen.getByRole("searchbox", { name: "Buscar empréstimos" }), { target: { value: "T0003" } });
  expect(screen.getByText("O Ladrão de Raios")).toBeInTheDocument();
  expect(screen.queryByText("A Marca de Atena")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Ver detalhes de O Ladrão de Raios" }));
  expect(screen.getByText("Renovações registradas")).toBeInTheDocument();
  expect(screen.getByText("03/11/2026")).toBeInTheDocument();
});

test("mostra histórico e estado vazio com link de exploração", async () => {
  renderPage();
  await screen.findByText("O Ladrão de Raios");
  fireEvent.click(screen.getByRole("button", { name: /Histórico \(1\)/ }));
  expect(screen.getByText("Livro devolvido")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Em análise \(1\)/ }));
  fireEvent.change(screen.getByRole("searchbox", { name: "Buscar empréstimos" }), { target: { value: "inexistente" } });
  expect(screen.getByText("Nenhum resultado para sua busca")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Limpar busca" }));
  expect(screen.getByText("A Marca de Atena")).toBeInTheDocument();
});

test("mostra estado geral vazio sem registros", async () => {
  getEmprestimos.mockResolvedValue([]);
  renderPage();
  expect(await screen.findByText("Nenhum empréstimo encontrado")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Explorar livros" })).toBeInTheDocument();
});

test("erro da API permite tentar novamente", async () => {
  getEmprestimos.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce([]);
  renderPage();
  expect(await screen.findByText("Não foi possível carregar os empréstimos")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
  expect(await screen.findByText("Nenhum empréstimo encontrado")).toBeInTheDocument();
  expect(getEmprestimos).toHaveBeenCalledTimes(2);
});
