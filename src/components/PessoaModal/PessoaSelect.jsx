import React from "react";
import * as Select from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";

/** Dropdown comum aos cadastros de pessoas; mantém o contrato onChange(event). */
export default function PessoaSelect({ name, value, onChange, options, placeholder, invalid, disabled = false }) {
  return (
    <Select.Root value={value || ""} disabled={disabled}
      onValueChange={(selected) => onChange({ target: { name, value: selected } })}>
      <Select.Trigger className="person-select-trigger" name={name} aria-invalid={Boolean(invalid)}
        aria-label={name === "serie" ? "Série" : name === "perfil" ? "Perfil" : "Status"}>
        <Select.Value placeholder={placeholder || "Selecione"} />
        <Select.Icon><ChevronDown size={17} aria-hidden="true" /></Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content className="person-select-content" position="popper" sideOffset={5}
          collisionPadding={10} avoidCollisions>
          <Select.ScrollUpButton className="person-select-scroll"><ChevronUp size={15} /></Select.ScrollUpButton>
          <Select.Viewport className="person-select-viewport">
            {options.map((option) => {
              const item = typeof option === "string" ? { value: option, label: option } : option;
              return (
                <Select.Item key={item.value} value={item.value} className="person-select-item">
                  <Select.ItemText>{item.label}</Select.ItemText>
                  <Select.ItemIndicator className="person-select-check"><Check size={16} /></Select.ItemIndicator>
                </Select.Item>
              );
            })}
          </Select.Viewport>
          <Select.ScrollDownButton className="person-select-scroll"><ChevronDown size={15} /></Select.ScrollDownButton>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
