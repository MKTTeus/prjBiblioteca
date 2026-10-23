import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AppShell from "./AppShell";

jest.mock("react-router-dom", () => ({ Outlet: () => <div>Conteúdo</div> }));
jest.mock("../Header/Header", () => () => <div>Header</div>);
jest.mock("../Sidebar/Sidebar", () => () => <div>Sidebar</div>);
jest.mock("../NoviChat/NoviChat", () => () => <div>NoviChat</div>);
jest.mock("../../contexts/SidebarContext", () => ({ useSidebar: () => ({ isCollapsed: false }) }));

afterEach(() => sessionStorage.clear());

test("apresenta a Novi uma vez após o login e não volta ao trocar de tela", async () => {
  sessionStorage.setItem("novi-welcome-pending", "1");
  const { rerender, unmount } = render(<AppShell activePage="dashboard" />);
  expect(screen.getByRole("dialog", { name: "Apresentação da Novi" })).toBeInTheDocument();
  await waitFor(() => expect(sessionStorage.getItem("novi-welcome-pending")).toBeNull());

  fireEvent.click(screen.getByRole("button", { name: "Entendi" }));
  rerender(<AppShell activePage="livros" />);
  await waitFor(() => expect(screen.queryByRole("dialog", { name: "Apresentação da Novi" })).not.toBeInTheDocument());
  unmount();
  render(<AppShell activePage="dashboard" />);
  expect(screen.queryByRole("dialog", { name: "Apresentação da Novi" })).not.toBeInTheDocument();
});
