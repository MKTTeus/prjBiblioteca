import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function ProtectedRoute({
  children,
  adminOnly = false,
  nonAdminOnly = false,
  gestorOnly = false,
  professorOnly = false,
}) {
  const { user, loadingUser } = useAuth();
  const location = useLocation();
  const isAdminTipo = user?.tipo === "admin";
  const isProfessor = isAdminTipo && !!user?.professor;
  const isGestor = isAdminTipo && !isProfessor;
  const homePath = isProfessor ? "/professor" : isAdminTipo ? "/admin" : "/user";

  if (loadingUser) {
    return <div>Carregando...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !isAdminTipo) {
    return <Navigate to={homePath} replace />;
  }

  if (nonAdminOnly && isAdminTipo) {
    return <Navigate to={homePath} replace />;
  }

  // Painel administrativo: somente equipe gestora (admProfessor = false).
  // Professor é redirecionado para sua própria área restrita.
  if (gestorOnly && !isGestor) {
    return <Navigate to={homePath} replace />;
  }

  // Área do professor: somente admProfessor = true.
  if (professorOnly && !isProfessor) {
    return <Navigate to={homePath} replace />;
  }

  // Primeiro acesso: aluno/comunidade com senha da importação ou definida
  // pelo admin precisa trocá-la antes de usar o resto do sistema.
  const precisaTrocarSenha = user.tipo !== "admin" && user.senhaProvisoria;

  if (precisaTrocarSenha && location.pathname !== "/primeiro-acesso") {
    return <Navigate to="/primeiro-acesso" replace />;
  }

  if (!precisaTrocarSenha && location.pathname === "/primeiro-acesso") {
    return <Navigate to={homePath} replace />;
  }

  return children;
}