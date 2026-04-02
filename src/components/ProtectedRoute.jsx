import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function ProtectedRoute({ children, adminOnly = false }) {

  const { user, loadingUser } = useAuth();

  // enquanto verifica login
  if (loadingUser) {
    return <div>Carregando...</div>;
  }

  // usuário não logado
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // rota apenas para admin
  if (adminOnly && user.tipo !== "admin") {
    return <Navigate to="/" replace />;
  }

  return children;
}