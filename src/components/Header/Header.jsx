import React, { useState, useEffect } from "react";
import { Bell, LogOut, Menu } from "lucide-react";
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
    <header className={`header${isAdmin || isUser ? " admin-header" : ""}`}>
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
        {(isAdmin || isUser) && <>
          <div id={isAdmin ? "admin-header-notifications" : undefined} className="header-notification-slot">
            {pathname !== (isAdmin ? "/admin" : "/user") && (
              <Link to={isAdmin ? "/admin/notificacoes" : "/user/notificacoes"} className="header-bell" aria-label="Ver notificações">
                <Bell size={21} aria-hidden="true" />
              </Link>
            )}
          </div>
          <span className="admin-header-greeting">Olá, {user?.nome?.split(" ")[0] || (isAdmin ? "Administrador" : "Leitor")}</span>
        </>}
        <button className="logout-btn" onClick={handleLogout}>
          <LogOut size={16} /> Sair
        </button>
      </div>
    </header>
  );
}

export default Header;
