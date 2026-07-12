import React from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import "./CadastrosAuxiliares.css";

const abas = [
  { id: "categorias", label: "Categorias" },
  { id: "generos", label: "Gêneros" },
  { id: "autores", label: "Autores" },
];

export default function CadastrosAuxiliares() {
  const location = useLocation();

  return (
    <div className="tab-aux page-shell">
      <div className="cadastro-header">
        <div>
          <h1>Cadastros Auxiliares</h1>
          <p>
            Gerencie os autores, gêneros e categorias usados no cadastro de livros — corrija
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
