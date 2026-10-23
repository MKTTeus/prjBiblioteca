import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { SidebarProvider } from "../../contexts/SidebarContext";

global.TextEncoder = require("util").TextEncoder;
const { MemoryRouter } = require("react-router-dom");
const Sidebar = require("./Sidebar").default;

jest.mock("../../contexts/AuthContext", () => ({
  useAuth: () => ({ user: { tipo: "admin" }, logout: jest.fn() }),
}));

test("admin mobile menu keeps real routes and opens only one accordion", () => {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 375 });
  render(
    <MemoryRouter initialEntries={["/admin"]}>
      <SidebarProvider><Sidebar type="admin" /></SidebarProvider>
    </MemoryRouter>,
  );

  fireEvent.click(screen.getByRole("button", { name: "Empréstimos" }));
  expect(screen.getByRole("button", { name: "Empréstimos" })).toHaveAttribute("aria-expanded", "true");
  expect(screen.getByRole("link", { name: "Empréstimos e Devoluções" })).toHaveAttribute("href", "/admin/emprestimos");
  fireEvent.click(screen.getByRole("button", { name: "Livros" }));
  expect(screen.getByRole("button", { name: "Empréstimos" })).toHaveAttribute("aria-expanded", "false");
  expect(screen.getByRole("button", { name: "Livros" })).toHaveAttribute("aria-expanded", "true");
  expect(screen.getByRole("link", { name: "Cadastros Auxiliares" })).toHaveAttribute("href", "/admin/livros/cadastros-auxiliares");
  expect(screen.getByRole("link", { name: "Cadastro da Comunidade" })).toHaveAttribute("href", "/admin/comunidade");
});
