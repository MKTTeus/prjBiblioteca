import React, { useEffect, useState } from "react";
import "./Comunidade.css";
import "../CadastroLivros/components/BookForm/BookFormModal.css";
import { Users, UserCheck, UserX, BookOpen, Pencil, Trash2, Upload } from "lucide-react";
import {
  getComunidade,
  createComunidade,
  updateComunidade,
  deleteComunidade,
  excluirComunidadeLote,
  atualizarStatusComunidadeLote,
} from "../../../services/api";
import { useToast } from "../../../contexts/ToastContext";
import ConfirmModal from "../../../components/ConfirmModal/ConfirmModal";
import SearchBar from "./components/SearchBar";
import ComunidadeModal from "./components/ComunidadeModal";
import StatsCard from "../../../components/StatsCard/StatsCard";
import ImportarModal from "../../../components/ImportarModal/ImportarModal";
import { importarComunidade } from "../../../services/api";
import { formatarCPF, formatarTelefone, validarCPF } from "../../../utils/masks";

const EMPTY_MEMBRO = {
  nome: "",
  cpf: "",
  email: "",
  telefone: "",
  telefone2: "",
  endereco: "",
  senha: "",
  status: "Ativo",
};

export default function Comunidade() {
  const [modalAberto, setModalAberto] = useState(false);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [indexEditando, setIndexEditando] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [pesquisa, setPesquisa] = useState("");
  const [novoMembro, setNovoMembro] = useState(EMPTY_MEMBRO);
  const [membros, setMembros] = useState([]);
  const [pendingDeleteMembro, setPendingDeleteMembro] = useState(null);
  const [modalImportar, setModalImportar] = useState(false);
  const [selecionados, setSelecionados] = useState([]);
  const [pendingBatchExcluir, setPendingBatchExcluir] = useState(false);
  const [pendingBatchStatus, setPendingBatchStatus] = useState(null);
  const { addToast } = useToast();

const fetchMembros = async () => {
  try {
    const data = await getComunidade();
    setMembros(
      (data || []).map((u) => ({
        idUsuario: u.idUsuario,
        nome: u.usuNome,
        cpf: u.usuCPF || "",
        email: u.usuEmail || "",
        telefone: u.usuTelefone || "",
        telefone2: u.usuTelefoneResponsavel || "",
        endereco: u.usuEndereco || "",
        livros: 0,
        status: u.usuStatus === true ? "Ativo" : "Inativo",
      }))
    );
  } catch (err) {
    console.error("Erro ao carregar comunidade:", err);
  }
};

useEffect(() => {
  fetchMembros();
}, []);

  const handleChange = (e) => {
    setNovoMembro((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    setIsDirty(true);
  };

  const fecharModal = () => {
    setModalAberto(false);
    setModoEdicao(false);
    setIndexEditando(null);
    setNovoMembro(EMPTY_MEMBRO);
    setIsDirty(false);
  };

  const handleSalvar = async () => {
    if (isProcessing) return;
    if (modoEdicao && !isDirty) return;
    if (!novoMembro.nome || !novoMembro.email || !novoMembro.telefone || !novoMembro.endereco) return;

    if (!validarCPF(novoMembro.cpf)) {
      addToast("O CPF informado é inválido", "error");
      return;
    }

    setIsProcessing(true);

    try {
      if (modoEdicao && indexEditando != null) {
        const alvo = membros[indexEditando];
        const payload = {
          nome: novoMembro.nome,
          email: novoMembro.email,
          telefone: novoMembro.telefone,
          telefoneResponsavel: novoMembro.telefone2,
          endereco: novoMembro.endereco,
          cpf: novoMembro.cpf,
          status: novoMembro.status === "Ativo",
        };

        const updated = await updateComunidade(alvo.idUsuario, payload);
        setMembros((prev) =>
          prev.map((membro, i) =>
            i === indexEditando
              ? {
                  ...membro,
                  nome: updated.usuNome,
                  cpf: updated.usuCPF || "",
                  email: updated.usuEmail || "",
                  telefone: updated.usuTelefone || "",
                  telefone2: updated.usuTelefoneResponsavel || "",
                  endereco: updated.usuEndereco || "",
                  status: updated.usuStatus === true ? "Ativo" : "Inativo",
                }
              : membro
          )
        );
        addToast("Informações atualizadas com sucesso", "success");
      } else {
        if (!novoMembro.senha || novoMembro.senha.length < 6) return;

        const created = await createComunidade({
          nome: novoMembro.nome,
          email: novoMembro.email,
          senha: novoMembro.senha,
          telefone: novoMembro.telefone,
          telefoneResponsavel: novoMembro.telefone2,
          endereco: novoMembro.endereco,
          cpf: novoMembro.cpf,
          tipo: "Comunidade",
          status: novoMembro.status === "Ativo",
        });

        setMembros((prev) => [
          ...prev,
          {
            idUsuario: created.idUsuario,
            nome: created.usuNome,
            cpf: created.usuCPF || "",
            email: created.usuEmail || "",
            telefone: created.usuTelefone || "",
            telefone2: created.usuTelefoneResponsavel || "",
            endereco: created.usuEndereco || "",
            livros: 0,
            status: novoMembro.status || "Ativo",
          },
        ]);
        addToast("Cadastro realizado com sucesso", "success");
      }

      fecharModal();
    } catch (err) {
      console.error("Erro ao salvar membro:", err);
      addToast(modoEdicao ? "Falha ao atualizar as informações" : "Falha ao realizar o cadastro", "error");
    } finally {
      setTimeout(() => setIsProcessing(false), 600);
      setIsDirty(false);
    }
  };

  const abrirCriacao = () => {
    setNovoMembro(EMPTY_MEMBRO);
    setModoEdicao(false);
    setIndexEditando(null);
    setModalAberto(true);
    setIsDirty(false);
  };

  const abrirEdicao = (idUsuario) => {
    const index = membros.findIndex((membro) => membro.idUsuario === idUsuario);
    if (index === -1) return;

    const membro = membros[index];
    setNovoMembro({
      nome: membro.nome || "",
      cpf: membro.cpf || "",
      email: membro.email || "",
      telefone: membro.telefone || "",
      telefone2: membro.telefone2 || "",
      endereco: membro.endereco || "",
      senha: "",
      status: membro.status || "Ativo",
    });
    setIndexEditando(index);
    setModoEdicao(true);
    setModalAberto(true);
    setIsDirty(false);
  };

  const handleExcluir = (idUsuario) => {
    const target = membros.find((membro) => membro.idUsuario === idUsuario);
    setPendingDeleteMembro(target || { idUsuario, nome: "este usuário" });
  };

  const confirmExcluirMembro = async () => {
    if (!pendingDeleteMembro) return;

    try {
      await deleteComunidade(pendingDeleteMembro.idUsuario);
      setMembros((prev) => prev.filter((membro) => membro.idUsuario !== pendingDeleteMembro.idUsuario));
      addToast("Usuário excluído com sucesso", "success");
    } catch (err) {
      console.error("Erro ao excluir membro:", err);
      addToast("Falha ao excluir o usuário", "error");
    } finally {
      setPendingDeleteMembro(null);
    }
  };

  const handleToggleStatus = async (idUsuario) => {
    const index = membros.findIndex((membro) => membro.idUsuario === idUsuario);
    if (index === -1) return;

    const alvo = membros[index];
    const novoStatus = alvo.status === "Ativo" ? "Inativo" : "Ativo";

    try {
      const updated = await updateComunidade(alvo.idUsuario, {
        ...alvo,
        status: novoStatus === "Ativo",
      });

      setMembros((prev) =>
        prev.map((membro, i) =>
          i === index
            ? {
                ...membro,
                status: updated.usuStatus === true ? "Ativo" : "Inativo",
              }
            : membro
        )
      );
    } catch (err) {
      console.error("Erro ao alterar status do membro:", err);
    }
  };

  const toggleSelecionado = (id) =>
    setSelecionados((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);

  const toggleSelecionarTodos = () => {
    if (selecionados.length === membrosFiltrados.length) setSelecionados([]);
    else setSelecionados(membrosFiltrados.map((m) => m.idUsuario));
  };

  const handleBatchStatus = (novoStatus) => {
    const jaEstao = membrosFiltrados
      .filter((m) => selecionados.includes(m.idUsuario))
      .every((m) => m.status === novoStatus);
    if (jaEstao) {
      addToast(`Todos os selecionados já estão ${novoStatus === "Ativo" ? "ativos" : "inativos"}`, "info");
      return;
    }
    setPendingBatchStatus(novoStatus);
  };

  const confirmBatchExcluir = async () => {
    try {
      await excluirComunidadeLote(selecionados);
      setMembros((prev) => prev.filter((m) => !selecionados.includes(m.idUsuario)));
      addToast(`${selecionados.length} membro(s) excluído(s) com sucesso`, "success");
      setSelecionados([]);
    } catch (err) {
      addToast("Falha ao excluir membros", "error");
    } finally {
      setPendingBatchExcluir(false);
    }
  };

  const confirmBatchStatus = async () => {
    const novoStatusBool = pendingBatchStatus === "Ativo";
    try {
      await atualizarStatusComunidadeLote(selecionados, novoStatusBool);
      setMembros((prev) =>
        prev.map((m) => selecionados.includes(m.idUsuario) ? { ...m, status: pendingBatchStatus } : m)
      );
      addToast(`${selecionados.length} membro(s) ${novoStatusBool ? "ativados" : "desativados"} com sucesso`, "success");
      setSelecionados([]);
    } catch (err) {
      addToast("Falha ao atualizar status", "error");
    } finally {
      setPendingBatchStatus(null);
    }
  };

  const totalMembros = membros.length;
  const membrosAtivos = membros.filter((m) => m.status === "Ativo").length;
  const membrosInativos = membros.filter((m) => m.status === "Inativo").length;
  const totalLivros = membros.reduce((acc, membro) => acc + membro.livros, 0);
  const membrosFiltrados = membros.filter((membro) => {
    const termo = pesquisa.toLowerCase();
    return (
      membro.nome.toLowerCase().includes(termo) ||
      membro.email.toLowerCase().includes(termo) ||
      membro.cpf.toLowerCase().includes(termo)
    );
  });

  return (
    <div className="comunidade-page page-shell">
      <div className="titulo">
        <div>
          <h1>Gestão da Comunidade</h1>
          <p>Cadastre e acompanhe os membros da biblioteca.</p>
        </div>

        <div className="titulo-acoes">
          <button className="btn-novo-comunidade" onClick={abrirCriacao}>
            + Novo Membro
          </button>
          <button className="btn-importar" onClick={() => setModalImportar(true)}>
            <Upload size={16} /> Importar
          </button>
        </div>
      </div>

      <div className="stats-cards-grid">
        <StatsCard
          title="Total de Membros"
          value={totalMembros}
          subtitle="Cadastros da comunidade"
          icon={<Users size={18} />}
          color="blue"
        />

        <StatsCard
          title="Membros Ativos"
          value={membrosAtivos}
          subtitle="Aptos para empréstimo"
          icon={<UserCheck size={18} />}
          color="green"
        />

        <StatsCard
          title="Membros Inativos"
          value={membrosInativos}
          subtitle="Com acesso indisponível"
          icon={<UserX size={18} />}
          color="red"
        />

        <StatsCard
          title="Livros Emprestados"
          value={totalLivros}
          subtitle="Em posse da comunidade"
          icon={<BookOpen size={18} />}
          color="orange"
        />
      </div>

      <div className="topo-lista">
        <h2>Lista de Membros</h2>
        <SearchBar
          value={pesquisa}
          onChange={setPesquisa}
          placeholder="Buscar por nome, e-mail ou CPF..."
        />
      </div>

      {selecionados.length > 0 && (
        <div className="batch-bar">
          <span>{selecionados.length} selecionado(s)</span>
          <div className="batch-actions">
            <button className="btn-batch btn-batch-ativar" onClick={() => handleBatchStatus("Ativo")}>
              <UserCheck size={15} /> Ativar
            </button>
            <button className="btn-batch btn-batch-inativar" onClick={() => handleBatchStatus("Inativo")}>
              <UserX size={15} /> Inativar
            </button>
            <button className="btn-batch btn-batch-excluir" onClick={() => setPendingBatchExcluir(true)}>
              <Trash2 size={15} /> Excluir
            </button>
            <button className="btn-batch btn-batch-cancelar" onClick={() => setSelecionados([])}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="table-container">
        <table>
          <colgroup>
            <col style={{ width: "40px" }} />
            <col className="col-nome" />
            <col className="col-cpf" />
            <col className="col-email" />
            <col className="col-telefone" />
            <col className="col-livros-table" />
            <col className="col-status" />
            <col className="col-acoes" />
          </colgroup>
          <thead>
            <tr>
              <th className="col-check">
                <input
                  type="checkbox"
                  checked={membrosFiltrados.length > 0 && selecionados.length === membrosFiltrados.length}
                  onChange={toggleSelecionarTodos}
                  title="Selecionar todos"
                />
              </th>
              <th>Nome</th>
              <th>CPF</th>
              <th>E-mail</th>
              <th>Telefone</th>
              <th>Livros</th>
              <th>Status</th>
              <th className="acoes-coluna">Ações</th>
            </tr>
          </thead>

          <tbody>
            {membrosFiltrados.map((membro) => (
              <tr key={membro.idUsuario} className={selecionados.includes(membro.idUsuario) ? "row-selecionada" : ""}>
                <td className="col-check">
                  <input
                    type="checkbox"
                    checked={selecionados.includes(membro.idUsuario)}
                    onChange={() => toggleSelecionado(membro.idUsuario)}
                  />
                </td>
                <td>{membro.nome}</td>
                <td>{formatarCPF(membro.cpf)}</td>
                <td>{membro.email}</td>
                <td className="col-telefone-cell">{formatarTelefone(membro.telefone)}</td>
                <td className="col-livros">{membro.livros}</td>
                <td>
                  <span className={membro.status === "Ativo" ? "badge-ativo" : "badge-inativo"}>
                    {membro.status}
                  </span>
                </td>

                <td className="acoes-cell">
                  <div className="acoes">
                    <button className="btn-status" onClick={() => handleToggleStatus(membro.idUsuario)}>
                      {membro.status === "Ativo" ? (
                        <UserX size={16} className="icon-red" />
                      ) : (
                        <UserCheck size={16} className="icon-green" />
                      )}
                    </button>

                    <button className="btn-edit" onClick={() => abrirEdicao(membro.idUsuario)}>
                      <Pencil size={16} />
                    </button>

                    <button className="btn-delete" onClick={() => handleExcluir(membro.idUsuario)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ComunidadeModal
        aberto={modalAberto}
        modoEdicao={modoEdicao}
        membro={novoMembro}
        isProcessing={isProcessing}
        isDirty={isDirty}
        onChange={handleChange}
        onClose={fecharModal}
        onSave={handleSalvar}
      />

      <ImportarModal
        aberto={modalImportar}
        titulo="Importar Membros via Excel"
        onClose={() => { setModalImportar(false); fetchMembros(); }}
        onImportar={importarComunidade}
      />

      <ConfirmModal
        show={Boolean(pendingDeleteMembro)}
        title="Confirmar exclusão"
        message="Tem certeza que deseja excluir este membro?"
        onConfirm={confirmExcluirMembro}
        onCancel={() => setPendingDeleteMembro(null)}
        confirmText="Excluir"
        cancelText="Cancelar"
        irreversivel
      />
      <ConfirmModal
        show={pendingBatchExcluir}
        title="Excluir em lote"
        message={`Tem certeza que deseja excluir ${selecionados.length} membro(s)?`}
        onConfirm={confirmBatchExcluir}
        onCancel={() => setPendingBatchExcluir(false)}
        confirmText="Excluir"
        cancelText="Cancelar"
        irreversivel
      />
      <ConfirmModal
        show={Boolean(pendingBatchStatus)}
        title={`${pendingBatchStatus === "Ativo" ? "Ativar" : "Inativar"} em lote`}
        message={`Tem certeza que deseja ${pendingBatchStatus === "Ativo" ? "ativar" : "inativar"} ${selecionados.length} membro(s)?`}
        onConfirm={confirmBatchStatus}
        onCancel={() => setPendingBatchStatus(null)}
        confirmText={pendingBatchStatus === "Ativo" ? "Ativar" : "Inativar"}
        cancelText="Cancelar"
      />
    </div>
  );
}