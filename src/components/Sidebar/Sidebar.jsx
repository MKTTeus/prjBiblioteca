import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  FiHome,
  FiBookOpen,
  FiBook,
  FiUsers,
  FiRepeat,
  FiSettings,
  FiLogOut,
  FiChevronDown
} from "react-icons/fi";
import { useAuth } from "../../contexts/AuthContext";
import "./Sidebar.css";

function Sidebar() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [openPessoas, setOpenPessoas] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <aside className="sidebar">
      <div>
        <div className="sidebar-section">
          <p className="sidebar-title">Principal</p>
          <ul>
            <li>
              <NavLink to="/" className={({ isActive }) => (isActive ? "active" : undefined)}>
                <FiHome /> Dashboard
              </NavLink>
            </li>

            {/* <li>
              <NavLink to="/biblioteca" className={({ isActive }) => (isActive ? "active" : undefined)}>
                <FiBookOpen /> Biblioteca
              </NavLink>
            </li> */}

            <li>
              <NavLink to="/livros" className={({ isActive }) => (isActive ? "active" : undefined)}>
                <FiBook /> Livros
              </NavLink>
            </li>

            {/* SUBMENU PESSOAS */}
            <li className="submenu-container">
              <div
                className={`submenu-toggle ${openPessoas ? "open" : ""}`}
                onClick={() => setOpenPessoas(!openPessoas)}
              >
                <div className="submenu-left">
                  <FiUsers />
                  <span>Pessoas</span>
                </div>
                <FiChevronDown className="arrow" />
              </div>

              <ul className={`submenu ${openPessoas ? "open" : ""}`}>
                <li>
                  <NavLink to="/alunos">Cadastro de Alunos</NavLink>
                </li>
                <li>
                  <NavLink to="/comunidade">Cadastro de Comunidade</NavLink>
                </li>
                <li>
                  <NavLink to="/admins">Cadastro de Admins</NavLink>
                </li>
              </ul>
            </li>

            <li>
              <NavLink to="/emprestimos" className={({ isActive }) => (isActive ? "active" : undefined)}>
                <FiRepeat /> Empréstimos e Devoluções
              </NavLink>
            </li>
            
           
              <p className="sidebar-title sidebar-system">Sistema</p>
                 <ul>
                  <li>
                    <NavLink to="/configuracoes" className={({ isActive }) => (isActive ? "active" : undefined)}>
                      <FiSettings /> Configurações
                    </NavLink>
                   </li>
                 </ul>
          
          </ul>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
