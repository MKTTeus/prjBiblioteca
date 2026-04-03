import React, { useEffect, useState } from "react";
import * as Select from "@radix-ui/react-select";
import { ChevronDownIcon, CheckIcon } from "@radix-ui/react-icons";
import { getCategorias } from "../../../../../services/api";
import "./SelectCategoria.css";

function SelectCategoria({ value = "todas", onChange }) {
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const cats = await getCategorias();
        if (!mounted) return;
        setCategorias(Array.isArray(cats) ? cats : []);
      } catch (err) {
        console.error("Erro ao carregar categorias:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <Select.Root value={value} onValueChange={(v) => { onChange && onChange(v); }}>

      <Select.Trigger className="SelectTrigger">
        <Select.Value placeholder="Todas as categorias" />
        <Select.Icon>
          <ChevronDownIcon />
        </Select.Icon>
      </Select.Trigger>

      <Select.Portal>
        <Select.Content className="SelectContent">

          <Select.Viewport>

            {/* opção padrão */}
            <Select.Item value="todas" className="SelectItem">
              <Select.ItemText>Todas as categorias</Select.ItemText>
              <Select.ItemIndicator>
                <CheckIcon />
              </Select.ItemIndicator>
            </Select.Item>

            {/* enquanto carrega */}
            {loading && (
              <Select.Item value="loading" className="SelectItem" aria-disabled>
                <Select.ItemText>Carregando...</Select.ItemText>
              </Select.Item>
            )}

            {/* categorias vindas da API */}
            {!loading && categorias.map((cat) => (
              <Select.Item
                key={cat.idCategoria ?? cat.id ?? cat.catNome}
                value={String(cat.idCategoria ?? cat.id ?? cat.catNome)}
                className="SelectItem"
              >
                <Select.ItemText>{cat.catNome ?? cat.nome ?? String(cat)}</Select.ItemText>
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

export default SelectCategoria;
