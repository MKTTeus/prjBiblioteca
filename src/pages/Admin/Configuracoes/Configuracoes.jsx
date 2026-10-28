import "../../../components/AdminPageLayout/AdminPageLayout.css";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SlidersHorizontal, Bell, ShieldCheck, Mail, GraduationCap, DatabaseBackup, Settings2, ChevronDown, Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ExportModal from "./components/ExportModal/ExportModal";
import "./Configuracoes.css";
import "./ConfiguracoesRedesign.css";

const abas = [
  { id: "geral",        label: "Geral", icon: SlidersHorizontal },
  { id: "notificacoes", label: "Notificações", icon: Bell },
  { id: "seguranca",    label: "Segurança", icon: ShieldCheck },
  { id: "email",        label: "E-mail", icon: Mail },
  { id: "ano-letivo",   label: "Ano Letivo", icon: GraduationCap },
  { id: "backups",      label: "Backups", icon: DatabaseBackup },
  { id: "avancado",     label: "Avançado", icon: Settings2 },
];

function ConfiguracoesInner() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeId = abas.find(aba => location.pathname.endsWith("/" + aba.id))?.id || "geral";
  const [showExport, setShowExport] = useState(false);

  return (
    <div className="config-container page-shell admin-standard-page">
      <div className="top-bar admin-standard-header">
        <div>
          <h1>Configurações do Sistema</h1>
          <p>Gerencie as configurações da biblioteca</p>
        </div>

        <div className="top-actions">
          <button
            className="btn-outline config-export-btn"
            onClick={() => setShowExport(true)}
          >
            <Download size={16} aria-hidden="true" /> Exportar
          </button>
        </div>
      </div>

      <nav className="tabs" aria-label="Seções de configurações">
        {abas.map((aba) => (
          <NavLink key={aba.id} to={aba.id}
            className={({ isActive }) => `tab-btn ${isActive ? "active" : ""}`}>
            <aba.icon size={15} aria-hidden="true" />
            <span>{aba.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="config-mobile-picker">
        <label htmlFor="config-secao-mobile">Seção de configurações</label>
        <div className="config-mobile-select-wrap">
          <select id="config-secao-mobile" value={activeId}
            onChange={(event) => navigate("/admin/configuracoes/" + event.target.value)}>
            {abas.map((aba) => <option key={aba.id} value={aba.id}>{aba.label}</option>)}
          </select>
          <ChevronDown size={17} aria-hidden="true"/>
        </div>
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
