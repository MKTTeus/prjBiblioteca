
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function RequireAuth({ children }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    // guarda de onde veio para redirecionar depois (opcional)
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}
