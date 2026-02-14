import React from "react";
import { NavLink } from "react-router-dom";
import { FiHome, FiBookOpen, FiBook, FiUsers, FiRepeat, FiSettings, FiLogOut } from "react-icons/fi";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import "./Sidebar.css";

function Sidebar() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => logout();

  return (
    <aside className="sidebar">
      <div>
        <div className="sidebar-section">
          <p className="sidebar-title">Principal</p>
          <ul>
            <li><NavLink to="/" className={({ isActive }) => (isActive ? "active" : undefined)}><FiHome /> Dashboard</NavLink></li>
            <li><NavLink to="/biblioteca" className={({ isActive }) => (isActive ? "active" : undefined)}><FiBookOpen /> Biblioteca</NavLink></li>
            <li><NavLink to="/livros" className={({ isActive }) => (isActive ? "active" : undefined)}><FiBook /> Livros</NavLink></li>
            <li><NavLink to="/alunos" className={({ isActive }) => (isActive ? "active" : undefined)}><FiUsers /> Alunos</NavLink></li>
            <li><NavLink to="/emprestimos" className={({ isActive }) => (isActive ? "active" : undefined)}><FiRepeat /> Empréstimos e Devoluções</NavLink></li>
          </ul>
        </div>
      </div>
      <div className="sidebar-bottom">
        <div className="sidebar-section">
          <p className="sidebar-title">Sistema</p>
          <ul>
            <li><NavLink to="/configuracoes" className={({ isActive }) => (isActive ? "active" : undefined)}><FiSettings /> Configurações</NavLink></li>
          </ul>
        </div>
        <ul className="logout-section">
          <li className="logout" onClick={handleLogout}><FiLogOut /> Sair</li>
        </ul>
      </div>
    </aside>
  );
}

export default Sidebar;
