import React, { useState, useEffect } from "react";
import { Bell, LogOut, Menu, UserRound, ChevronDown } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useSidebar } from "../../contexts/SidebarContext";
import { Link, useLocation } from "react-router-dom";
import "./Header.css";

function Header({ sidebarType = "admin" }) {
  const { user, logout } = useAuth();
  const { toggle, toggleCollapse } = useSidebar();
  const { pathname } = useLocation();
  const isAdmin = sidebarType === "admin";
  const isUser = sidebarType === "user";

  const [nomeBiblioteca, setNomeBiblioteca] = useState(
    localStorage.getItem("nomeBiblioteca") || "Sala de Leitura"
  );

  useEffect(() => {
    const handler = () =>
      setNomeBiblioteca(localStorage.getItem("nomeBiblioteca") || "Sala de Leitura");

    window.addEventListener("nomeBibliotecaAtualizado", handler);
    window.addEventListener("storage", handler);

    return () => {
      window.removeEventListener("nomeBibliotecaAtualizado", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const roleLabel = user?.professor
    ? "Professor"
    : {
        admin: "Administrador",
        Aluno: "Aluno",
        Comunidade: "Comunidade",
        aluno: "Aluno",
        comunidade: "Comunidade",
        user: "Usuário",
      }[user?.tipo] || "Usuário";

  const handleLogout = () => logout();

  return (
    <header className={`header${isAdmin ? " admin-header" : isUser ? " user-header" : ""}`}>
      <div className="header-left">
        <button type="button" className="hamburger-btn" onClick={() => {
          if ((isAdmin || isUser) && window.innerWidth > 768) toggleCollapse();
          else toggle();
        }} aria-label="Alternar menu">
          <Menu size={22} />
        </button>
        <Link to={isAdmin ? "/admin" : isUser ? "/user" : "/dashboard"} className="header-logo">
          <div className="header-icon">
            <img
              src={isAdmin || isUser ? "/logo-novedejulho-semfundo.png" : "/logo-novedejulho-fundo.png"}
              alt="Logo Nove de Julho"
              className="header-brand-logo"
              width="48"
              height="48"
            />
          </div>
          <h1 className="header-title">{nomeBiblioteca}</h1>
        </Link>
      </div>

      {!isAdmin && !isUser && <div className="header-center">
        {user && (
          <p className="welcome-text">
            Bem-vindo,{" "}
            <span className="highlight">
              {user.nome} ({roleLabel})
            </span>
          </p>
        )}
      </div>}

      <div className="header-right">
        {isAdmin && <>
          <div id="admin-header-notifications" className="header-notification-slot">
            {pathname !== "/admin" && <Link to="/admin/notificacoes" className="header-bell" aria-label="Ver notificações"><Bell size={21} /></Link>}
          </div>
          <span className="admin-header-greeting">Olá, {user?.nome?.split(" ")[0] || "Administrador"}</span>
        </>}
        {isUser && (
          <div className="user-header-tools">
            <Link to="/user/notificacoes" className="user-header-bell" aria-label="Ver notificações">
              <Bell size={20} aria-hidden="true" />
            </Link>
            <Link to="/user/configuracoes" className="user-header-profile" aria-label="Abrir configurações do perfil">
              <span className="user-header-profile__icon"><UserRound size={17} aria-hidden="true" /></span>
              <span className="user-header-profile__name">{user?.nome?.split(" ")[0] || "Usuário"} <small>({roleLabel})</small></span>
              <ChevronDown size={14} aria-hidden="true" />
            </Link>
          </div>
        )}
        <button className="logout-btn" onClick={handleLogout}>
          <LogOut size={16} /> Sair
        </button>
      </div>
    </header>
  );
}

export default Header;
