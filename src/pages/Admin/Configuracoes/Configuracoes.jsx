import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useToast } from "../../../contexts/ToastContext";
import { motion, AnimatePresence } from "framer-motion";
import "./Configuracoes.css";

export default function Configuracoes() {
  const location = useLocation();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [savingAll, setSavingAll] = useState(false);

  const abas = [
    { id: "geral", label: "Geral" },
    { id: "notificacoes", label: "Notificações" },
    { id: "seguranca", label: "Segurança" },
    { id: "sistema", label: "Sistema" },
    { id: "email", label: "E-mail" },
    { id: "avancado", label: "Avançado" },
    { id: "backups", label: "Backups" },
  ];

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
            onClick={async () => {
              // Sequentially navigate to each tab and trigger its salvar button (works with current per-tab save handlers)
              setSavingAll(true);
              addToast("Iniciando salvamento de todas as abas...", "info");
              const originalPath = location.pathname;
              for (const aba of abas) {
                try {
                  navigate(aba.id, { replace: false });
                  // wait for route + component mount
                  await new Promise((r) => setTimeout(r, 700));
                  // attempt to find save button in mounted tab and click it
                  const saveBtn = document.querySelector('.page-shell .card .btn-secondary');
                  if (saveBtn) {
                    saveBtn.click();
                    // wait briefly for save to complete
                    await new Promise((r) => setTimeout(r, 1100));
                  }
                } catch (e) {
                  console.error('Erro ao salvar aba', aba.id, e);
                }
              }
              // return to original
              navigate(originalPath, { replace: false });
              setSavingAll(false);
              addToast('Salvar Tudo concluído (verifique mensagens por aba).', 'success');
            }}
          >
            {savingAll ? 'Salvando...' : 'Salvar Tudo'}
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