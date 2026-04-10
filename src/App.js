import React from "react";
import { Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import AppShell from "./components/AppShell/AppShell";
import Dashboard from "./pages/Admin/Dashboard/Dashboard";
import Livros from "./pages/Admin/CadastroLivros/CadastroLivros";
import Aluno from "./pages/Admin/CadastroAlunos/Aluno";
import Comunidade from "./pages/Admin/CadastroComunidade/Comunidade";
import Emprestimos from "./pages/Admin/Emprestimos/Emprestimos";
import Admin from "./pages/Admin/CadastroAdmins/Admin";
import Login from "./pages/Login";
import Biblioteca from "./pages/Admin/Biblioteca/Biblioteca";
import Signup from "./pages/Signup";
import ProtectedRoute from "./components/ProtectedRoute";
import Configuracoes from "./pages/Admin/Configuracoes/Configuracoes";
import Geral from "./pages/Admin/Configuracoes/components/Geral/Geral";
import Notificacoes from "./pages/Admin/Configuracoes/components/Notificacoes/Notificacoes";
import Seguranca from "./pages/Admin/Configuracoes/components/Seguranca/Seguranca";
import Sistema from "./pages/Admin/Configuracoes/components/Sistema/Sistema";
import Email from "./pages/Admin/Configuracoes/components/Email/Email";
import Avancado from "./pages/Admin/Configuracoes/components/Avancado/Avancado";
import AdminNotificacoes from "./pages/Admin/Notificacoes/Notificacoes";
import UserDashboard from "./pages/user/UserDashboard";

function RoleHomeRedirect() {
  const { user, loadingUser } = useAuth();

  if (loadingUser) {
    return <div>Carregando...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={user.tipo === "admin" ? "/admin" : "/user"} replace />;
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

  return <Navigate to={user.tipo === "admin" ? "/admin/biblioteca" : "/user"} replace />;
}

function AdminLayout() {
  return (
    <AppShell sidebarType="admin">
      <Outlet />
    </AppShell>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

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
        path="/admin"
        element={
          <ProtectedRoute adminOnly>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="livros" element={<Livros />} />
        <Route path="alunos" element={<Aluno />} />
        <Route path="comunidade" element={<Comunidade />} />
        <Route path="emprestimos" element={<Emprestimos />} />
        <Route path="notificacoes" element={<AdminNotificacoes />} />
        <Route path="admins" element={<Admin />} />
        <Route path="biblioteca" element={<Biblioteca />} />
        <Route path="configuracoes" element={<Configuracoes />}>
          <Route index element={<Navigate to="geral" replace />} />
          <Route path="geral" element={<Geral />} />
          <Route path="notificacoes" element={<Notificacoes />} />
          <Route path="seguranca" element={<Seguranca />} />
          <Route path="sistema" element={<Sistema />} />
          <Route path="email" element={<Email />} />
          <Route path="avancado" element={<Avancado />} />
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
  );
}

export default App;
