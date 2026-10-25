import React, { lazy, Suspense } from "react";
import Skeleton from "../../components/Skeleton/Skeleton";
import { useLocation, useNavigate } from "react-router-dom";
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
  const location = useLocation();
  const navigate = useNavigate();
  const requestedPage = location.pathname.split("/")[2] || "dashboard";
  const activePage = pages[requestedPage] ? requestedPage : "dashboard";
  const setActivePage = (page) => { if (pages[page]) navigate(page === "dashboard" ? "/user" : `/user/${page}`); };
  const CurrentPage = pages[activePage] || DashboardHome;

  return (
    <AppShell
      sidebarType="user"
      activePage={activePage}
      setActivePage={setActivePage}
    >
      <Suspense fallback={<Skeleton variant="page" />}>
        <CurrentPage
          onViewAllNotifications={() => setActivePage("notificacoes")}
          onNavigate={setActivePage}
        />
      </Suspense>
    </AppShell>
  );
}
