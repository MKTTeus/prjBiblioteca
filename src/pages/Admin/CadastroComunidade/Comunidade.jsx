import React, { useEffect, useRef, useState } from "react";
import "./Comunidade.css";
import "../../../components/MobileUserCard/UserManagementLayout.css";
import "../CadastroLivros/components/BookForm/BookFormModal.css";
import { Users, UserCheck, UserX, BookOpen, Pencil, Trash2, Upload } from "lucide-react";
import {
  getComunidade,
  createComunidade,
  updateComunidade,
  deleteComunidade,
  excluirComunidadeLote,
  atualizarStatusComunidadeLote,
  reativarComunidade,
} from "../../../services/api";
import { useToast } from "../../../contexts/ToastContext";
import ConfirmModal from "../../../components/ConfirmModal/ConfirmModal";
import Pagination from "../../../components/Pagination/Pagination";
import usePagination from "../../../hooks/usePagination";
import SearchBar from "./components/SearchBar";
import ComunidadeModal from "./components/ComunidadeModal";
import StatsCard from "../../../components/StatsCard/StatsCard";
import MobileUserCard from "../../../components/MobileUserCard/MobileUserCard";
import ImportarModal from "../../../components/ImportarModal/ImportarModal";
import { importarComunidade } from "../../../services/api";
import { formatarCPF, formatarTelefone, validarCPF } from "../../../utils/masks";
import { getErrorMessage, isInactiveUserError } from "../../../utils/apiError";
import { filtrarPorBusca } from "../../../utils/busca";
import { useAuth } from "../../../contexts/AuthContext";
import useRegistrationDraft from "../../../hooks/useRegistrationDraft";

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

const CAMPOS_OBRIGATORIOS_MEMBRO = [
  { chave: "nome", rotulo: "Nome Completo" },
  { chave: "email", rotulo: "E-mail" },
  { chave: "telefone", rotulo: "Telefone" },
  { chave: "endereco", rotulo: "Endereço" },
];

export default function Comunidade() {
  const [modalAberto, setModalAberto] = useState(false);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [indexEditando, setIndexEditando] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [pesquisa, setPesquisa] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("Todos");
  const [novoMembro, setNovoMembro] = useState(EMPTY_MEMBRO);
  const [errosFormulario, setErrosFormulario] = useState({});
  const [membros, setMembros] = useState([]);
  const [pendingDeleteMembro, setPendingDeleteMembro] = useState(null);
  const [pendingReativar, setPendingReativar] = useState(null);
  const [modalImportar, setModalImportar] = useState(false);
  const [selecionados, setSelecionados] = useState([]);
  const [pendingBatchExcluir, setPendingBatchExcluir] = useState(false);
  const [pendingBatchStatus, setPendingBatchStatus] = useState(null);
  const { addToast } = useToast();
  const { user } = useAuth();
  const { draft, clearDraft } = useRegistrationDraft("comunidade", user, {
    open: modalAberto, dirty: isDirty, form: novoMembro,
    recordId: modoEdicao ? membros[indexEditando]?.idUsuario : null,
  });
  const restoredDraft = useRef(false);

  useEffect(() => {
    if (!draft || restoredDraft.current) return;
    const index = draft.recordId ? membros.findIndex((m) => m.idUsuario === draft.recordId) : null;
    if (draft.recordId && index < 0) return;
    restoredDraft.current = true;
    setNovoMembro({ ...EMPTY_MEMBRO, ...draft.form, senha: "" });
    setModoEdicao(index !== null);
    setIndexEditando(index);
    setIsDirty(true);
    setModalAberto(true);
    addToast("Rascunho da comunidade recuperado. Informe a senha novamente, se necessário.", "success");
  }, [draft, membros, addToast]);

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
    addToast(getErrorMessage(err, "Não foi possível carregar a lista da comunidade. Atualize a página e tente novamente."), "error");
  }
};

