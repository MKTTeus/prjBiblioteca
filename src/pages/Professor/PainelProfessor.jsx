import React, { useState } from "react";
import AppShell from "../../components/AppShell/AppShell";
import DashboardProfessor from "./Dashboard/DashboardProfessor";
import NovoEmprestimo from "./NovoEmprestimo/NovoEmprestimo";
import MeusEmprestimos from "./MeusEmprestimos/MeusEmprestimos";
import "./PainelProfessor.css";

// Área restrita do professor. Segue o mesmo padrão de orquestração de
// páginas usado em UserDashboard: cada item do menu troca a página
// exibida dentro do mesmo AppShell, sem depender de rotas próprias.
const pages = {
  dashboard: DashboardProfessor,
  "novo-emprestimo": NovoEmprestimo,
  emprestimos: MeusEmprestimos,
};

export default function PainelProfessor() {
  const [activePage, setActivePage] = useState("dashboard");
  const CurrentPage = pages[activePage] || DashboardProfessor;

  return (
    <AppShell sidebarType="professor" activePage={activePage} setActivePage={setActivePage}>
      <CurrentPage onNavigate={setActivePage} />
    </AppShell>
  );
}