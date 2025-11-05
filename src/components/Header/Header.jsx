import React from "react";
import "./Header.css";
import { Bell, LogOut, User } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

function Header() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout(); // limpa o usuário do contexto
    navigate("/login"); // redireciona para a tela de login
  };

  return (
    <header className="header">
      <div className="header-left">
        <h1>Biblioteca</h1>
      </div>

      <div className="header-right">
        <button className="icon-btn">
          <Bell size={20} />
        </button>
        <button className="icon-btn">
          <User size={20} />
        </button>
        <button className="icon-btn" onClick={handleLogout}>
          <LogOut size={20} />
        </button>
      </div>
    </header>
  );
}

export default Header;
