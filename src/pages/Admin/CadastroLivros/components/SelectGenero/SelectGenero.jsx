import React, { useEffect, useState } from "react";
import * as Select from "@radix-ui/react-select";
import { ChevronDownIcon, CheckIcon } from "@radix-ui/react-icons";
import { getGeneros } from "../../../../../services/api";
import "../SelectStatus/SelectStatus.css";

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
    <Select.Root value={value} onValueChange={(v) => onChange && onChange(v)}>

      <Select.Trigger className="SelectTrigger">
        <Select.Value placeholder="Todos os gêneros" />
        <Select.Icon>
          <ChevronDownIcon />
        </Select.Icon>
      </Select.Trigger>

      <Select.Portal>
        <Select.Content className="SelectContent">

          <Select.Viewport>

            <Select.Item value="todos" className="SelectItem">
              <Select.ItemText>Todos os gêneros</Select.ItemText>
              <Select.ItemIndicator>
                <CheckIcon />
              </Select.ItemIndicator>
            </Select.Item>

            {generos.map((genero) => (
              <Select.Item
                key={genero.idGenero}
                value={String(genero.idGenero)}
                className="SelectItem"
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
