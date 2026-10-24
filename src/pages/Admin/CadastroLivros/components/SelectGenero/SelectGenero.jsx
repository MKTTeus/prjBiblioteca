import React, { useEffect, useState } from "react";
import { getGeneros } from "../../../../../services/api";

function SelectGenero({ value = "todos", onChange }) {
  const [generos, setGeneros] = useState([]);

  useEffect(() => {
    let ativo = true;
    getGeneros()
      .then((data) => {
        if (ativo) setGeneros(Array.isArray(data) ? data : []);
      })
      .catch((err) => console.error("Erro ao carregar gêneros:", err));
    return () => {
      ativo = false;
    };
  }, []);

  return (
    <select className="filtro-select" aria-label="Gênero" value={value} onChange={(event) => onChange?.(event.target.value)}>
      <option value="todos">Todos os gêneros</option>
      {generos.map((genero) => <option key={genero.idGenero} value={String(genero.idGenero)}>{genero.genNome}</option>)}
    </select>
  );
}

export default SelectGenero;
