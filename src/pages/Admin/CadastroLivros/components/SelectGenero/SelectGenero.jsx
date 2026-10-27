import React, { useEffect, useState } from "react";
import * as Select from "@radix-ui/react-select";
import { ChevronDownIcon, CheckIcon } from "@radix-ui/react-icons";
import { getGeneros } from "../../../../../services/api";
import "../SelectStatus/SelectStatus.css";

function SelectGenero({ value = "todos", onChange, acervoStyle = false }) {
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
    <Select.Root value={value} onValueChange={(v) => onChange && onChange(v)}>

      <Select.Trigger aria-label="Gênero" className={`SelectTrigger${acervoStyle ? " acervo-select-trigger" : ""}`}>
        <Select.Value placeholder="Todos os gêneros" />
        <Select.Icon>
          <ChevronDownIcon />
        </Select.Icon>
      </Select.Trigger>

      <Select.Portal>
        <Select.Content position={acervoStyle ? "popper" : "item-aligned"} sideOffset={acervoStyle ? 7 : 0} collisionPadding={12} className={`SelectContent${acervoStyle ? " acervo-select-menu" : ""}`}>

          <Select.Viewport className={acervoStyle ? "acervo-select-viewport" : undefined}>

            <Select.Item value="todos" className={`SelectItem${acervoStyle ? " acervo-select-item" : ""}`}>
              <Select.ItemText>Todos os gêneros</Select.ItemText>
              <Select.ItemIndicator>
                <CheckIcon />
              </Select.ItemIndicator>
            </Select.Item>

            {generos.map((genero) => (
              <Select.Item
                key={genero.idGenero}
                value={String(genero.idGenero)}
                className={`SelectItem${acervoStyle ? " acervo-select-item" : ""}`}
              >
                <Select.ItemText>{genero.genNome}</Select.ItemText>
                <Select.ItemIndicator>
                  <CheckIcon />
                </Select.ItemIndicator>
              </Select.Item>
            ))}

          </Select.Viewport>

        </Select.Content>
      </Select.Portal>

    </Select.Root>
  );
}

export default SelectGenero;