useEffect(() => {
  fetchMembros();
}, []);

  const handleChange = (e) => {
    setErrosFormulario((prev) => ({ ...prev, [e.target.name]: undefined }));
    setNovoMembro((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    setIsDirty(true);
  };

  const fecharModal = () => {
    setErrosFormulario({});
    clearDraft();
    setModalAberto(false);
    setModoEdicao(false);
    setIndexEditando(null);
    setNovoMembro(EMPTY_MEMBRO);
    setIsDirty(false);
  };

const handleSalvar = async () => {
  if (isProcessing) return;
  if (modoEdicao && !isDirty) return;

  const errors = Object.fromEntries(CAMPOS_OBRIGATORIOS_MEMBRO.filter(({ chave }) => !String(novoMembro[chave] || "").trim()).map(({ chave, rotulo }) => [chave, `Informe ${rotulo.toLowerCase()}.`]));
  if (!validarCPF(novoMembro.cpf)) errors.cpf = "Informe um CPF válido.";
  if (!modoEdicao && (!novoMembro.senha || novoMembro.senha.length < 8)) errors.senha = "A senha deve ter pelo menos 8 caracteres.";
  if (Object.keys(errors).length > 0) {
    setErrosFormulario(errors);
    document.querySelector(`.comunidade-editor-modal [name="${Object.keys(errors)[0]}"]`)?.focus();
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
        let created;
        try {
          created = await createComunidade({
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
        } catch (err) {
          if (isInactiveUserError(err)) {
            setPendingReativar({ ...novoMembro });
            fecharModal();
            return;
          }
          throw err;
        }

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
      const fallback = modoEdicao ? "Falha ao atualizar as informações" : "Falha ao realizar o cadastro";
      addToast(getErrorMessage(err, fallback), "error");
    } finally {
      setTimeout(() => setIsProcessing(false), 600);
    }
  };

  const confirmReativar = async () => {
    if (!pendingReativar) return;

    try {
      const reativado = await reativarComunidade({
        nome: pendingReativar.nome,
        email: pendingReativar.email,
        senha: pendingReativar.senha,
        telefone: pendingReativar.telefone,
        telefoneResponsavel: pendingReativar.telefone2,
        endereco: pendingReativar.endereco,
        cpf: pendingReativar.cpf,
        tipo: "Comunidade",
        status: true,
      });
      setMembros((prev) => [
        ...prev,
        {
          idUsuario: reativado.idUsuario,
          nome: reativado.usuNome,
          cpf: reativado.usuCPF || "",
          email: reativado.usuEmail || "",
          telefone: reativado.usuTelefone || "",
          telefone2: reativado.usuTelefoneResponsavel || "",
          endereco: reativado.usuEndereco || "",
          livros: 0,
          status: "Ativo",
        },
      ]);
      addToast("Membro reativado com sucesso", "success");
    } catch (err) {
      console.error("Erro ao reativar membro:", err);
      addToast(getErrorMessage(err, "Não foi possível reativar este membro. Confira o cadastro e tente novamente."), "error");
    } finally {
      setPendingReativar(null);
    }
  };

  const abrirCriacao = () => {
    clearDraft();
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
      addToast(getErrorMessage(err, "Não foi possível excluir este membro. Atualize a lista e tente novamente."), "error");
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
      addToast(getErrorMessage(err, "Não foi possível alterar o status deste membro. Atualize a lista e tente novamente."), "error");
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
      addToast(getErrorMessage(err, "Não foi possível excluir os membros selecionados. Atualize a lista e tente novamente."), "error");
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
      addToast(getErrorMessage(err, "Não foi possível atualizar o status dos membros selecionados. Atualize a lista e tente novamente."), "error");
    } finally {
      setPendingBatchStatus(null);
    }
  };

  const totalMembros = membros.length;
  const membrosAtivos = membros.filter((m) => m.status === "Ativo").length;
  const membrosInativos = membros.filter((m) => m.status === "Inativo").length;
  const totalLivros = membros.reduce((acc, membro) => acc + membro.livros, 0);
  const membrosFiltrados = filtrarPorBusca(membros, pesquisa, (membro) => [membro.nome, membro.email, membro.cpf])
    .filter((membro) => filtroStatus === "Todos" || membro.status === filtroStatus);

  const { paginaAtual, totalPaginas, paginaItens, irParaPagina } = usePagination(membrosFiltrados);

  return (
    <div className="comunidade-page page-shell">
      <div className="titulo">
        <div>
          <h1>Gestão da Comunidade</h1>
          <p>Cadastre e acompanhe os membros da biblioteca.</p>
        </div>

      </div>

      <div className="stats-cards-grid">
        <StatsCard title="Total de Membros" value={totalMembros} subtitle="Atualizado com os dados da tela" icon={<Users size={18} />} color="blue" />
        <StatsCard title="Membros Ativos" value={membrosAtivos} subtitle="Atualizado com os dados da tela" icon={<UserCheck size={18} />} color="green" />
        <StatsCard title="Membros Inativos" value={membrosInativos} subtitle="Atualizado com os dados da tela" icon={<UserX size={18} />} color="red" />
        <StatsCard title="Livros Emprestados" value={totalLivros} subtitle="Atualizado com os dados da tela" icon={<BookOpen size={18} />} color="orange" />
      </div>

      <div className="user-management-actions titulo-acoes">
          <button className="btn-novo-comunidade" onClick={abrirCriacao}>
            + Novo Membro
          </button>
          <button className="btn-importar" onClick={() => setModalImportar(true)}>
            <Upload size={16} /> Importar
          </button>
      </div>

      <div className="user-management-controls">
        <SearchBar
          value={pesquisa}
          onChange={setPesquisa}
          placeholder="Buscar por nome, e-mail ou CPF..."
          label="Buscar membros da comunidade"
        />
        <div className="user-management-filters" role="group" aria-label="Filtrar membros por status">
          {["Todos", "Ativo", "Inativo"].map((status) => (
            <button key={status} type="button" className={filtroStatus === status ? "is-active" : ""}
              aria-pressed={filtroStatus === status} onClick={() => { setFiltroStatus(status); setSelecionados([]); irParaPagina(1); }}>
              {{ Todos: "Todos", Ativo: "Ativos", Inativo: "Inativos" }[status]}
            </button>
          ))}
        </div>
      </div>

      <div className="user-management-list-heading">
        <h2>Lista de Membros</h2>
        <span className="user-management-count">{membrosFiltrados.length} {membrosFiltrados.length === 1 ? "membro" : "membros"}</span>
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
        <div className="mobile-user-card-list">
          {membrosFiltrados.length > 0 && <label className="mobile-user-card-list__select-all">
            <input type="checkbox" checked={selecionados.length === membrosFiltrados.length} onChange={toggleSelecionarTodos} />
            Selecionar todos ({membrosFiltrados.length})
          </label>}
          {paginaItens.map((membro) => (
            <MobileUserCard
              key={membro.idUsuario}
              name={membro.nome}
              identifier={`ID ${membro.idUsuario}`}
              status={membro.status}
              fields={[{ label: "CPF/CIN", value: formatarCPF(membro.cpf) }, { label: "Telefone", value: formatarTelefone(membro.telefone) }, { label: "E-mail", value: membro.email, wide: true }]}
              books={membro.livros}
              selected={selecionados.includes(membro.idUsuario)}
              onSelect={() => toggleSelecionado(membro.idUsuario)}
              onEdit={() => abrirEdicao(membro.idUsuario)}
              onToggleStatus={() => handleToggleStatus(membro.idUsuario)}
              onDelete={() => handleExcluir(membro.idUsuario)}
            />
          ))}
        </div>
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
              <th>CPF/CIN</th>
              <th>E-mail</th>
              <th>Telefone</th>
              <th>Livros</th>
              <th>Status</th>
              <th className="acoes-coluna">Ações</th>
            </tr>
          </thead>

          <tbody>
            {paginaItens.map((membro) => (
              <tr key={membro.idUsuario} className={selecionados.includes(membro.idUsuario) ? "row-selecionada" : ""}>
                <td className="col-check" data-label="Selecionar">
                  <input
                    type="checkbox"
                    checked={selecionados.includes(membro.idUsuario)}
                    onChange={() => toggleSelecionado(membro.idUsuario)}
                  />
                </td>
                <td data-label="Nome">{membro.nome}</td>
                <td data-label="CPF/CIN">{formatarCPF(membro.cpf)}</td>
                <td data-label="E-mail">{membro.email}</td>
                <td className="col-telefone-cell" data-label="Telefone">{formatarTelefone(membro.telefone)}</td>
                <td className="col-livros" data-label="Livros">{membro.livros}</td>
                <td data-label="Status">
                  <span className={membro.status === "Ativo" ? "badge-ativo" : "badge-inativo"}>
                    {membro.status}
                  </span>
                </td>

                <td className="acoes-cell" data-label="Ações">
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

      <Pagination
        paginaAtual={paginaAtual}
        totalPaginas={totalPaginas}
        onChange={irParaPagina}
        totalItens={membrosFiltrados.length}
      />

      <ComunidadeModal
        aberto={modalAberto}
        modoEdicao={modoEdicao}
        membro={novoMembro}
        isProcessing={isProcessing}
        isDirty={isDirty}
        onChange={handleChange}
        onClose={fecharModal}
        onSave={handleSalvar}
        errors={errosFormulario}
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
        show={Boolean(pendingReativar)}
        title="Cadastro já existente"
        message={`Já existe um cadastro inativo para "${pendingReativar?.nome}". Deseja reativá-lo com os dados informados?`}
        onConfirm={confirmReativar}
        onCancel={() => setPendingReativar(null)}
        confirmText="Reativar"
        cancelText="Cancelar"
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
