import React, { useEffect, useMemo, useRef, useState } from "react";
import "./SearchableSelect.css";

function normalizeText(value = "") {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * SearchableSelect
 *
 * Combobox: funciona como um <select> comum (ao focar, mostra a lista
 * completa de opções), mas também permite digitar para filtrar os itens
 * pelo nome — sem perder a listagem clicável já existente.
 *
 * Props:
 *   options     — [{ value, label, pendente? }]
 *   value       — valor selecionado atualmente (bate com option.value)
 *   onChange    — (value) => void
 *   placeholder — texto exibido quando nada está selecionado
 *   name        — atributo name do input (acessibilidade/formulário)
 */
export default function SearchableSelect({
  options = [],
  value,
  onChange,
  placeholder = "Selecione...",
  name,
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const selectedOption = useMemo(
    () => options.find((opt) => String(opt.value) === String(value)) || null,
    [options, value]
  );

  const [query, setQuery] = useState(() => (selectedOption ? selectedOption.label : ""));

  // Mantém o texto do input sincronizado com o item selecionado quando o
  // combobox está fechado (ex.: seleção alterada por fora, como o
  // preenchimento automático via ISBN ou IA).
  useEffect(() => {
    if (!open) {
      setQuery(selectedOption ? selectedOption.label : "");
    }
  }, [selectedOption, open]);

  useEffect(() => {
    function handleClickFora(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickFora);
    return () => document.removeEventListener("mousedown", handleClickFora);
  }, []);

  const filtradas = useMemo(() => {
    const busca = normalizeText(query);
    if (!busca || (selectedOption && normalizeText(selectedOption.label) === busca)) {
      return options;
    }
    return options.filter((opt) => normalizeText(opt.label).includes(busca));
  }, [options, query, selectedOption]);

  function handleFocus(e) {
    setOpen(true);
    e.target.select();
  }

  function handleSelecionar(opt) {
    onChange(opt.value);
    setQuery(opt.label);
    setOpen(false);
  }

  function handleInputChange(e) {
    setQuery(e.target.value);
    setOpen(true);
  }

  function handleKeyDown(e) {
    if (e.key === "Escape") {
      setOpen(false);
      setQuery(selectedOption ? selectedOption.label : "");
    }
  }

  return (
    <div className="searchable-select" ref={containerRef}>
      <input
        type="text"
        name={name}
        className="searchable-select-input"
        value={query}
        onFocus={handleFocus}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
      />
      {open && (
        <ul className="searchable-select-list">
          {filtradas.length === 0 ? (
            <li className="searchable-select-empty">Nenhum item encontrado</li>
          ) : (
            filtradas.map((opt) => (
              <li
                key={opt.value}
                className={
                  "searchable-select-option" +
                  (String(opt.value) === String(value) ? " selected" : "")
                }
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelecionar(opt);
                }}
              >
                {opt.label}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}