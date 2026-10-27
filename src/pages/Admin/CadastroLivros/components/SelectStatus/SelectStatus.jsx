import React from "react";
import * as Select from "@radix-ui/react-select";
import { ChevronDownIcon, CheckIcon } from "@radix-ui/react-icons";
import "./SelectStatus.css";

function SelectStatus({ value = "todas", onChange, acervoStyle = false }) {
  return (
    <Select.Root value={value} onValueChange={(v) => onChange && onChange(v)}>

      <Select.Trigger aria-label="Status" className={`SelectTrigger${acervoStyle ? " acervo-select-trigger" : ""}`}>
        <Select.Value placeholder="Todos os status" />
        <Select.Icon>
          <ChevronDownIcon />
        </Select.Icon>
      </Select.Trigger>

      <Select.Portal>
        <Select.Content position={acervoStyle ? "popper" : "item-aligned"} sideOffset={acervoStyle ? 7 : 0} collisionPadding={12} className={`SelectContent${acervoStyle ? " acervo-select-menu" : ""}`}>

          <Select.Viewport className={acervoStyle ? "acervo-select-viewport" : undefined}>

            <Select.Item value="todas" className={`SelectItem${acervoStyle ? " acervo-select-item" : ""}`}>
              <Select.ItemText>Todos os status</Select.ItemText>
              <Select.ItemIndicator>
                <CheckIcon />
              </Select.ItemIndicator>
            </Select.Item>

            <Select.Item value="ativo" className={`SelectItem${acervoStyle ? " acervo-select-item" : ""}`}>
              <Select.ItemText>Ativo</Select.ItemText>
            </Select.Item>

            <Select.Item value="inativo" className={`SelectItem${acervoStyle ? " acervo-select-item" : ""}`}>
              <Select.ItemText>Inativo</Select.ItemText>
            </Select.Item>

          </Select.Viewport>

        </Select.Content>
      </Select.Portal>

    </Select.Root>
  );
}

export default SelectStatus;
