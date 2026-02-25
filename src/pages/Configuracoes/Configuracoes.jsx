import { NavLink, Outlet, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import "./Configuracoes.css";

export default function Configuracoes() {
  const location = useLocation();

  const abas = [
    { id: "geral", label: "Geral" },
    { id: "notificacoes", label: "Notificações" },
    { id: "seguranca", label: "Segurança" },
    { id: "sistema", label: "Sistema" },
    { id: "email", label: "E-mail" },
    { id: "avancado", label: "Avançado" },
  ];

  return (
    <div className="config-container">
      {/* TOPO */}
      <div className="top-bar">
        <div>
          <h1>Configurações do Sistema</h1>
          <p>Gerencie as configurações da biblioteca</p>
        </div>

        <div className="top-actions">
          <button  className="btn-outline">Exportar</button>
          <button className="btn-success">Salvar Tudo</button>
        </div>
      </div>

      {/* ABAS */}
      <div className="tabs">
        {abas.map((aba) => (
          <NavLink
            key={aba.id}
            to={aba.id}
            className={({ isActive }) =>
              `tab-btn ${isActive ? "active" : ""}`
            }
          >
            {aba.label}
          </NavLink>
        ))}
      </div>

      {/* CONTEÚDO COM ANIMAÇÃO SUAVE */}
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.25 }}
        >
          <Outlet />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}