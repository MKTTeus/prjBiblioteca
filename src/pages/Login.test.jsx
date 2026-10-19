import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import Login from "./Login";

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({ useNavigate: () => mockNavigate }));
jest.mock("../contexts/AuthContext", () => ({ useAuth: () => ({ login: jest.fn() }) }));

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
