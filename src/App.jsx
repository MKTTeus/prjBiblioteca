import React, { lazy, Suspense, useEffect } from "react";
import { Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import AppShell from "./components/AppShell/AppShell";
const Dashboard = lazy(() => import("./pages/Admin/Dashboard/Dashboard"));
const Livros = lazy(() => import("./pages/Admin/CadastroLivros/CadastroLivros"));
const CadastrosAuxiliares = lazy(() => import("./pages/Admin/CadastroLivros/components/CadastrosAuxiliares/CadastrosAuxiliares"));
const GenerosTab = lazy(() => import("./pages/Admin/CadastroLivros/components/CadastrosAuxiliares/tabs/GenerosTab"));
const AutoresTab = lazy(() => import("./pages/Admin/CadastroLivros/components/CadastrosAuxiliares/tabs/AutoresTab"));
const Aluno = lazy(() => import("./pages/Admin/CadastroAlunos/Aluno"));
const Comunidade = lazy(() => import("./pages/Admin/CadastroComunidade/Comunidade"));
const Emprestimos = lazy(() => import("./pages/Admin/Emprestimos/Emprestimos"));
const SolicitacoesEmprestimo = lazy(() => import("./pages/Admin/Emprestimos/SolicitacoesEmprestimo"));
const Admin = lazy(() => import("./pages/Admin/CadastroAdmins/Admin"));
const Login = lazy(() => import("./pages/Login"));
const Biblioteca = lazy(() => import("./pages/Admin/Biblioteca/Biblioteca"));
const EsqueciSenha = lazy(() => import("./pages/EsqueciSenha"));
const RedefinirSenha = lazy(() => import("./pages/RedefinirSenha"));
const PrimeiroAcesso = lazy(() => import("./pages/PrimeiroAcesso"));
import ProtectedRoute from "./components/ProtectedRoute";
const Configuracoes = lazy(() => import("./pages/Admin/Configuracoes/Configuracoes"));
const Geral = lazy(() => import("./pages/Admin/Configuracoes/components/Geral/Geral"));
const Notificacoes = lazy(() => import("./pages/Admin/Configuracoes/components/Notificacoes/Notificacoes"));
const Seguranca = lazy(() => import("./pages/Admin/Configuracoes/components/Seguranca/Seguranca"));
const Email = lazy(() => import("./pages/Admin/Configuracoes/components/Email/Email"));
const Avancado = lazy(() => import("./pages/Admin/Configuracoes/components/Avancado/Avancado"));
const AdminNotificacoes = lazy(() => import("./pages/Admin/Notificacoes/Notificacoes"));
const Backups = lazy(() => import("./pages/Admin/Configuracoes/components/Backup/Backups"));
const AnoLetivo = lazy(() => import("./pages/Admin/Configuracoes/components/AnoLetivo/AnoLetivo"));
const UserDashboard = lazy(() => import("./pages/user/UserDashboard"));
const Relatorios = lazy(() => import("./pages/Admin/Relatorios/Relatorios"));
const PainelProfessor = lazy(() => import("./pages/Professor/PainelProfessor"));

function RoleHomeRedirect() {
  const { user, loadingUser } = useAuth();

  if (loadingUser) {
    return <div>Carregando...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.tipo === "admin") {
    return <Navigate to={user.professor ? "/professor" : "/admin"} replace />;
  }
  return <Navigate to="/user" replace />;
}

function LegacyAdminRedirect() {
  const location = useLocation();
  return <Navigate to={`/admin${location.pathname}`} replace />;
}

function LegacyBibliotecaRedirect() {
  const { user, loadingUser } = useAuth();

  if (loadingUser) {
    return <div>Carregando...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.tipo === "admin") {
    return <Navigate to={user.professor ? "/professor" : "/admin/biblioteca"} replace />;
  }
  return <Navigate to="/user" replace />;
}

function AdminLayout() {
  return (
    <AppShell sidebarType="admin">
      <Suspense fallback={<div className="route-loading" role="status" aria-label="Carregando conteúdo" />}>
        <Outlet />
      </Suspense>
    </AppShell>
  );
}

function App() {
  useEffect(() => {
    import("./utils/theme").then(({ applyTheme, getSavedTheme }) => {
      applyTheme(getSavedTheme(), { animate: false });
    });
  }, []);
  return (
    <Suspense fallback={<div className="route-loading" role="status" aria-label="Carregando conteúdo" />}>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/esqueci-senha" element={<EsqueciSenha />} />
      <Route path="/redefinir-senha" element={<RedefinirSenha />} />
      <Route
        path="/primeiro-acesso"
        element={
          <ProtectedRoute nonAdminOnly>
            <PrimeiroAcesso />
          </ProtectedRoute>
        }
      />

      <Route path="/" element={<RoleHomeRedirect />} />
      <Route
        path="/user"
        element={
          <ProtectedRoute nonAdminOnly>
            <UserDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/professor"
        element={
          <ProtectedRoute professorOnly>
            <PainelProfessor />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <ProtectedRoute gestorOnly>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="livros" element={<Livros />} />
        <Route path="livros/cadastros-auxiliares" element={<CadastrosAuxiliares />}>
          <Route index element={<Navigate to="generos" replace />} />
          <Route path="generos" element={<GenerosTab />} />
          <Route path="autores" element={<AutoresTab />} />
        </Route>
        <Route path="alunos" element={<Aluno />} />
        <Route path="comunidade" element={<Comunidade />} />
        <Route path="emprestimos" element={<Emprestimos />} />
        <Route path="emprestimos/solicitacoes" element={<SolicitacoesEmprestimo />} />
        <Route path="relatorios" element={<Relatorios />} />
        <Route path="notificacoes" element={<AdminNotificacoes />} />
        <Route path="admins" element={<Admin />} />
        <Route path="biblioteca" element={<Biblioteca />} />
        <Route path="configuracoes" element={<Configuracoes />}>
          <Route index element={<Navigate to="geral" replace />} />
          <Route path="geral" element={<Geral />} />
          <Route path="notificacoes" element={<Notificacoes />} />
          <Route path="seguranca" element={<Seguranca />} />
          <Route path="email" element={<Email />} />
          <Route path="ano-letivo" element={<AnoLetivo />} />
          <Route path="avancado" element={<Avancado />} />
          <Route path="backups" element={<Backups />} />
        </Route>
      </Route>

      <Route path="/livros" element={<LegacyAdminRedirect />} />
      <Route path="/alunos" element={<LegacyAdminRedirect />} />
      <Route path="/comunidade" element={<LegacyAdminRedirect />} />
      <Route path="/emprestimos" element={<LegacyAdminRedirect />} />
      <Route path="/admins" element={<LegacyAdminRedirect />} />
      <Route path="/configuracoes/*" element={<LegacyAdminRedirect />} />
      <Route path="/Biblioteca" element={<LegacyBibliotecaRedirect />} />
      <Route path="*" element={<RoleHomeRedirect />} />
    </Routes>
    </Suspense>
  );
}

export default App;
