import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useState } from "react";
import { useToast } from "../../../contexts/ToastContext";
import { motion, AnimatePresence } from "framer-motion";
import { ConfigSaveProvider, useConfigSave } from "./contexts/ConfigSaveContext";
import "./Configuracoes.css";

const abas = [
  { id: "geral",        label: "Geral" },
  { id: "notificacoes", label: "Notificações" },
  { id: "seguranca",    label: "Segurança" },
  { id: "email",        label: "E-mail" },
  { id: "backups",      label: "Backups" },
  { id: "avancado",     label: "Avançado" },
];

/** Inner component so it can consume ConfigSaveContext */
function ConfiguracoesInner() {
  const location = useLocation();
  const { addToast } = useToast();
  const { saveAll } = useConfigSave();
  const [savingAll, setSavingAll] = useState(false);

  const handleSaveAll = async () => {
    setSavingAll(true);
    try {
      const results = await saveAll();

      const failures = results.filter((r) => !r.success);
      const successes = results.filter((r) => r.success);

      if (failures.length === 0) {
        addToast(
          `Todas as ${successes.length} abas salvas com sucesso.`,
          "success"
        );
      } else if (successes.length === 0) {
        addToast(
          "Erro ao salvar todas as configurações. Verifique cada aba.",
          "error"
        );
      } else {
        // Partial failure — report which tabs failed
        const failedLabels = failures
          .map((f) => abas.find((a) => a.id === f.abaId)?.label ?? f.abaId)
          .join(", ");
        addToast(
          `${successes.length} aba(s) salvas. Falha em: ${failedLabels}.`,
          "error"
        );
      }
    } catch (err) {
      addToast("Erro inesperado ao salvar configurações.", "error");
      console.error("handleSaveAll error:", err);
    } finally {
      setSavingAll(false);
    }
  };

  return (
    <div className="config-container page-shell">
      <div className="top-bar">
        <div>
          <h1>Configurações do Sistema</h1>
          <p>Gerencie as configurações da biblioteca</p>
        </div>

        <div className="top-actions">
          <button className="btn-outline config-export-btn">Exportar</button>
          <button
            className="btn-success"
            disabled={savingAll}
            onClick={handleSaveAll}
          >
            {savingAll ? "Salvando…" : "Salvar Tudo"}
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
    </div>
  );
}

export default function Configuracoes() {
  return (
    <ConfigSaveProvider>
      <ConfiguracoesInner />
    </ConfigSaveProvider>
  );
}