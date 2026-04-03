import React, { useEffect, useState } from "react";
import { FiFilter, FiSearch, FiTag, FiX } from "react-icons/fi";
import "./FiltroBusca.css";
import SelectCategoria from "../SelectCategoria/SelectCategoria";
import SelectStatus from "../SelectStatus/SelectStatus";

function FiltroBusca({ onFilter }) {
  const [filters, setFilters] = useState({
    q: "",
    categoria: "todas",
    status: "todas",
  });

  useEffect(() => {
    onFilter && onFilter(filters);
  }, [filters, onFilter]);

  function updateField(field, value) {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function clearAll() {
    setFilters({
      q: "",
      categoria: "todas",
      status: "todas",
    });
  }

  return (
    <div className="filtro-container">
      <div className="filtro-header">
        <div className="filtro-titulo">
          <FiFilter className="icone-filtro" />
          <div>
            <span>Filtros de Busca</span>
            <small>Os resultados são atualizados automaticamente enquanto você filtra.</small>
          </div>
        </div>

        <button type="button" className="limpar-btn" onClick={clearAll}>
          <FiX />
          Limpar filtros
        </button>
      </div>

      <div className="filtros">
        <div className="campo">
          <label>Buscar</label>

          <div className="input-icon">
            <FiSearch className="campo-icone" />
            <input
              value={filters.q}
              onChange={(e) => updateField("q", e.target.value)}
              type="text"
              placeholder="Buscar por título, autor, ISBN ou tombo..."
            />
          </div>
        </div>

        <div className="campo">
          <label>Categoria</label>

          <div className="select-icon">
            <FiTag className="campo-icone" />
            <SelectCategoria value={filters.categoria} onChange={(v) => updateField("categoria", v)} />
          </div>
        </div>

        <div className="campo">
          <label>Status</label>

          <div className="select-icon">
            <FiTag className="campo-icone" />
            <SelectStatus value={filters.status} onChange={(v) => updateField("status", v)} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default FiltroBusca;
