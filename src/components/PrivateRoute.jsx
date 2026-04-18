import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

// PrivateRoute protege qualquer rota que precise de login
export default function PrivateRoute({ children, adminOnly = false }) {
  const { isAuthenticated, user, isAdmin } = useAuth();

  if (!isAuthenticated) {
    // se não estiver logado, redireciona para login
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !isAdmin) {
    // se rota é só para admin e usuário não é admin
    return <Navigate to="/" replace />;
  }

  return children;
}
