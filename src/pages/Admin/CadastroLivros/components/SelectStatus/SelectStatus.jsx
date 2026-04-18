import React from "react";
import * as Select from "@radix-ui/react-select";
import { ChevronDownIcon, CheckIcon } from "@radix-ui/react-icons";
import "./SelectStatus.css";

function SelectStatus({ value = "todas", onChange }) {
  return (
    <Select.Root value={value} onValueChange={(v) => onChange && onChange(v)}>

      <Select.Trigger className="SelectTrigger">
        <Select.Value placeholder="Todos os status" />
        <Select.Icon>
          <ChevronDownIcon />
        </Select.Icon>
      </Select.Trigger>

      <Select.Portal>
        <Select.Content className="SelectContent">

          <Select.Viewport>

            <Select.Item value="todas" className="SelectItem">
              <Select.ItemText>Todos os status</Select.ItemText>
              <Select.ItemIndicator>
                <CheckIcon />
              </Select.ItemIndicator>
            </Select.Item>

            <Select.Item value="ativo" className="SelectItem">
              <Select.ItemText>Ativo</Select.ItemText>
            </Select.Item>

            <Select.Item value="inativo" className="SelectItem">
              <Select.ItemText>Inativo</Select.ItemText>
            </Select.Item>

          </Select.Viewport>

        </Select.Content>
      </Select.Portal>

    </Select.Root>
  );
}

export default SelectStatus;
