import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Login from "./Login";

const mockNavigate = jest.fn();
const mockLogin = jest.fn();
jest.mock("react-router-dom", () => ({ useNavigate: () => mockNavigate }));
jest.mock("../contexts/AuthContext", () => ({ useAuth: () => ({ login: mockLogin }) }));

beforeEach(() => {
  mockNavigate.mockClear();
  mockLogin.mockReset();
  sessionStorage.clear();
});

test("perfis e recuperação de senha são botões acessíveis pelo teclado", () => {
  render(<Login />);
  const equipe = screen.getByRole("button", { name: /Equipe Escolar/ });
  equipe.focus();
  fireEvent.click(equipe);
  expect(equipe).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByLabelText("E-mail")).toBeInTheDocument();
  expect(screen.getByLabelText("Senha")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Esqueci minha senha" }));
  expect(mockNavigate).toHaveBeenCalledWith("/esqueci-senha");
});

test("um login gestor prepara a apresentação da Novi somente após sucesso", async () => {
  mockLogin.mockResolvedValue({ ok: true, tipo: "admin", professor: false });
  render(<Login />);
  fireEvent.click(screen.getByRole("button", { name: /Equipe Escolar/ }));
  fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "gestor@escola.com" } });
  fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "senha" } });
  fireEvent.click(screen.getByRole("button", { name: /^Entrar/ }));

  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/admin", { replace: true }));
  expect(sessionStorage.getItem("novi-welcome-pending")).toBe("1");
});

test("um login de professor não prepara a apresentação da Novi", async () => {
  mockLogin.mockResolvedValue({ ok: true, tipo: "admin", professor: true });
  render(<Login />);
  fireEvent.click(screen.getByRole("button", { name: /Equipe Escolar/ }));
  fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "professor@escola.com" } });
  fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "senha" } });
  fireEvent.click(screen.getByRole("button", { name: /^Entrar/ }));

  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/professor", { replace: true }));
  expect(sessionStorage.getItem("novi-welcome-pending")).toBeNull();
});
