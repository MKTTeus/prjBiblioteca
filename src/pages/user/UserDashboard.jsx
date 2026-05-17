import React, { useState } from "react";
import AppShell from "../../components/AppShell/AppShell";
import Biblioteca from "./Biblioteca/Biblioteca";
import DashboardHome from "./Dashboard/DashboardHome";
import Emprestimos from "./Emprestimos/Emprestimos";
import Notificacoes from "./Notificacoes/Notificacoes";

const pages = {
  dashboard: DashboardHome,
  biblioteca: Biblioteca,
  emprestimos: Emprestimos,
  notificacoes: Notificacoes,
};

export default function UserDashboard() {
  const [activePage, setActivePage] = useState("dashboard");
  const CurrentPage = pages[activePage] || DashboardHome;

  return (
    <AppShell
      sidebarType="user"
      activePage={activePage}
      setActivePage={setActivePage}
    >
      <CurrentPage onViewAllNotifications={() => setActivePage("notificacoes")} />
    </AppShell>
  );
}
