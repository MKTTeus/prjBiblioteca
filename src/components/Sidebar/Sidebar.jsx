import React, { useEffect, useRef, useState } from "react";
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
  FiX,
  FiLogOut,
} from "react-icons/fi";
import { useAuth } from "../../contexts/AuthContext";
import { useSidebar } from "../../contexts/SidebarContext";
import "./Sidebar.css";

const userMenuItems = [
  { key: "dashboard", label: "Dashboard", icon: FiHome },
  { key: "biblioteca", label: "Biblioteca", icon: FiBookmark },
  { key: "emprestimos", label: "Meus empréstimos", icon: FiRepeat },
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
  const { user, logout } = useAuth();
  const { isOpen, isCollapsed, close } = useSidebar();
  const { pathname } = useLocation();
  // Cada grupo mantém seu próprio estado: abrir outro não fecha os anteriores.
  const [openGroups, setOpenGroups] = useState(() => new Set());
  const [libraryName, setLibraryName] = useState(() => localStorage.getItem("nomeBiblioteca") || "Sala de Leitura");
  const closeButtonRef = useRef(null);
  const adminSidebarRef = useRef(null);
  const openPessoas = openGroups.has("pessoas");
  const openRelatorios = openGroups.has("relatorios");
  const openEmprestimos = openGroups.has("emprestimos");
  const openLivros = openGroups.has("livros");
  const toggleGroup = (group) => setOpenGroups((current) => {
    const next = new Set(current);
    if (next.has(group)) next.delete(group);
    else next.add(group);
    return next;
  });

  const isAdmin = type === "admin" || (!type && user?.tipo === "admin");

  useEffect(() => {
    const updateName = () => setLibraryName(localStorage.getItem("nomeBiblioteca") || "Sala de Leitura");
    window.addEventListener("nomeBibliotecaAtualizado", updateName);
    window.addEventListener("storage", updateName);
    return () => {
      window.removeEventListener("nomeBibliotecaAtualizado", updateName);
      window.removeEventListener("storage", updateName);
    };
  }, []);

  useEffect(() => {
    let routeGroup = null;
    if (pathname.startsWith("/admin/emprestimos")) routeGroup = "emprestimos";
    else if (pathname.startsWith("/admin/livros")) routeGroup = "livros";
    else if (/^\/admin\/(alunos|comunidade|admins)/.test(pathname)) routeGroup = "pessoas";
    else if (pathname.startsWith("/admin/relatorios")) routeGroup = "relatorios";
    if (routeGroup) {
      setOpenGroups((current) => {
        if (current.has(routeGroup)) return current;
        const next = new Set(current);
        next.add(routeGroup);
        return next;
      });
    }
  }, [pathname]);

  useEffect(() => {
    if (!isOpen) return undefined;
    if ((type === "admin" || type === "user") && window.innerWidth <= 768) closeButtonRef.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        close();
        document.querySelector(".header .hamburger-btn")?.focus();
      }
      if (event.key !== "Tab" || (type !== "admin" && type !== "user") || window.innerWidth > 768) return;
      const focusable = [...(adminSidebarRef.current?.querySelectorAll('a[href], button:not([disabled])') || [])]
        .filter((element) => element.getClientRects().length > 0);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, close]);

  if (type === "user") {
    return (
      <>
        <div className={`sidebar-overlay ${isOpen ? "open" : ""}`} onClick={close} />
        <aside
          ref={adminSidebarRef}
          className={`sidebar ${isOpen ? "open" : ""}${isCollapsed ? " collapsed" : ""}`}
          aria-label="Navegação do usuário"
        >
          <div className="admin-sidebar-mobile-top">
            <span className="admin-sidebar-mobile-brand">
              <img src="/logo-novedejulho-semfundo.png" alt="" />{libraryName}
            </span>
            <button ref={closeButtonRef} type="button" onClick={() => {
              close();
              document.querySelector(".admin-header .hamburger-btn")?.focus();
            }} aria-label="Fechar menu">
              Fechar <FiX />
            </button>
          </div>
          <div className="sidebar-section">
            <p className="sidebar-title">Principal</p>
            <ul>
              {userMenuItems.filter(item => item.key !== "configuracoes").map(({ key, label, icon: Icon }) => (
                <li key={key}>
                  <NavLink
                    to={key === "dashboard" ? "/user" : `/user/${key}`}
                    end
                    title={label}
                    onClick={close}
                  >
                    <Icon aria-hidden="true" />
                    <span>{label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
          <div className="sidebar-section">
            <p className="sidebar-title sidebar-system">Sistema</p>
            <ul>
              <li>
                <NavLink to="/user/configuracoes" title="Configurações" onClick={close}>
                  <FiSettings aria-hidden="true" />
                  <span>Configurações</span>
                </NavLink>
              </li>
            </ul>
          </div>
          <button className="admin-sidebar-mobile-logout" type="button" onClick={logout}>
            <FiLogOut /> Sair
          </button>
        </aside>
      </>
    );
  }

  // O professor mantém o fluxo de navegação próprio, sem rotas administrativas.
  if (type === "professor") {
    return (
      <>
        <div className={`sidebar-overlay ${isOpen ? "open" : ""}`} onClick={close} />
        <aside className={`sidebar ${isOpen ? "open" : ""}`} aria-label="Navegação do professor">
          <div className="sidebar-section">
            <p className="sidebar-title">Principal</p>
            <ul>
              {professorMenuItems.map(({ key, label, icon: Icon }) => (
                <li key={key}>
                  <button
                    type="button"
                    className={`sidebar-action ${activePage === key ? "active" : ""}`}
                    aria-current={activePage === key ? "page" : undefined}
                    onClick={() => { setActivePage?.(key); close(); }}
                  >
                    <Icon aria-hidden="true" /><span>{label}</span>
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
      <aside ref={adminSidebarRef} className={`sidebar ${isOpen ? "open" : ""}${isCollapsed ? " collapsed" : ""}`} aria-label="Navegação administrativa">
        <div className="admin-sidebar-mobile-top">
          <span className="admin-sidebar-mobile-brand"><img src="/logo-novedejulho-semfundo.png" alt="" />{libraryName}</span>
          <button ref={closeButtonRef} type="button" onClick={() => {
            close();
            document.querySelector(".admin-header .hamburger-btn")?.focus();
          }} aria-label="Fechar menu">Fechar <FiX /></button>
        </div>
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
                onClick={() => toggleGroup("emprestimos")}
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
                  onClick={() => toggleGroup("livros")}
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
                  onClick={() => toggleGroup("pessoas")}
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
              <li className="submenu-container">
                <button
                  type="button"
                  className={`submenu-toggle ${openRelatorios ? "open" : ""}`}
                  aria-expanded={openRelatorios}
                  aria-controls="submenu-relatorios"
                  onClick={() => toggleGroup("relatorios")}
                >
                  <div className="submenu-left">
                    <FiPieChart />
                    <span>Relatórios</span>
                  </div>
                  <FiChevronDown className="arrow" />
                </button>
                <ul id="submenu-relatorios" inert={!openRelatorios} className={`submenu ${openRelatorios ? "open" : ""}`}>
                  <li><NavLink to="/admin/relatorios/emprestimos" onClick={close}>Relatório de Empréstimos</NavLink></li>
                  <li><NavLink to="/admin/relatorios/atrasos" onClick={close}>Usuários em Atraso</NavLink></li>
                  <li><NavLink to="/admin/relatorios/acervo" onClick={close}>Acervo por Grupo</NavLink></li>
                  <li><NavLink to="/admin/relatorios/consultas" onClick={close}>Consultas e Controle</NavLink></li>
                </ul>
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
        <button className="admin-sidebar-mobile-logout" type="button" onClick={logout}><FiLogOut /> Sair</button>
      </aside>
    </>
  );
}

export default Sidebar;
