import React, { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  FiHome,
  FiBook,
  FiUsers,
  FiRepeat,
  FiSettings,
  FiChevronDown,
  FiBookmark,
  FiBell,
  FiPieChart,
  FiPlusCircle,
} from "react-icons/fi";
import { useAuth } from "../../contexts/AuthContext";
import { useSidebar } from "../../contexts/SidebarContext";
import "./Sidebar.css";

const userMenuItems = [
  { key: "dashboard", label: "Dashboard", icon: FiHome },
  { key: "biblioteca", label: "Biblioteca", icon: FiBookmark },
  { key: "emprestimos", label: "Empréstimos", icon: FiRepeat },
  { key: "notificacoes", label: "Notificações", icon: FiBell },
  { key: "configuracoes", label: "Configurações", icon: FiSettings },
];

// Área do professor: menu propositalmente restrito, sem nenhuma opção
// administrativa — só o essencial para pesquisar livros e gerenciar os
// próprios empréstimos (para si ou para uma turma).
const professorMenuItems = [
  { key: "dashboard", label: "Início", icon: FiHome },
  { key: "novo-emprestimo", label: "Novo empréstimo", icon: FiPlusCircle },
  { key: "emprestimos", label: "Meus empréstimos", icon: FiRepeat },
];

function Sidebar({ type = "admin", activePage, setActivePage }) {
  const { user } = useAuth();
  const { isOpen, close } = useSidebar();
  const { pathname } = useLocation();
  const [openPessoas, setOpenPessoas] = useState(false);
  const [openEmprestimos, setOpenEmprestimos] = useState(false);
  const [openLivros, setOpenLivros] = useState(false);

  const isAdmin = type === "admin" || (!type && user?.tipo === "admin");

  useEffect(() => {
    if (pathname.startsWith("/admin/emprestimos")) setOpenEmprestimos(true);
    if (pathname.startsWith("/admin/livros")) setOpenLivros(true);
    if (/^\/admin\/(alunos|comunidade|admins)/.test(pathname)) setOpenPessoas(true);
  }, [pathname]);

  if (type === "user" || type === "professor") {
    const items = type === "professor" ? professorMenuItems : userMenuItems;
    return (
      <>
        <div className={`sidebar-overlay ${isOpen ? "open" : ""}`} onClick={close} />
        <aside className={`sidebar ${isOpen ? "open" : ""}`}>
          <div className="sidebar-section">
            <p className="sidebar-title">Principal</p>
            <ul>
              {items.map(({ key, label, icon: Icon }) => (
                <li key={key}>
                  <button
                    type="button"
                    className={`sidebar-action ${activePage === key ? "active" : ""}`}
                    aria-current={activePage === key ? "page" : undefined}
                    onClick={() => { setActivePage && setActivePage(key); close(); }}
                  >
                    <Icon />
                    <span>{label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </>
    );
  }

  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? "open" : ""}`} onClick={close} />
      <aside className={`sidebar ${isOpen ? "open" : ""}`}>
        <div className="sidebar-section">
          <p className="sidebar-title">Principal</p>

          <ul>
            <li>
              <NavLink
                to="/admin"
                end
                className={({ isActive }) => (isActive ? "active" : undefined)}
                onClick={close}
              >
                <FiHome />
                <span>Dashboard</span>
              </NavLink>
            </li>

            <li className="submenu-container">
              <button
                type="button"
                className={`submenu-toggle ${openEmprestimos ? "open" : ""}`}
                aria-expanded={openEmprestimos}
                aria-controls="submenu-emprestimos"
                onClick={() => setOpenEmprestimos((current) => !current)}
              >
                <div className="submenu-left">
                  <FiRepeat />
                  <span>Empréstimos</span>
                </div>
                <FiChevronDown className="arrow" />
              </button>

              <ul id="submenu-emprestimos" inert={!openEmprestimos} className={`submenu ${openEmprestimos ? "open" : ""}`}>
                <li>
                  <NavLink
                    to="/admin/emprestimos"
                    end
                    className={({ isActive }) => (isActive ? "active" : undefined)}
                    onClick={close}
                  >
                    Empréstimos e Devoluções
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/admin/emprestimos/solicitacoes"
                    className={({ isActive }) => (isActive ? "active" : undefined)}
                    onClick={close}
                  >
                    Solicitações de Empréstimo
                  </NavLink>
                </li>
              </ul>
            </li>

            {isAdmin && (
              <li className="submenu-container">
                <button
                  type="button"
                  className={`submenu-toggle ${openLivros ? "open" : ""}`}
                  aria-expanded={openLivros}
                  aria-controls="submenu-livros"
                  onClick={() => setOpenLivros((current) => !current)}
                >
                  <div className="submenu-left">
                    <FiBook />
                    <span>Livros</span>
                  </div>
                  <FiChevronDown className="arrow" />
                </button>

                <ul id="submenu-livros" inert={!openLivros} className={`submenu ${openLivros ? "open" : ""}`}>
                  <li>
                    <NavLink
                      to="/admin/livros"
                      end
                      className={({ isActive }) => (isActive ? "active" : undefined)}
                      onClick={close}
                    >
                      Catálogo (acervo)
                    </NavLink>
                  </li>
                  <li>
                    <NavLink to="/admin/livros/cadastros-auxiliares" onClick={close}>
                      Cadastros Auxiliares
                    </NavLink>
                  </li>
                </ul>
              </li>
            )}

            {isAdmin && (
              <li className="submenu-container">
                <button
                  type="button"
                  className={`submenu-toggle ${openPessoas ? "open" : ""}`}
                  aria-expanded={openPessoas}
                  aria-controls="submenu-pessoas"
                  onClick={() => setOpenPessoas((current) => !current)}
                >
                  <div className="submenu-left">
                    <FiUsers />
                    <span>Pessoas</span>
                  </div>
                  <FiChevronDown className="arrow" />
                </button>

                <ul id="submenu-pessoas" inert={!openPessoas} className={`submenu ${openPessoas ? "open" : ""}`}>
                  <li>
                    <NavLink to="/admin/alunos" onClick={close}>
                      Cadastro de Alunos
                    </NavLink>
                  </li>
                  <li>
                    <NavLink to="/admin/comunidade" onClick={close}>
                      Cadastro da Comunidade
                    </NavLink>
                  </li>
                  <li>
                    <NavLink to="/admin/admins" onClick={close}>
                      Cadastro de Administradores
                    </NavLink>
                  </li>
                </ul>
              </li>
            )}

            {isAdmin && (
              <li>
                <NavLink
                  to="/admin/relatorios"
                  className={({ isActive }) => (isActive ? "active" : undefined)}
                  onClick={close}
                >
                  <FiPieChart />
                  <span>Relatórios</span>
                </NavLink>
              </li>
            )}

            <li>
              <NavLink
                to="/admin/notificacoes"
                className={({ isActive }) => (isActive ? "active" : undefined)}
                onClick={close}
              >
                <FiBell />
                <span>Notificações</span>
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
                  onClick={close}
                >
                  <FiSettings />
                  <span>Configurações</span>
                </NavLink>
              </li>
            </ul>
          </div>
        )}
      </aside>
    </>
  );
}

export default Sidebar;
