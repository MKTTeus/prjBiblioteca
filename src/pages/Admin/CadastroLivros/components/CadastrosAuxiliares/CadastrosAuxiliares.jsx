import React from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import NoticeBanner from "../../../../../components/NoticeBanner/NoticeBanner";
import "./CadastrosAuxiliares.css";

const abas = [
  { id: "generos", label: "Gêneros" },
  { id: "autores", label: "Autores" },
];

export default function CadastrosAuxiliares() {
  const location = useLocation();

  return (
    <div className="tab-aux page-shell">
      <NoticeBanner
        id="categoria-removida-2026-08"
        message="A aba Categorias foi removida. Agora apenas Gênero é utilizado para organizar o acervo — os dados antigos de categoria não foram apagados, só deixaram de ser exibidos."
        expiresAt="2026-10-01"
      />

      <div className="cadastro-header">
        <div>
          <h1>Cadastros Auxiliares</h1>
          <p>
            Gerencie os autores e gêneros usados no cadastro de livros — corrija
            nomes duplicados ou remova itens que não são mais usados.
          </p>
        </div>
      </div>

      <div className="tabs tab-aux-tabs">
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
