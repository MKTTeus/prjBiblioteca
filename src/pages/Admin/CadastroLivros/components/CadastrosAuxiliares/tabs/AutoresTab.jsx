import React, { useCallback, useEffect, useState } from "react";
import { IoMdAdd } from "react-icons/io";
import { Pencil, Trash2 } from "lucide-react";
import { useToast } from "../../../../../../contexts/ToastContext";
import ConfirmModal from "../../../../../../components/ConfirmModal/ConfirmModal";
import MergeModal from "../MergeModal";
import AutorModal from "./AutorModal";
import {
  getAutores,
  createAutor,
  updateAutor,
  deleteAutor,
  getAutorUso,
  mesclarAutor,
} from "../../../../../../services/api";
import { getErrorMessage } from "../../../../../../utils/apiError";

export default function AutoresTab() {
  const { addToast } = useToast();
  const [autores, setAutores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [autorEditando, setAutorEditando] = useState(null);
  const [salvando, setSalvando] = useState(false);

  const [pendingDelete, setPendingDelete] = useState(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const [pendingMerge, setPendingMerge] = useState(null);
  const [confirmingMerge, setConfirmingMerge] = useState(false);

  const [verificandoId, setVerificandoId] = useState(null);

  const carregar = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAutores();
      setAutores(data || []);
    } catch (err) {
      console.error(err);
      addToast("Falha ao carregar autores", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const autoresFiltrados = autores.filter((a) =>
    (a.autNome || "").toLowerCase().includes(busca.toLowerCase().trim())
  );

  function abrirCriacao() {
    setAutorEditando(null);
    setModalOpen(true);
  }

  function abrirEdicao(autor) {
    setAutorEditando(autor);
    setModalOpen(true);
  }

  async function handleSalvarAutor(payload) {
    setSalvando(true);
    try {
      if (autorEditando) {
        await updateAutor(autorEditando.idAutor, payload);
        addToast("Autor atualizado com sucesso", "success");
      } else {
        await createAutor(payload);
        addToast("Autor criado com sucesso", "success");
      }
      setModalOpen(false);
      setAutorEditando(null);
      carregar();
    } catch (err) {
      console.error(err);
      addToast(getErrorMessage(err, autorEditando ? "Falha ao atualizar autor" : "Falha ao criar autor"), "error");
    } finally {
      setSalvando(false);
    }
  }

  async function handleExcluirClick(autor) {
    setVerificandoId(autor.idAutor);
    try {
      const uso = await getAutorUso(autor.idAutor);
      const total = uso?.total_livros || 0;
      if (total > 0) {
        setPendingMerge({ item: autor, totalLivros: total });
      } else {
        setPendingDelete(autor);
      }
    } catch (err) {
      console.error(err);
      addToast(getErrorMessage(err, "Falha ao verificar uso do autor"), "error");
    } finally {
      setVerificandoId(null);
    }
  }

  async function confirmarExclusao() {
    if (!pendingDelete) return;
    setConfirmingDelete(true);
    try {
      await deleteAutor(pendingDelete.idAutor);
      addToast("Autor excluído com sucesso", "success");
      carregar();
    } catch (err) {
      console.error(err);
      addToast(getErrorMessage(err, "Falha ao excluir autor"), "error");
    } finally {
      setConfirmingDelete(false);
      setPendingDelete(null);
    }
  }

  async function confirmarMesclagem(idDestino) {
    if (!pendingMerge) return;
    setConfirmingMerge(true);
    try {
      await mesclarAutor(pendingMerge.item.idAutor, idDestino);
      addToast("Livros transferidos e autor excluído com sucesso", "success");
      carregar();
    } catch (err) {
      console.error(err);
      addToast(getErrorMessage(err, "Falha ao mesclar autores"), "error");
    } finally {
      setConfirmingMerge(false);
      setPendingMerge(null);
    }
  }

  const opcoesMerge = pendingMerge
    ? autores
        .filter((a) => a.idAutor !== pendingMerge.item.idAutor)
        .map((a) => ({ id: a.idAutor, nome: a.autNome }))
    : [];

  return (
    <div className="taxonomia-tab">
      <div className="taxonomia-tab-header">
        <div>
          <h2>Autores</h2>
          <p>
            {autores.length} {autores.length === 1 ? "autor cadastrado" : "autores cadastrados"}
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input
            type="search"
            className="input-pesquisa"
            style={{ minWidth: 220 }}
            placeholder="Buscar autor..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          <button className="btn-add" onClick={abrirCriacao}>
            <IoMdAdd /> Novo Autor
          </button>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Nascimento</th>
              <th>Falecimento</th>
              <th className="taxonomia-col-livros">Livros vinculados</th>
              <th className="acoes-coluna">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="taxonomia-empty">
                  Carregando...
                </td>
              </tr>
            ) : autoresFiltrados.length === 0 ? (
              <tr>
                <td colSpan={5} className="taxonomia-empty">
                  Nenhum autor encontrado.
                </td>
              </tr>
            ) : (
              autoresFiltrados.map((autor) => (
                <tr key={autor.idAutor}>
                  <td>{autor.autNome}</td>
                  <td>{autor.autAnoNascimento || "—"}</td>
                  <td>{autor.autAnoFalecimento || "—"}</td>
                  <td className="taxonomia-col-livros">
                    <span className={`taxonomia-badge-livros ${!autor.total_livros ? "zero" : ""}`}>
                      {autor.total_livros || 0}
                    </span>
                  </td>
                  <td className="taxonomia-acoes-cell">
                    <div className="acoes">
                      <button className="btn-edit" onClick={() => abrirEdicao(autor)} title="Editar">
                        <Pencil size={16} />
                      </button>
                      <button
                        className="btn-delete"
                        onClick={() => handleExcluirClick(autor)}
                        title="Excluir"
                        disabled={verificandoId === autor.idAutor}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AutorModal
        show={modalOpen}
        autorToEdit={autorEditando}
        onClose={() => {
          setModalOpen(false);
          setAutorEditando(null);
        }}
        onSave={handleSalvarAutor}
        saving={salvando}
      />

      <ConfirmModal
        show={Boolean(pendingDelete)}
        title="Excluir autor"
        message={`Tem certeza que deseja excluir "${pendingDelete?.autNome}"? Ele não está vinculado a nenhum livro.`}
        onConfirm={confirmarExclusao}
        onCancel={() => setPendingDelete(null)}
        confirmText="Excluir"
        cancelText="Cancelar"
        confirming={confirmingDelete}
        irreversivel
      />

      <MergeModal
        show={Boolean(pendingMerge)}
        itemNome={pendingMerge?.item?.autNome}
        totalLivros={pendingMerge?.totalLivros}
        opcoes={opcoesMerge}
        onCancel={() => setPendingMerge(null)}
        onConfirm={confirmarMesclagem}
        confirming={confirmingMerge}
      />
    </div>
  );
}
