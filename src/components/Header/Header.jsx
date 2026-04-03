import React from "react";
import { Bell, LogOut } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { LuBookOpen } from "react-icons/lu";
import "./Header.css";

function Header() {
  const { user, logout } = useAuth();

  const roleLabel =
    {
      admin: "Administrador",
      aluno: "Aluno",
      comunidade: "Comunidade",
      user: "Usuário",
    }[user?.tipo] || "Usuário";

  const handleLogout = () => logout();

  return (
    <header className="header">
      <div className="header-left">
        <div className="header-logo">
          <div className="header-icon">
            <LuBookOpen className="user-icon" />
          </div>
          <h1 className="header-title">Biblioteca</h1>
        </div>
      </div>

      <div className="header-center">
        {user && (
          <p className="welcome-text">
            Bem-vindo,{" "}
            <span className="highlight">
              {user.nome} ({roleLabel})
            </span>
          </p>
        )}
      </div>

      <div className="header-right">
        <div className="notification">
          <Bell size={20} />
        </div>
        <button className="logout-btn" onClick={handleLogout}>
          <LogOut size={16} /> Sair
        </button>
      </div>
    </header>
  );
}

export default Header;
