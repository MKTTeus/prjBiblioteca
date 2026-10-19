import React from "react";
import { CiSearch } from "react-icons/ci";

export default function SearchBar({ value, onChange, placeholder, label = "Buscar livros" }) {
  return (
    <div className="search-wrapper">
      <CiSearch className="search-icon" />
      <input
        type="text"
        className="input-pesquisa"
        placeholder={placeholder}
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
