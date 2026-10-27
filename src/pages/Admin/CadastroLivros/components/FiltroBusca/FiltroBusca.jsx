import React, { useEffect, useRef, useState } from "react";
import { FiFilter, FiSearch, FiTag, FiX, FiChevronDown, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import "./FiltroBusca.css";
import SelectGenero from "../SelectGenero/SelectGenero";
import SelectStatus from "../SelectStatus/SelectStatus";

function FiltroBusca({ filters, onFilter, quickFilter = "todos", onQuickFilter = () => {} }) {
  const hasFilters = Boolean(filters.q || filters.genero !== "todos" || filters.status !== "todas" || filters.exemplares !== "todos" || quickFilter !== "todos");
  const quickFiltersRef = useRef(null);
  const [scrollEdges, setScrollEdges] = useState({ left: false, right: false });

  useEffect(() => {
    const node = quickFiltersRef.current;
    const update = () => setScrollEdges({
      left: node.scrollLeft > 1,
      right: node.scrollLeft + node.clientWidth < node.scrollWidth - 1,
    });
    update();
    node.addEventListener("scroll", update, { passive: true });
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    observer?.observe(node);
    window.addEventListener("resize", update);
    return () => { node.removeEventListener("scroll", update); observer?.disconnect(); window.removeEventListener("resize", update); };
  }, []);

  function scrollFilters(direction) {
    const node = quickFiltersRef.current;
    node.scrollBy({ left: direction * node.clientWidth * 0.75, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }

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
    <div className="filtro-container acervo-filtro-panel">
      <div className="filtro-header">
        <div className="filtro-titulo">
          <FiFilter className="icone-filtro" />
          <div>
            <span>Filtros de Busca</span>
            <small>Os resultados são atualizados automaticamente enquanto você filtra.</small>
          </div>
        </div>

        <button type="button" className="limpar-btn" onClick={clearAll} disabled={!hasFilters}>
          <FiX />
          Limpar filtros
        </button>
      </div>

      <div className="filtros acervo-filtros-grid">
        <div className={`campo ${filters.q ? "is-active" : ""}`}>
          <label htmlFor="acervo-busca">Buscar</label>

          <div className="input-icon">
            <FiSearch className="campo-icone" />
            <input
              id="acervo-busca"
              value={filters.q}
              onChange={(e) => updateField("q", e.target.value)}
              type="search"
              placeholder="Buscar por título, autor, ISBN ou tombo..."
            />
          </div>
        </div>

        <div className={`campo ${filters.genero !== "todos" ? "is-active" : ""}`}>
          <label>Gênero</label>

          <div className="select-icon">
            <FiTag className="campo-icone" />
            <SelectGenero acervoStyle value={filters.genero} onChange={(v) => updateField("genero", v)} />
          </div>
        </div>

        <div className={`campo ${filters.status !== "todas" ? "is-active" : ""}`}>
          <label>Status</label>

          <div className="select-icon">
            <FiTag className="campo-icone" />
            <SelectStatus acervoStyle value={filters.status} onChange={(v) => updateField("status", v)} />
          </div>
        </div>
        <div className={`campo ${filters.exemplares !== "todos" ? "is-active" : ""}`}>
          <label htmlFor="filtro-exemplares">Exemplares</label>
          <div className="acervo-native-select-wrap"><select id="filtro-exemplares" className="filtro-exemplares" value={filters.exemplares} onChange={(e) => updateField("exemplares", e.target.value)}>
            <option value="todos">Todos os títulos</option>
            <option value="pendentes">Pendências no acervo</option>
            <option value="sem">Sem exemplares</option>
            <option value="desativados">Todos desativados</option>
            <option value="com">Com exemplares não desativados</option>
          </select><FiChevronDown className="acervo-native-chevron" aria-hidden="true" /></div>
        </div>
      </div>

      <div className="acervo-quick-filters-wrap">
      {scrollEdges.left && <button type="button" className="acervo-quick-arrow" aria-label="Ver filtros anteriores" onClick={() => scrollFilters(-1)}><FiChevronLeft /></button>}
      <div ref={quickFiltersRef} className="acervo-quick-filters" role="group" aria-label="Filtros rápidos do acervo, deslize para ver mais">
        {[
          ["todos", "Todos"],
          ["disponiveis", "Disponíveis"],
          ["emprestados", "Emprestados"],
          ["sem", "Sem exemplares"],
        ].map(([value, label]) => (
          <button key={value} type="button" className={quickFilter === value ? "is-active" : ""} aria-pressed={quickFilter === value} onClick={() => onQuickFilter(value)}>{label}</button>
        ))}
      </div>
      {scrollEdges.right && <button type="button" className="acervo-quick-arrow" aria-label="Ver mais filtros" onClick={() => scrollFilters(1)}><FiChevronRight /></button>}
      </div>

    </div>
  );
}

export default FiltroBusca;
