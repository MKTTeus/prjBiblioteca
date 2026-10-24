import React from "react";

function SelectStatus({ value = "todas", onChange }) {
  return (
    <select className="filtro-select" aria-label="Status" value={value} onChange={(event) => onChange?.(event.target.value)}>
      <option value="todas">Todos os status</option>
      <option value="ativo">Ativo</option>
      <option value="inativo">Inativo</option>
    </select>
  );
}

export default SelectStatus;
