import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function ProtectedRoute({
  children,
  adminOnly = false,
  nonAdminOnly = false,
}) {
  const { user, loadingUser } = useAuth();
  const location = useLocation();
  const homePath = user?.tipo === "admin" ? "/admin" : "/user";

  if (loadingUser) {
    return <div>Carregando...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && user.tipo !== "admin") {
    return <Navigate to={homePath} replace />;
  }

  if (nonAdminOnly && user.tipo === "admin") {
    return <Navigate to="/admin" replace />;
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