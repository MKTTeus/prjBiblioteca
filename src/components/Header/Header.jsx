import React from "react";
import "./Header.css";
import { Bell, LogOut, User } from "lucide-react";

function Header() {
  return (
    <header className="header">
      <div className="header-left">
        <div className="header-logo">
          <span className="header-icon">📘</span>
          <div>
            <h2 className="header-title">Sistema de Biblioteca</h2>
            <p className="header-subtitle">Escola 9 de Julho de Taquaritinga</p>
          </div>
        </div>
      </div>

      <div className="header-right">
        <div className="notification">
          <Bell size={20} />
          <span className="badge">3</span>
        </div>
        <div className="user-info">
          <User size={22} />
          <div className="user-text">
            <p className="user-role">Administrador</p>
            <p className="user-name">Sistema</p>
          </div>
        </div>
        <button className="logout-btn">
          <LogOut size={18} />
          Sair
        </button>
      </div>
    </header>
  );
}

export default Header;
