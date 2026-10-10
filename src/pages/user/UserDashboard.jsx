import React, { lazy, Suspense, useState } from "react";
import AppShell from "../../components/AppShell/AppShell";
const Biblioteca = lazy(() => import("./Biblioteca/Biblioteca"));
const DashboardHome = lazy(() => import("./Dashboard/DashboardHome"));
const Emprestimos = lazy(() => import("./Emprestimos/Emprestimos"));
const Notificacoes = lazy(() => import("./Notificacoes/Notificacoes"));
const ConfiguracoesUser = lazy(() => import("./Configuracoes/Configuracoes"));

const pages = {
  dashboard: DashboardHome,
  biblioteca: Biblioteca,
  emprestimos: Emprestimos,
    notificacoes: Notificacoes,
    configuracoes: ConfiguracoesUser,
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
      <Suspense fallback={<div className="page-shell">Carregando página...</div>}>
        <CurrentPage
          onViewAllNotifications={() => setActivePage("notificacoes")}
          onNavigate={setActivePage}
        />
      </Suspense>
    </AppShell>
  );
}
