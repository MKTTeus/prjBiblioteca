import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function ProtectedRoute({
  children,
  adminOnly = false,
  nonAdminOnly = false,
}) {
  const { user, loadingUser } = useAuth();
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

  return children;
}
