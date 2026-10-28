import React from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import BookCard from "./BookCard";

jest.mock("../Modal/Modal", () => ({ show, children, ariaLabel }) =>
  show ? <div role="dialog" aria-label={ariaLabel}>{children}</div> : null
);

const book = {
  idLivro: 42,
  livTitulo: "O Pequeno Príncipe",
  livAutor: "Antoine de Saint-Exupéry",
  livDescricao: "Uma descrição completa para o teste.",
  livCapaURL: "/placeholder.png",
  livAtivo: true,
  total_exemplares: 2,
  disponiveis: 2,
};

const oldMatchMedia = window.matchMedia;
beforeAll(() => {
  window.matchMedia = jest.fn((query) => ({
    matches: query === "(max-width: 768px)",
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  }));
});
afterAll(() => { window.matchMedia = oldMatchMedia; });

test("toque no card do usuário abre a descrição no mobile", () => {
  render(<BookCard book={book} openDetailsOnCard allowCoverPreview />);
  fireEvent.click(screen.getByRole("heading", { name: "O Pequeno Príncipe" }));
  expect(screen.getByRole("dialog", { name: "Janela de diálogo" })).toHaveTextContent("Uma descrição completa para o teste.");
});

test("botões de empréstimo e capa não abrem a descrição por engano", () => {
  const onRequestLoan = jest.fn();
  render(<BookCard book={book} openDetailsOnCard allowCoverPreview onRequestLoan={onRequestLoan} />);
  fireEvent.click(screen.getByRole("button", { name: /Solicitar empréstimo de O Pequeno Príncipe/i }));
  expect(onRequestLoan).toHaveBeenCalledWith(book);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Ver capa completa de O Pequeno Príncipe" }));
  expect(screen.getByRole("dialog", { name: "Capa completa de O Pequeno Príncipe" })).toBeInTheDocument();
});

test("outros cards não recebem abertura por toque", () => {
  render(<BookCard book={book} />);
  fireEvent.click(screen.getByRole("heading", { name: "O Pequeno Príncipe" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

test("acesso explícito à descrição permanece disponível por teclado", () => {
  render(<BookCard book={book} openDetailsOnCard />);
  fireEvent.click(screen.getByRole("button", { name: "Ler descrição completa" }));
  expect(screen.getByRole("dialog")).toHaveTextContent(book.livDescricao);
});
