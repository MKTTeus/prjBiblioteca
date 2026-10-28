import React from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ConfiguracoesUser from "./Configuracoes";
import { getMeuPerfil, atualizarMeuPerfil } from "../../../services/api";
import { applyTheme } from "../../../utils/theme";
import { useToast } from "../../../contexts/ToastContext";

jest.mock("../../../services/api", () => ({ getMeuPerfil: jest.fn(), atualizarMeuPerfil: jest.fn() }));
jest.mock("../../../utils/theme", () => ({ applyTheme: jest.fn() }));
jest.mock("../../../contexts/ToastContext", () => ({ useToast: jest.fn() }));
jest.mock("react-imask", () => ({
  IMaskInput: ({ onAccept, value, mask, ...props }) => (
    <input {...props} value={value} onChange={event => onAccept(event.target.value)} />
  ),
}));

const aluno = {
  nome: "Teste", ra: "12345678", email: "teste@escola.com", dataNascimento: "2008-10-04",
  tipo: "Aluno", endereco: "Rua Exemplo", telefone: "11911111111",
  telefoneResponsavel: "11922222222", tema: "Claro",
};
let addToast;
beforeEach(() => {
  jest.clearAllMocks();
  addToast = jest.fn();
  useToast.mockReturnValue({ addToast });
  getMeuPerfil.mockResolvedValue(aluno);
  atualizarMeuPerfil.mockResolvedValue({});
});
const load = async () => {
  render(<ConfiguracoesUser />);
  expect(await screen.findByLabelText("Nome completo")).toHaveValue("Teste");
};

test("mostra quatro seções e preserva dados pessoais somente leitura", async () => {
  await load();
  expect(screen.getByRole("heading", { name: "Dados pessoais" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Aparência" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Informações de contato" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Segurança" })).toBeInTheDocument();
  expect(screen.getByLabelText("Nome completo")).toBeDisabled();
  expect(screen.getByLabelText("RA / Identificação")).toHaveValue("RA: 12345678");
  expect(screen.getByLabelText("Telefone do responsável")).toBeInTheDocument();
});

test("salva informações de contato sem alterar o payload atual", async () => {
  await load();
  fireEvent.change(screen.getByLabelText("Endereço"), { target: { value: "Rua Nova, 50" } });
  fireEvent.click(screen.getByRole("button", { name: "Salvar contato" }));
  await waitFor(() => expect(atualizarMeuPerfil).toHaveBeenCalledWith({
    telefone: "11911111111",
    telefoneResponsavel: "11922222222",
    endereco: "Rua Nova, 50",
  }));
  expect(addToast).toHaveBeenCalledWith("Informações de contato atualizadas", "success");
});

test("seleção de tema mantém salvamento e aplicação imediata", async () => {
  await load();
  const dark = screen.getByRole("button", { name: /Escuro/ });
  expect(dark).toHaveAttribute("aria-pressed", "false");
  fireEvent.click(dark);
  expect(atualizarMeuPerfil).toHaveBeenCalledWith({ tema: "Escuro" });
  expect(applyTheme).toHaveBeenCalledWith("Escuro");
  expect(dark).toHaveAttribute("aria-pressed", "true");
});

test("nova senha exige oito caracteres e confirmação igual", async () => {
  await load();
  expect(screen.getByPlaceholderText("Mínimo 8 caracteres")).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Senha atual"), { target: { value: "antiga123" } });
  fireEvent.change(screen.getByLabelText("Nova senha"), { target: { value: "senha123" } });
  fireEvent.change(screen.getByLabelText("Confirmar nova senha"), { target: { value: "senha123" } });
  fireEvent.click(screen.getByRole("button", { name: "Alterar senha" }));
  await waitFor(() => expect(atualizarMeuPerfil).toHaveBeenCalledWith({ senhaAtual: "antiga123", novaSenha: "senha123" }));
});

test("comunidade não vê telefone do responsável", async () => {
  getMeuPerfil.mockResolvedValue({ ...aluno, tipo: "Comunidade" });
  await load();
  expect(screen.queryByLabelText("Telefone do responsável")).not.toBeInTheDocument();
});
