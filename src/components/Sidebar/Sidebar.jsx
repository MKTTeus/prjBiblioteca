import React from "react";
import { NavLink } from "react-router-dom";
import {
  FiHome,
  FiBookOpen,
  FiBook,
  FiUsers,
  FiRepeat,
  FiSettings,
  FiLogOut,
} from "react-icons/fi";
import "./Sidebar.css";

function Sidebar() {
  return (
    <aside className="sidebar">
      <div>
        <h2 className="sidebar-logo">📚 Biblioteca</h2>

        {/* ======= MENU PRINCIPAL ======= */}
        <div className="sidebar-section">
          <p className="sidebar-title">Principal</p>
          <ul>
            <li>
              <NavLink
                to="/"
                className={({ isActive }) => (isActive ? "active" : undefined)}
              >
                <FiHome /> Dashboard
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/biblioteca"
                className={({ isActive }) => (isActive ? "active" : undefined)}
              >
                <FiBookOpen /> Biblioteca
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/livros"
                className={({ isActive }) => (isActive ? "active" : undefined)}
              >
                <FiBook /> Livros
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/alunos"
                className={({ isActive }) => (isActive ? "active" : undefined)}
              >
                <FiUsers /> Alunos
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/emprestimos"
                className={({ isActive }) => (isActive ? "active" : undefined)}
              >
                <FiRepeat /> Empréstimos e Devoluções
              </NavLink>
            </li>
          </ul>
        </div>
      </div>

      {/* ======= RODAPÉ ======= */}
      <div className="sidebar-bottom">
        <ul>
          <li>
            <NavLink
              to="/configuracoes"
              className={({ isActive }) => (isActive ? "active" : undefined)}
            >
              <FiSettings /> Sistema e Configurações
            </NavLink>
          </li>
          <li className="logout">
            <FiLogOut /> Sair
          </li>
        </ul>
      </div>
    </aside>
  );
}

export default Sidebar;
