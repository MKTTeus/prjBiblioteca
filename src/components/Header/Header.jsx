import React from "react";
import { LogOut } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import React, { useState, useEffect } from "react";
import "./Header.css";

function Header() {
  const { user, logout } = useAuth();

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
            <img
              src="/logo-novedejulho-semfundo.png"
              alt="Logo Nove de Julho"
              className="login-logo"
            />
          </div>
          <h1 className="header-title">{nomeBiblioteca}</h1>
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
        <button className="logout-btn" onClick={handleLogout}>
          <LogOut size={16} /> Sair
        </button>
      </div>
    </header>
  );
}

export default Header;
