import React, { useState } from "react";
import { 
  LayoutDashboard, 
  Library, 
  BookPlus, 
  Users, 
  RefreshCcw, 
  Settings, 
  LogOut 
} from "lucide-react";
import "./Sidebar.css";

const Sidebar = () => {
  const [active, setActive] = useState("Cadastro de livros");

  const menuItems = [
    { label: "Dashboard", icon: <LayoutDashboard size={18} /> },
    { label: "Biblioteca", icon: <Library size={18} /> },
    { label: "Cadastro de livros", icon: <BookPlus size={18} /> },
    { label: "Cadastro de alunos", icon: <Users size={18} /> },
    { label: "Empréstimos e devoluções", icon: <RefreshCcw size={18} /> },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-section">
        <p className="sidebar-title">Menu Principal</p>
        <ul>
          {menuItems.map((item) => (
            <li
              key={item.label}
              className={active === item.label ? "active" : ""}
              onClick={() => setActive(item.label)}
            >
              {item.icon}
              <span>{item.label}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="sidebar-section bottom">
        <p className="sidebar-title">Sistema</p>
        <ul>
          <li>
            <Settings size={18} />
            <span>Configurações</span>
          </li>
          <li className="logout">
            <LogOut size={18} />
            <span>Sair</span>
          </li>
        </ul>
      </div>
    </aside>
  );
};

export default Sidebar;
