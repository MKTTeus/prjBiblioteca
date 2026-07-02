import React, { useState } from "react";
import { FiCheck, FiX } from "react-icons/fi";
import "./SelectOuCriar.css";

/**
 * SelectOuCriar
 *
 * Exibe um <select> com a lista de itens existentes.
 * Quando o usuário escolhe "— Criar novo —", um campo de texto
 * aparece inline para digitar o nome do novo item.
 * Ao confirmar, chama onCriar(nome) que deve retornar { id, nome }
 * e selecionar o novo item automaticamente.
 *
 * Props:
 *   items       — [{ id, nome }] lista de opções
 *   value       — id selecionado atualmente
 *   onChange    — (id: number) => void
 *   onCriar     — async (nome: string) => { id, nome }
 *   placeholder — texto do option vazio
 *   label       — label do campo (usado no placeholder de criação)
 */
export default function SelectOuCriar({
  items = [],
  value,
  onChange,
  onCriar,
  placeholder = "— selecione —",
  label = "item",
}) {
  const [criando, setCriando] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [salvando, setSalvando] = useState(false);

  function handleSelectChange(e) {
    const val = e.target.value;
    if (val === "__criar__") {
      setCriando(true);
      setNovoNome("");
    } else {
      onChange(val ? Number(val) : null);
    }
  }

  async function handleConfirmar() {
    const nome = novoNome.trim();
    if (!nome) return;
    setSalvando(true);
    try {
      const criado = await onCriar(nome);
      onChange(criado.id);
      setCriando(false);
      setNovoNome("");
    } catch (err) {
      console.error("Erro ao criar:", err);
    } finally {
      setSalvando(false);
    }
  }

  function handleCancelar() {
    setCriando(false);
    setNovoNome("");
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") { e.preventDefault(); handleConfirmar(); }
    if (e.key === "Escape") handleCancelar();
  }

  if (criando) {
    return (
      <div className="soc-criar-row">
        <input
          className="soc-input"
          autoFocus
          value={novoNome}
          onChange={(e) => setNovoNome(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Nome do novo ${label}...`}
          disabled={salvando}
        />
        <button
          type="button"
          className="soc-btn soc-btn-confirm"
          onClick={handleConfirmar}
          disabled={salvando || !novoNome.trim()}
          title="Confirmar"
        >
          <FiCheck size={14} />
        </button>
        <button
          type="button"
          className="soc-btn soc-btn-cancel"
          onClick={handleCancelar}
          disabled={salvando}
          title="Cancelar"
        >
          <FiX size={14} />
        </button>
      </div>
    );
  }

  return (
    <select value={value ?? ""} onChange={handleSelectChange}>
      <option value="">{placeholder}</option>
      {items.map((item) => (
        <option key={item.id} value={item.id}>
          {item.nome}
        </option>
      ))}
      <option value="__criar__">＋ Criar novo {label}…</option>
    </select>
  );
}