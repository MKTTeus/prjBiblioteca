import React from "react";
import { FiFilter, FiSearch, FiX, FiChevronDown } from "react-icons/fi";
import "./FiltroBusca.css";
import SelectGenero from "../SelectGenero/SelectGenero";
import SelectStatus from "../SelectStatus/SelectStatus";

function FiltroBusca({ filters, onFilter, quickFilter = "todos", onQuickFilter = () => {} }) {
  function updateField(field, value) {
    onFilter({
      ...filters,
      [field]: value,
    });
  }

  function clearAll() {
    onFilter({
      q: "",
      genero: "todos",
      status: "todas",
      exemplares: "todos",
    });
    onQuickFilter("todos");
  }

  return (
    <div className="filtro-container">
      <div className="campo campo-busca">
        <label htmlFor="acervo-busca">Buscar</label>
        <div className="input-icon">
          <FiSearch className="campo-icone" />
          <input id="acervo-busca" value={filters.q} onChange={(e) => updateField("q", e.target.value)} type="search" placeholder="Título, autor, ISBN ou tombo" />
        </div>
      </div>

      <div className="acervo-quick-filters-wrap">
      <div className="acervo-quick-filters" role="group" aria-label="Filtros rápidos do acervo, deslize para ver mais">
        {[
          ["todos", "Todos"],
          ["disponiveis", "Disponíveis"],
          ["emprestados", "Emprestados"],
          ["sem", "Sem exemplares"],
        ].map(([value, label]) => (
          <button key={value} type="button" className={quickFilter === value ? "is-active" : ""} aria-pressed={quickFilter === value} onClick={() => onQuickFilter(value)}>{label}</button>
        ))}
      </div>
      <span className="acervo-quick-hint" aria-hidden="true">Deslize →</span>
      </div>

      <details className="acervo-advanced-filters">
        <summary><FiFilter aria-hidden="true" /> Filtros avançados <FiChevronDown className="advanced-chevron" aria-hidden="true" /></summary>
        <div className="filtros">
          <div className="campo">
            <label>Gênero</label>
            <SelectGenero value={filters.genero} onChange={(v) => updateField("genero", v)} />
          </div>
          <div className="campo">
            <label>Status</label>
            <SelectStatus value={filters.status} onChange={(v) => updateField("status", v)} />
          </div>
          <div className="campo">
            <label htmlFor="filtro-exemplares">Exemplares</label>
            <select id="filtro-exemplares" className="filtro-exemplares" value={filters.exemplares} onChange={(e) => updateField("exemplares", e.target.value)}>
              <option value="todos">Todos os títulos</option>
              <option value="pendentes">Pendências no acervo</option>
              <option value="sem">Sem exemplares</option>
              <option value="desativados">Todos desativados</option>
              <option value="com">Com exemplares não desativados</option>
            </select>
          </div>
        </div>
        <button type="button" className="limpar-btn" onClick={clearAll}><FiX /> Limpar filtros</button>
      </details>
    </div>
  );
}

export default FiltroBusca;
