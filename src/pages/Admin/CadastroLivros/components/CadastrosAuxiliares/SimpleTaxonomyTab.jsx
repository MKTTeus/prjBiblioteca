import React, { useCallback, useEffect, useState } from "react";
import { IoMdAdd } from "react-icons/io";
import { Pencil, Trash2, Check, X } from "lucide-react";
import { useToast } from "../../../../../contexts/ToastContext";
import ConfirmModal from "../../../../../components/ConfirmModal/ConfirmModal";
import MergeModal from "./MergeModal";
import { getErrorMessage } from "../../../../../utils/apiError";

/**
 * SimpleTaxonomyTab
 *
 * Tela genérica de gestão para taxonomias simples (nome único), usada tanto
 * por Categorias quanto por Gêneros. Cobre: criar, renomear (edição inline),
 * excluir (bloqueado quando há livros vinculados) e mesclar/reatribuir
 * (transferir os livros de um item para outro antes de excluir).
 *
 * Props:
 *   titulo, singular, artigo ("a"/"o"), placeholderNovo
 *   nomeField — nome do campo de texto (ex.: "catNome")
 *   idField   — nome do campo de id (ex.: "idCategoria")
 *   api       — { listar, criar, atualizar, excluir, getUso, mesclar }
 */
export default function SimpleTaxonomyTab({
  titulo,
  singular,
  artigo = "a",
  placeholderNovo,
  nomeField,
  idField,
  api,
}) {
  const { addToast } = useToast();
  const [itens, setItens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");

  const [criando, setCriando] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [salvandoNovo, setSalvandoNovo] = useState(false);

  const [editandoId, setEditandoId] = useState(null);
  const [nomeEditado, setNomeEditado] = useState("");
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

  const [pendingDelete, setPendingDelete] = useState(null); // item sem vínculos, pronto para excluir
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const [pendingMerge, setPendingMerge] = useState(null); // item com vínculos: { item, totalLivros }
  const [confirmingMerge, setConfirmingMerge] = useState(false);

  const [verificandoId, setVerificandoId] = useState(null);

  const carregar = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.listar();
      setItens(data || []);
    } catch (err) {
      console.error(err);
      addToast(`Falha ao carregar ${singular}s`, "error");
    } finally {
      setLoading(false);
    }
  }, [addToast, api, singular]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const itensFiltrados = itens.filter((item) =>
    (item[nomeField] || "").toLowerCase().includes(busca.toLowerCase().trim())
  );

  function abrirCriacao() {
    setCriando(true);
    setNovoNome("");
  }

  function cancelarCriacao() {
    setCriando(false);
    setNovoNome("");
  }

  async function confirmarCriacao() {
    const nome = novoNome.trim();
    if (!nome) return;
    setSalvandoNovo(true);
    try {
      await api.criar({ [nomeField]: nome });
      addToast(`${capitalize(singular)} criad${artigo === "a" ? "a" : "o"} com sucesso`, "success");
      setCriando(false);
      setNovoNome("");
      carregar();
    } catch (err) {
      console.error(err);
      addToast(getErrorMessage(err, `Falha ao criar ${singular}`), "error");
    } finally {
      setSalvandoNovo(false);
    }
  }

  function iniciarEdicao(item) {
    setEditandoId(item[idField]);
    setNomeEditado(item[nomeField] || "");
  }

  function cancelarEdicao() {
    setEditandoId(null);
    setNomeEditado("");
  }

  async function confirmarEdicao(item) {
    const nome = nomeEditado.trim();
    if (!nome || nome === item[nomeField]) {
      cancelarEdicao();
      return;
    }
    setSalvandoEdicao(true);
    try {
      await api.atualizar(item[idField], { [nomeField]: nome });
      addToast(`${capitalize(singular)} atualizad${artigo === "a" ? "a" : "o"} com sucesso`, "success");
      cancelarEdicao();
      carregar();
    } catch (err) {
      console.error(err);
      addToast(getErrorMessage(err, `Falha ao atualizar ${singular}`), "error");
    } finally {
      setSalvandoEdicao(false);
    }
  }

  async function handleExcluirClick(item) {
    setVerificandoId(item[idField]);
    try {
      const uso = await api.getUso(item[idField]);
      const total = uso?.total_livros || 0;
      if (total > 0) {
        setPendingMerge({ item, totalLivros: total });
      } else {
        setPendingDelete(item);
      }
    } catch (err) {
      console.error(err);
      addToast(getErrorMessage(err, `Falha ao verificar uso d${artigo} ${singular}`), "error");
    } finally {
      setVerificandoId(null);
    }
  }

  async function confirmarExclusao() {
    if (!pendingDelete) return;
    setConfirmingDelete(true);
    try {
      await api.excluir(pendingDelete[idField]);
      addToast(`${capitalize(singular)} excluíd${artigo === "a" ? "a" : "o"} com sucesso`, "success");
      carregar();
    } catch (err) {
      console.error(err);
      addToast(getErrorMessage(err, `Falha ao excluir ${singular}`), "error");
    } finally {
      setConfirmingDelete(false);
      setPendingDelete(null);
    }
  }

  async function confirmarMesclagem(idDestino) {
    if (!pendingMerge) return;
    setConfirmingMerge(true);
    try {
      await api.mesclar(pendingMerge.item[idField], idDestino);
      addToast("Livros transferidos e item excluído com sucesso", "success");
      carregar();
    } catch (err) {
      console.error(err);
      addToast(getErrorMessage(err, "Falha ao mesclar"), "error");
    } finally {
      setConfirmingMerge(false);
      setPendingMerge(null);
    }
  }

  const opcoesMerge = pendingMerge
    ? itens
        .filter((i) => i[idField] !== pendingMerge.item[idField])
        .map((i) => ({ id: i[idField], nome: i[nomeField] }))
    : [];

  return (
    <div className="taxonomia-tab">
      <div className="taxonomia-tab-header">
        <div>
          <h2>{titulo}</h2>
          <p>
            {itens.length} {itens.length === 1 ? singular : `${singular}s`} cadastrad
            {itens.length === 1 ? artigo : `${artigo}s`}
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input
            type="search"
            className="input-pesquisa"
            style={{ minWidth: 220 }}
            placeholder={`Buscar ${singular}...`}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          <button className="btn-add" onClick={abrirCriacao}>
            <IoMdAdd /> Nov{artigo === "a" ? "a" : "o"} {capitalize(singular)}
          </button>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th className="taxonomia-col-livros">Livros vinculados</th>
              <th className="acoes-coluna">Ações</th>
            </tr>
          </thead>
          <tbody>
            {criando && (
              <tr>
                <td colSpan={3}>
                  <div className="taxonomia-inline-edit">
                    <input
                      autoFocus
                      value={novoNome}
                      onChange={(e) => setNovoNome(e.target.value)}
                      placeholder={placeholderNovo}
                      disabled={salvandoNovo}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") confirmarCriacao();
                        if (e.key === "Escape") cancelarCriacao();
                      }}
                    />
                    <button
                      className="btn-status"
                      onClick={confirmarCriacao}
                      disabled={salvandoNovo || !novoNome.trim()}
                      title="Confirmar"
                    >
                      <Check size={16} className="icon-green" />
                    </button>
                    <button
                      className="btn-status"
                      onClick={cancelarCriacao}
                      disabled={salvandoNovo}
                      title="Cancelar"
                    >
                      <X size={16} className="icon-red" />
                    </button>
                  </div>
                </td>
              </tr>
            )}

            {loading ? (
              <tr>
                <td colSpan={3} className="taxonomia-empty">
                  Carregando...
                </td>
              </tr>
            ) : itensFiltrados.length === 0 ? (
              <tr>
                <td colSpan={3} className="taxonomia-empty">
                  Nenhum{artigo === "a" ? "a" : ""} {singular} encontrad{artigo === "a" ? "a" : "o"}.
                </td>
              </tr>
            ) : (
              itensFiltrados.map((item) => {
                const isEditing = editandoId === item[idField];
                return (
                  <tr key={item[idField]}>
                    <td>
                      {isEditing ? (
                        <div className="taxonomia-inline-edit">
                          <input
                            autoFocus
                            value={nomeEditado}
                            onChange={(e) => setNomeEditado(e.target.value)}
                            disabled={salvandoEdicao}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") confirmarEdicao(item);
                              if (e.key === "Escape") cancelarEdicao();
                            }}
                          />
                          <button
                            className="btn-status"
                            onClick={() => confirmarEdicao(item)}
                            disabled={salvandoEdicao || !nomeEditado.trim()}
                            title="Salvar"
                          >
                            <Check size={16} className="icon-green" />
                          </button>
                          <button
                            className="btn-status"
                            onClick={cancelarEdicao}
                            disabled={salvandoEdicao}
                            title="Cancelar"
                          >
                            <X size={16} className="icon-red" />
                          </button>
                        </div>
                      ) : (
                        item[nomeField]
                      )}
                    </td>
                    <td className="taxonomia-col-livros">
                      <span
                        className={`taxonomia-badge-livros ${
                          !item.total_livros ? "zero" : ""
                        }`}
                      >
                        {item.total_livros || 0}
                      </span>
                    </td>
                    <td className="taxonomia-acoes-cell">
                      <div className="acoes">
                        <button
                          className="btn-edit"
                          onClick={() => iniciarEdicao(item)}
                          title="Renomear"
                          disabled={isEditing}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          className="btn-delete"
                          onClick={() => handleExcluirClick(item)}
                          title="Excluir"
                          disabled={verificandoId === item[idField]}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        show={Boolean(pendingDelete)}
        title={`Excluir ${singular}`}
        message={`Tem certeza que deseja excluir "${pendingDelete?.[nomeField]}"? ${
          artigo === "a" ? "Ela" : "Ele"
        } não está vinculad${artigo} a nenhum livro.`}
        onConfirm={confirmarExclusao}
        onCancel={() => setPendingDelete(null)}
        confirmText="Excluir"
        cancelText="Cancelar"
        confirming={confirmingDelete}
        irreversivel
      />

      <MergeModal
        show={Boolean(pendingMerge)}
        itemNome={pendingMerge?.item?.[nomeField]}
        totalLivros={pendingMerge?.totalLivros}
        opcoes={opcoesMerge}
        onCancel={() => setPendingMerge(null)}
        onConfirm={confirmarMesclagem}
        confirming={confirmingMerge}
      />
    </div>
  );
}

function capitalize(s) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}
