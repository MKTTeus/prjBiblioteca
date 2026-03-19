import React from "react";
import { FiFilter } from "react-icons/fi";
import "./FiltroBusca.css";
import SelectCategoria from "../SelectCategoria/SelectCategoria";
import SelectStatus from "../SelectStatus/SelectStatus";

import { useState } from "react";

function FiltroBusca({ onFilter }) {
  const [q, setQ] = useState("");
  const [categoria, setCategoria] = useState("todas");
  const [status, setStatus] = useState("todas");

  function apply() {
    onFilter && onFilter({ q, categoria, status });
  }

  function clearAll() {
    setQ("");
    setCategoria("todas");
    setStatus("todas");
    onFilter && onFilter({ q: "", categoria: "todas", status: "todas" });
  }

  return (
    <div className="filtro-container">

      <div className="filtro-titulo">
        <FiFilter className="icone-filtro"/>
        <span>Filtros de Busca</span>
      </div>

      <div className="filtros">

        <div className="campo">
          <label>Buscar</label>
          
          <div className="input-icon">
            <input value={q} onChange={(e)=>setQ(e.target.value)} type="text" placeholder="Título, autor ou tombo..."/>
          </div>
        </div>

        <div className="campo">
          <label>Categoria</label>
          <SelectCategoria value={categoria} onChange={(v)=>setCategoria(v)} />
        </div>

        <div className="campo">
          <label>Status</label>
          <SelectStatus value={status} onChange={(v)=>setStatus(v)} />
        </div>

        <div className="campo botao">
          <button onClick={apply}>Aplicar</button>
          <button onClick={clearAll}>Limpar Filtros</button>
        </div>

      </div>

    </div>
  );
}

export default FiltroBusca;