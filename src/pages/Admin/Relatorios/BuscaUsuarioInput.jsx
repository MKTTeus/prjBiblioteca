import { useEffect, useRef, useState } from "react";
import { FiSearch, FiX, FiLoader } from "react-icons/fi";

import { buscarUsuariosRelatorio } from "../../../services/api";

/**
 * Campo de busca com autocomplete para selecionar um único usuário (aluno
 * ou comunidade) — usado para filtrar o relatório de empréstimos pelo
 * histórico de uma pessoa específica. Ao selecionar, mostra um "chip" com
 * o nome escolhido no lugar do input, com botão para limpar a seleção.
 */
export default function BuscaUsuarioInput({ usuarioSelecionado, onSelecionar, onLimpar }) {
  const [termo, setTermo] = useState("");
  const [sugestoes, setSugestoes] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    function handleClickFora(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickFora);
    return () => document.removeEventListener("mousedown", handleClickFora);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (termo.trim().length < 2) {
      setSugestoes([]);
      setBuscando(false);
      return;
    }

    setBuscando(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const resultado = await buscarUsuariosRelatorio(termo.trim());
        setSugestoes(resultado.itens || []);
      } catch (error) {
        console.error(error);
        setSugestoes([]);
      } finally {
        setBuscando(false);
      }
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [termo]);

  function handleSelecionar(usuario) {
    onSelecionar(usuario);
    setTermo("");
    setSugestoes([]);
    setOpen(false);
  }

  if (usuarioSelecionado) {
    return (
      <div className="rel-aluno-chip">
        <span className="rel-aluno-chip-nome">{usuarioSelecionado.usuNome}</span>
        <span className="rel-aluno-chip-meta">
          {usuarioSelecionado.usuTipo === "Aluno"
            ? `${usuarioSelecionado.usuSerie || "-"} · ${usuarioSelecionado.usuTurma || "-"}`
            : "Comunidade"}
        </span>
        <button type="button" className="rel-aluno-chip-remover" onClick={onLimpar} title="Remover filtro de aluno">
          <FiX />
        </button>
      </div>
    );
  }

  return (
    <div className="rel-busca-aluno" ref={containerRef}>
      <FiSearch className="rel-busca-aluno-icone" />
      <input
        type="text"
        value={termo}
        onChange={(e) => setTermo(e.target.value)}
        onFocus={() => setOpen(true)}
        placeholder="Buscar aluno ou comunidade..."
        autoComplete="off"
      />
      {buscando && <FiLoader className="rel-busca-aluno-spinner rel-spinner" />}

      {open && termo.trim().length >= 2 && (
        <ul className="rel-busca-aluno-lista" onMouseDown={(e) => e.preventDefault()}>
          {buscando ? (
            <li className="rel-busca-aluno-vazio">Buscando...</li>
          ) : sugestoes.length === 0 ? (
            <li className="rel-busca-aluno-vazio">Nenhum usuário encontrado.</li>
          ) : (
            sugestoes.map((usuario) => (
              <li key={usuario.idUsuario} onClick={() => handleSelecionar(usuario)}>
                <span className="rel-busca-aluno-nome">{usuario.usuNome}</span>
                <span className="rel-busca-aluno-meta">
                  {usuario.usuTipo === "Aluno" ? `${usuario.usuSerie || "-"} · ${usuario.usuTurma || "-"}` : "Comunidade"}
                </span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}