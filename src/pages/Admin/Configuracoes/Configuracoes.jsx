import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ExportModal from "./components/ExportModal/ExportModal";
import "./Configuracoes.css";

const abas = [
  { id: "geral",        label: "Geral" },
  { id: "notificacoes", label: "Notificações" },
  { id: "seguranca",    label: "Segurança" },
  { id: "email",        label: "E-mail" },
  { id: "ano-letivo",   label: "Ano Letivo" },
  { id: "backups",      label: "Backups" },
  { id: "avancado",     label: "Avançado" },
];

function ConfiguracoesInner() {
  const location = useLocation();
  const [showExport, setShowExport] = useState(false);

  return (
    <div className="config-container page-shell">
      <div className="top-bar">
        <div>
          <h1>Configurações do Sistema</h1>
          <p>Gerencie as configurações da biblioteca</p>
        </div>

        <div className="top-actions">
          <button
            className="btn-outline config-export-btn"
            onClick={() => setShowExport(true)}
          >
            Exportar
          </button>
        </div>
      </div>

      <div className="tabs">
        {abas.map((aba) => (
          <NavLink
            key={aba.id}
            to={aba.id}
            className={({ isActive }) => `tab-btn ${isActive ? "active" : ""}`}
          >
            {aba.label}
          </NavLink>
        ))}
      </div>

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

      {showExport && <ExportModal onClose={() => setShowExport(false)} />}
    </div>
  );
}

export default function Configuracoes() {
  return <ConfiguracoesInner />;
}
