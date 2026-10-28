import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { SidebarProvider } from "../../contexts/SidebarContext";

global.TextEncoder = require("util").TextEncoder;
const { MemoryRouter } = require("react-router-dom");
const Sidebar = require("./Sidebar").default;

jest.mock("../../contexts/AuthContext", () => ({
  useAuth: () => ({ user: { tipo: "admin" }, logout: jest.fn() }),
}));

const renderSidebar = (path = "/admin") => render(
  <MemoryRouter initialEntries={[path]}>
    <SidebarProvider><Sidebar type="admin" /></SidebarProvider>
  </MemoryRouter>,
);

test("admin permite manter Empréstimos, Livros e Pessoas abertos simultaneamente", () => {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 375 });
  renderSidebar();
  const emprestimos = screen.getByRole("button", { name: "Empréstimos" });
  const livros = screen.getByRole("button", { name: "Livros" });
  const pessoas = screen.getByRole("button", { name: "Pessoas" });

  fireEvent.click(emprestimos);
  fireEvent.click(livros);
  fireEvent.click(pessoas);
  expect(emprestimos).toHaveAttribute("aria-expanded", "true");
  expect(livros).toHaveAttribute("aria-expanded", "true");
  expect(pessoas).toHaveAttribute("aria-expanded", "true");

  // Fechar manualmente um grupo não modifica os demais.
  fireEvent.click(livros);
  expect(emprestimos).toHaveAttribute("aria-expanded", "true");
  expect(livros).toHaveAttribute("aria-expanded", "false");
  expect(pessoas).toHaveAttribute("aria-expanded", "true");

  expect(screen.getByRole("link", { name: "Empréstimos e Devoluções" })).toHaveAttribute("href", "/admin/emprestimos");
  expect(screen.getByRole("link", { name: "Cadastro da Comunidade" })).toHaveAttribute("href", "/admin/comunidade");
});

test("Relatórios mantém os outros grupos abertos e expande a seção pela rota", () => {
  renderSidebar("/admin/relatorios/acervo");
  const relatorios = screen.getByRole("button", { name: "Relatórios" });
  const pessoas = screen.getByRole("button", { name: "Pessoas" });
  expect(relatorios).toHaveAttribute("aria-expanded", "true");
  fireEvent.click(pessoas);
  expect(relatorios).toHaveAttribute("aria-expanded", "true");
  expect(pessoas).toHaveAttribute("aria-expanded", "true");
  expect(screen.getByRole("link", { name: "Acervo por Grupo" })).toHaveAttribute("href", "/admin/relatorios/acervo");
});

test("navegar para outra seção expande o grupo correspondente sem fechar outros", () => {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 1024 });
  renderSidebar("/admin/emprestimos");
  const emprestimos = screen.getByRole("button", { name: "Empréstimos" });
  const livros = screen.getByRole("button", { name: "Livros" });
  expect(emprestimos).toHaveAttribute("aria-expanded", "true");

  fireEvent.click(livros);
  fireEvent.click(screen.getByRole("link", { name: "Catálogo (acervo)" }));

  expect(emprestimos).toHaveAttribute("aria-expanded", "true");
  expect(livros).toHaveAttribute("aria-expanded", "true");
});
