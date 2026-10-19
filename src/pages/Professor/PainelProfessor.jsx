import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AppShell from "../../components/AppShell/AppShell";
import DashboardProfessor from "./Dashboard/DashboardProfessor";
import NovoEmprestimo from "./NovoEmprestimo/NovoEmprestimo";
import MeusEmprestimos from "./MeusEmprestimos/MeusEmprestimos";
import "./PainelProfessor.css";

// O endereço acompanha a página para permitir histórico, atualização e links diretos.
const pages = {
  dashboard: DashboardProfessor,
  "novo-emprestimo": NovoEmprestimo,
  emprestimos: MeusEmprestimos,
};

export default function PainelProfessor() {
  const location = useLocation();
  const navigate = useNavigate();
  const requestedPage = location.pathname.split("/")[2] || "dashboard";
  const activePage = pages[requestedPage] ? requestedPage : "dashboard";
  const setActivePage = (page) => { if (pages[page]) navigate(page === "dashboard" ? "/professor" : `/professor/${page}`); };
  const CurrentPage = pages[activePage] || DashboardProfessor;

  return (
    <AppShell sidebarType="professor" activePage={activePage} setActivePage={setActivePage}>
      <CurrentPage onNavigate={setActivePage} />
    </AppShell>
  );
}
