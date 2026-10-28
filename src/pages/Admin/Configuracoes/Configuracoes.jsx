import "../../../components/AdminPageLayout/AdminPageLayout.css";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { SlidersHorizontal, Bell, ShieldCheck, Mail, GraduationCap, DatabaseBackup, Settings2, ChevronDown, Download, Check } from "lucide-react";
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
  const activeId = abas.find(aba => location.pathname.endsWith("/" + aba.id))?.id || "geral";
  const abaAtiva = abas.find(aba => aba.id === activeId) || abas[0];
  const [showExport, setShowExport] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef(null);
  const mobileTriggerRef = useRef(null);

  // A troca de rota fecha o seletor sem interferir no estado das configurações.
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return undefined;
    const handleOutside = (event) => {
      if (!mobileMenuRef.current?.contains(event.target)) setMobileMenuOpen(false);
    };
    const handleKey = (event) => {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
        mobileTriggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", handleOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("pointerdown", handleOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, [mobileMenuOpen]);

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
      <div className="config-mobile-picker" ref={mobileMenuRef}>
        <span className="config-mobile-picker__caption">Seção de configurações</span>
        <button type="button" ref={mobileTriggerRef}
          className={`config-mobile-trigger ${mobileMenuOpen ? "is-open" : ""}`}
          aria-expanded={mobileMenuOpen}
          aria-controls="config-mobile-options"
          onClick={() => setMobileMenuOpen((open) => !open)}>
          <span className="config-mobile-trigger__icon"><abaAtiva.icon size={19} aria-hidden="true" /></span>
          <span className="config-mobile-trigger__text">
            <span className="config-mobile-trigger__eyebrow">Visualizando</span>
            <strong>{abaAtiva.label}</strong>
          </span>
          <span className="config-mobile-trigger__chevron"><ChevronDown size={18} aria-hidden="true" /></span>
        </button>
        {mobileMenuOpen && (
          <nav className="config-mobile-options" id="config-mobile-options" aria-label="Escolher seção de configurações">
            {abas.map((aba) => (
              <NavLink key={aba.id} to={aba.id} onClick={() => setMobileMenuOpen(false)}
                className={`config-mobile-option ${activeId === aba.id ? "is-active" : ""}`}>
                <span className="config-mobile-option__icon"><aba.icon size={18} aria-hidden="true" /></span>
                <span>{aba.label}</span>
                {activeId === aba.id && <Check className="config-mobile-option__check" size={17} aria-hidden="true" />}
              </NavLink>
            ))}
          </nav>
        )}
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
