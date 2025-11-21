import React from "react";
import { Bell, LogOut } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import "./Header.css";

function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => logout();

  return (
    <header className="header">
      <div className="header-left">
        <div className="header-logo">
          <div className="header-icon">📚</div>
          <h1 className="header-title">Biblioteca</h1>
        </div>
      </div>

      <div className="header-center">
        {user && (
          <p className="welcome-text">
            👋 Bem-vindo,{" "}
            <span className="highlight">
              {user.nome} ({user.tipo === "admin" ? "Administrador" : "Aluno"})
            </span>
          </p>
        )}
      </div>

      <div className="header-right">
        <div className="notification">
          <Bell size={20} />
          <span className="badge">3</span>
        </div>
        <button className="logout-btn" onClick={handleLogout}>
          <LogOut size={16} /> Sair
        </button>
      </div>
    </header>
  );
}

export default Header;
