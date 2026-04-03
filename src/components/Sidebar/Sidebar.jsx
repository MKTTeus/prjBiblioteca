import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  FiHome,
  FiBook,
  FiUsers,
  FiRepeat,
  FiSettings,
  FiChevronDown,
  FiBookmark,
  FiBell,
} from "react-icons/fi";
import { useAuth } from "../../contexts/AuthContext";
import "./Sidebar.css";

const userMenuItems = [
  { key: "dashboard", label: "Dashboard", icon: FiHome },
  { key: "biblioteca", label: "Biblioteca", icon: FiBookmark },
  { key: "emprestimos", label: "Empréstimos", icon: FiRepeat },
  { key: "notificacoes", label: "Notificações", icon: FiBell },
];

function Sidebar({ type = "admin", activePage, setActivePage }) {
  const { user } = useAuth();
  const [openPessoas, setOpenPessoas] = useState(false);

  const isAdmin = type === "admin" || (!type && user?.tipo === "admin");

  if (type === "user") {
    return (
      <aside className="sidebar">
        <div className="sidebar-section">
          <p className="sidebar-title">Principal</p>

          <ul>
            {userMenuItems.map(({ key, label, icon: Icon }) => (
              <li key={key}>
                <button
                  type="button"
                  className={`sidebar-action ${activePage === key ? "active" : ""}`}
                  onClick={() => setActivePage && setActivePage(key)}
                >
                  <Icon />
                  <span>{label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    );
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-section">
        <p className="sidebar-title">Principal</p>

        <ul>
          <li>
            <NavLink
              to="/admin"
              end
              className={({ isActive }) => (isActive ? "active" : undefined)}
            >
              <FiHome />
              <span>Dashboard</span>
            </NavLink>
          </li>

          {isAdmin && (
            <li>
              <NavLink
                to="/admin/livros"
                className={({ isActive }) => (isActive ? "active" : undefined)}
              >
                <FiBook />
                <span>Livros</span>
              </NavLink>
            </li>
          )}

          {isAdmin && (
            <li className="submenu-container">
              <button
                type="button"
                className={`submenu-toggle ${openPessoas ? "open" : ""}`}
                onClick={() => setOpenPessoas((current) => !current)}
              >
                <div className="submenu-left">
                  <FiUsers />
                  <span>Pessoas</span>
                </div>
                <FiChevronDown className="arrow" />
              </button>

              <ul className={`submenu ${openPessoas ? "open" : ""}`}>
                <li>
                  <NavLink to="/admin/alunos">Cadastro de Alunos</NavLink>
                </li>
                <li>
                  <NavLink to="/admin/comunidade">Cadastro da Comunidade</NavLink>
                </li>
                <li>
                  <NavLink to="/admin/admins">Cadastro de Administradores</NavLink>
                </li>
              </ul>
            </li>
          )}

          <li>
            <NavLink
              to="/admin/emprestimos"
              className={({ isActive }) => (isActive ? "active" : undefined)}
            >
              <FiRepeat />
              <span>Empréstimos e Devoluções</span>
            </NavLink>
          </li>
        </ul>
      </div>

      {isAdmin && (
        <div className="sidebar-section">
          <p className="sidebar-title sidebar-system">Sistema</p>

          <ul>
            <li>
              <NavLink
                to="/admin/configuracoes"
                className={({ isActive }) => (isActive ? "active" : undefined)}
              >
                <FiSettings />
                <span>Configurações</span>
              </NavLink>
            </li>
          </ul>
        </div>
      )}
    </aside>
  );
}

export default Sidebar;
