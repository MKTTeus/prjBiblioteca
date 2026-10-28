import React from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import Notificacoes from "./Notificacoes";
import { getEmprestimos, getPublicBookDetails } from "../../../services/api";

const navigate = jest.fn();
jest.mock("react-router-dom", () => ({ useNavigate: () => navigate }));
jest.mock("../../../services/api", () => ({ getEmprestimos: jest.fn(), getPublicBookDetails: jest.fn() }));

beforeEach(() => {
  jest.clearAllMocks();
  getPublicBookDetails.mockResolvedValue({ livro: { livCapaURL: null } });
});

test("separa atraso de atualizações e usa a data real da devolução", async () => {
  getEmprestimos.mockResolvedValue([
    {idEmprestimo:1,idExemplar:1,titulo:"Livro devolvido",status:"devolvido",
      dataEmprestimo:"2026-10-01",dataPrevistaDevolucao:"2026-10-10",dataDevolucao:"2026-10-08"},
    {idEmprestimo:2,idExemplar:2,titulo:"Livro atrasado",status:"atrasado",dataPrevistaDevolucao:"2026-10-02"},
    {idEmprestimo:3,idExemplar:3,titulo:"Solicitado",status:"aprovado",dataEmprestimo:"2026-10-04"},
  ]);
  render(<Notificacoes/>);
  expect(await screen.findByText("Livro devolvido")).toBeInTheDocument();
  expect(screen.getByText("Precisam da sua atenção (1)")).toBeInTheDocument();
  expect(screen.getByText("Atualizações dos empréstimos (2)")).toBeInTheDocument();
  // A data prevista não pode ser exibida como data da devolução.
  const returnToggle = screen.getByRole("button", {name:/Expandir notificação: Devolução registrada/});
  expect(returnToggle).toHaveTextContent("08/10/2026");
  fireEvent.click(returnToggle);
  expect(screen.getByText("Data da devolução")).toBeInTheDocument();
  expect(screen.getAllByText("08/10/2026").length).toBeGreaterThan(0);
  expect(screen.getByText("10/10/2026")).toBeInTheDocument();
});

test("abre detalhes e navega para os empréstimos existentes", async () => {
  getEmprestimos.mockResolvedValue([{idEmprestimo:4,idExemplar:4,titulo:"O Ladrão de Raios",status:"atrasado",codigo:"T0003",dataPrevistaDevolucao:"2026-10-15"}]);
  render(<Notificacoes/>);
  fireEvent.click(await screen.findByRole("button", {name:/Expandir notificação: Devolução em atraso/}));
  expect(screen.getByText("Tombo")).toBeInTheDocument();
  expect(screen.getByText("T0003")).toBeInTheDocument();
  fireEvent.click(screen.getAllByRole("button", {name:"Ver empréstimo"})[0]);
  expect(navigate).toHaveBeenCalledWith("/user/emprestimos");
});

test("exibe mensagem correta quando não há empréstimos", async () => {
  getEmprestimos.mockResolvedValue([]);
  render(<Notificacoes/>);
  expect(await screen.findByText("Tudo em dia!")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", {name:"Explorar livros"}));
  expect(navigate).toHaveBeenCalledWith("/user/biblioteca");
});

test("mostra erro e permite tentar novamente", async () => {
  getEmprestimos.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce([]);
  render(<Notificacoes/>);
  expect(await screen.findByText("Não foi possível carregar suas notificações")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", {name:"Tentar novamente"}));
  expect(await screen.findByText("Tudo em dia!")).toBeInTheDocument();
  expect(getEmprestimos).toHaveBeenCalledTimes(2);
});

test("carrega capa real e mantém fallback quando não há imagem", async () => {
  getEmprestimos.mockResolvedValue([
    {idEmprestimo:6,idExemplar:6,idLivro:605,titulo:"Com capa",status:"devolvido"},
    {idEmprestimo:7,idExemplar:7,idLivro:606,titulo:"Sem capa",status:"pendente"},
  ]);
  getPublicBookDetails.mockImplementation(id => Promise.resolve({livro:{livCapaURL:id===605?"https://example.org/605.jpg":null}}));
  const {container}=render(<Notificacoes/>);
  expect(await screen.findByRole("img",{name:"Capa de Com capa"})).toBeInTheDocument();
  expect(container.querySelectorAll(".user-notice-cover svg").length).toBeGreaterThan(0);
});
