import React, { useEffect, useState } from "react";
import "./Aluno.css";
import "../CadastroLivros/components/BookForm/BookFormModal.css";
import { Users, UserCheck, UserX, BookOpen, Pencil, Trash2, Upload } from "lucide-react";
import { getAlunos, createAluno, updateAluno, deleteAluno, excluirAlunosLote, atualizarStatusLote } from "../../../services/api";
import { useToast } from "../../../contexts/ToastContext";
import ConfirmModal from "../../../components/ConfirmModal/ConfirmModal";
import SearchBar from "./components/SearchBar";
import AlunoModal from "./components/AlunoModal";
import StatsCard from "../../../components/StatsCard/StatsCard";
import ImportarModal from "../../../components/ImportarModal/ImportarModal";
import { importarAlunos } from "../../../services/api";
import { reativarAluno } from "../../../services/api";

const EMPTY_ALUNO = {
  nome: "",
  ra: "",
  email: "",
  telefone: "",
  telefone2: "",
  endereco: "",
  serie: "",
  turma: "",
  senha: "",
  status: "Ativo",
};

export default function Aluno() {
  const [modalAberto, setModalAberto] = useState(false);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [indexEditando, setIndexEditando] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [pesquisa, setPesquisa] = useState("");
  const [novoAluno, setNovoAluno] = useState(EMPTY_ALUNO);
  const [alunos, setAlunos] = useState([]);
  const [pendingDeleteAluno, setPendingDeleteAluno] = useState(null);
  const [modalImportar, setModalImportar] = useState(false);
  const [pendingReativar, setPendingReativar] = useState(null);
  const [selecionados, setSelecionados] = useState([]);
  const [pendingBatchExcluir, setPendingBatchExcluir] = useState(false);
  const [pendingBatchStatus, setPendingBatchStatus] = useState(null); // "Ativo" | "Inativo"
  const { addToast } = useToast();

const fetchAlunos = async () => {
  try {
    const data = await getAlunos();
    setAlunos(
      (data || []).map((u) => ({
        idUsuario: u.idUsuario,
        nome: u.usuNome,
        ra: u.usuRA || "",
        email: u.usuEmail || "",
        telefone: u.usuTelefone || "",
        telefone2: u.usuTelefoneResponsavel || "",
        endereco: u.usuEndereco || "",
        serie: u.usuSerie || "",
        turma: u.usuTurma || "",
        formado: u.usuFormado === true,
        livros: 0,
        status: u.usuStatus === true ? "Ativo" : "Inativo",
      }))
    );
  } catch (err) {
    console.error("Erro ao carregar alunos:", err);
  }
};

useEffect(() => {
  fetchAlunos();
}, []);

  const handleChange = (e) => {
    setNovoAluno((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    setIsDirty(true);
  };

  const fecharModal = () => {
    setModalAberto(false);
    setModoEdicao(false);
    setIndexEditando(null);
    setNovoAluno(EMPTY_ALUNO);
    setIsDirty(false);
  };

const handleSalvar = async () => {
  if (isProcessing) return;
  if (modoEdicao && !isDirty) return;

  if (
    !novoAluno.nome ||
    !novoAluno.email ||
    !novoAluno.telefone ||
    !novoAluno.endereco ||
    !novoAluno.status
  ) {
    return;
  }

  setIsProcessing(true);

  try {
    // ===== EDIÇÃO =====
    if (modoEdicao && indexEditando != null) {
      const alvo = alunos[indexEditando];

      const payload = {
        nome: novoAluno.nome,
        email: novoAluno.email,
        telefone: novoAluno.telefone,
        telefoneResponsavel: novoAluno.telefone2,
        endereco: novoAluno.endereco,
        ra: novoAluno.ra,
        serie: novoAluno.serie,
        turma: novoAluno.turma,
        status: novoAluno.status === "Ativo",
      };

      const updated = await updateAluno(alvo.idUsuario, payload);

      setAlunos((prev) =>
        prev.map((aluno, i) =>
          i === indexEditando
            ? {
                ...aluno,
                nome: updated.usuNome,
                ra: updated.usuRA || "",
                email: updated.usuEmail || "",
                telefone: updated.usuTelefone || "",
                telefone2: updated.usuTelefoneResponsavel || "",
                endereco: updated.usuEndereco || "",
                serie: updated.usuSerie || "",
                turma: updated.usuTurma || "",
                formado: updated.usuFormado === true,
                status:
                  updated.usuStatus === true
                    ? "Ativo"
                    : "Inativo",
              }
            : aluno
        )
      );

      addToast("Informações atualizadas com sucesso", "success");
    }

    // ===== CRIAÇÃO =====
    else {
      if (!novoAluno.senha || novoAluno.senha.length < 6) {
        addToast(
          "A senha deve possuir pelo menos 6 caracteres",
          "error"
        );
        return;
      }

      try {
        const created = await createAluno({
          nome: novoAluno.nome,
          email: novoAluno.email,
          senha: novoAluno.senha,
          telefone: novoAluno.telefone,
          telefoneResponsavel: novoAluno.telefone2,
          endereco: novoAluno.endereco,
          ra: novoAluno.ra,
          serie: novoAluno.serie,
          turma: novoAluno.turma,
          tipo: "Aluno",
          status: novoAluno.status === "Ativo",
        });

        setAlunos((prev) => [
          ...prev,
          {
            idUsuario: created.idUsuario,
            nome: created.usuNome,
            ra: created.usuRA || "",
            email: created.usuEmail || "",
            telefone: created.usuTelefone || "",
            telefone2: created.usuTelefoneResponsavel || "",
            endereco: created.usuEndereco || "",
            serie: created.usuSerie || "",
            turma: created.usuTurma || "",
            formado: created.usuFormado === true,
            livros: 0,
            status: novoAluno.status || "Ativo",
          },
        ]);

        addToast("Cadastro realizado com sucesso", "success");
      } catch (err) {
        // Usuário existe, mas está inativo
        if (
          err.status === 409 ||
          err.data?.detail === "USUARIO_INATIVO" ||
          err.message?.includes("USUARIO_INATIVO")
        ) {
          setPendingReativar({ ...novoAluno });
          fecharModal();
          return;
        }

        throw err;
      }
    }

    fecharModal();
  } catch (err) {
    console.error("Erro ao salvar aluno:", err);

    addToast(
      modoEdicao
        ? "Falha ao atualizar as informações"
        : "Falha ao realizar o cadastro",
      "error"
    );
  } finally {
    setTimeout(() => setIsProcessing(false), 600);
    setIsDirty(false);
  }
};

  const abrirCriacao = () => {
    setNovoAluno(EMPTY_ALUNO);
    setModoEdicao(false);
    setIndexEditando(null);
    setModalAberto(true);
    setIsDirty(false);
  };

  const abrirEdicao = (idUsuario) => {
    const index = alunos.findIndex((aluno) => aluno.idUsuario === idUsuario);
    if (index === -1) return;

    const aluno = alunos[index];
    setNovoAluno({
      nome: aluno.nome || "",
      ra: aluno.ra || "",
      email: aluno.email || "",
      telefone: aluno.telefone || "",
      telefone2: aluno.telefone2 || "",
      endereco: aluno.endereco || "",
      serie: aluno.serie || "",
      turma: aluno.turma || "",
      senha: "",
      status: aluno.status || "Ativo",
    });
    setIndexEditando(index);
    setModoEdicao(true);
    setModalAberto(true);
    setIsDirty(false);
  };

  const handleExcluir = (idUsuario) => {
    const target = alunos.find((aluno) => aluno.idUsuario === idUsuario);
    setPendingDeleteAluno(target || { idUsuario, nome: "este usuário" });
  };

  const confirmExcluirAluno = async () => {
    if (!pendingDeleteAluno) return;

    try {
      await deleteAluno(pendingDeleteAluno.idUsuario);
      setAlunos((prev) => prev.filter((aluno) => aluno.idUsuario !== pendingDeleteAluno.idUsuario));
      addToast("Usuário excluído com sucesso", "success");
    } catch (err) {
      console.error("Erro ao excluir aluno:", err);
      addToast("Falha ao excluir o usuário", "error");
    } finally {
      setPendingDeleteAluno(null);
    }
  };

  const [pendingToggleAluno, setPendingToggleAluno] = useState(null);

  const handleToggleStatus = (idUsuario) => {
  const target = alunos.find((aluno) => aluno.idUsuario === idUsuario);
  if (!target) return;

  setPendingToggleAluno({
    ...target,
    novoStatus: target.status === "Ativo" ? "Inativo" : "Ativo",
    });
  };

    const confirmToggleAlunoStatus = async () => {
    if (!pendingToggleAluno) return;

    try {
      const index = alunos.findIndex((aluno) => aluno.idUsuario === pendingToggleAluno.idUsuario);
      if (index === -1) return;

      const alvo = alunos[index];
      const novoStatus = pendingToggleAluno.novoStatus;

      await updateAluno(alvo.idUsuario, {
        nome: alvo.nome,
        email: alvo.email,
        status: novoStatus === "Ativo",
      });

      setAlunos((prev) =>
        prev.map((aluno, i) =>
          i === index ? { ...aluno, status: novoStatus } : aluno
        )
      );
      addToast(`Aluno ${novoStatus === "Ativo" ? "ativado" : "desativado"} com sucesso`, "success");
    } catch (err) {
      console.error("Erro ao alterar status do aluno:", err);
      addToast("Falha ao alterar status", "error");
    } finally {
      setPendingToggleAluno(null);
    }
  };

    const confirmReativar = async () => {
    if (!pendingReativar) return;

    try {
      const reativado = await reativarAluno({
        nome: pendingReativar.nome,
        email: pendingReativar.email,
        senha: pendingReativar.senha,
        telefone: pendingReativar.telefone,
        telefoneResponsavel: pendingReativar.telefone2,
        endereco: pendingReativar.endereco,
        ra: pendingReativar.ra,
        serie: pendingReativar.serie,
        turma: pendingReativar.turma,
      });

      setAlunos((prev) => [
        ...prev,
        {
          idUsuario: reativado.idUsuario,
          nome: reativado.usuNome,
          ra: reativado.usuRA || "",
          email: reativado.usuEmail || "",
          telefone: reativado.usuTelefone || "",
          telefone2: reativado.usuTelefoneResponsavel || "",
          endereco: reativado.usuEndereco || "",
          serie: reativado.usuSerie || "",
          turma: reativado.usuTurma || "",
          formado: reativado.usuFormado === true,
          livros: 0,
          status: "Ativo",
        },
      ]);

      addToast("Aluno reativado com sucesso", "success");
    } catch (err) {
      console.error("Erro ao reativar aluno:", err);
      addToast("Falha ao reativar o aluno", "error");
    } finally {
      setPendingReativar(null);
    }
  };

  const handleBatchStatus = (novoStatus) => {
    const jaEstao = alunosFiltrados
      .filter((a) => selecionados.includes(a.idUsuario))
      .every((a) => a.status === novoStatus);
    if (jaEstao) {
      addToast(`Todos os selecionados já estão ${novoStatus === "Ativo" ? "ativos" : "inativos"}`, "info");
      return;
    }
    setPendingBatchStatus(novoStatus);
  };

  const toggleSelecionado = (id) => {
    setSelecionados((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelecionarTodos = () => {
    if (selecionados.length === alunosFiltrados.length) {
      setSelecionados([]);
    } else {
      setSelecionados(alunosFiltrados.map((a) => a.idUsuario));
    }
  };

  const confirmBatchExcluir = async () => {
    try {
      await excluirAlunosLote(selecionados);
      setAlunos((prev) => prev.filter((a) => !selecionados.includes(a.idUsuario)));
      addToast(`${selecionados.length} aluno(s) excluído(s) com sucesso`, "success");
      setSelecionados([]);
    } catch (err) {
      addToast("Falha ao excluir alunos", "error");
    } finally {
      setPendingBatchExcluir(false);
    }
  };

  const confirmBatchStatus = async () => {
    const novoStatus = pendingBatchStatus === "Ativo";
    try {
      await atualizarStatusLote(selecionados, novoStatus);
      setAlunos((prev) =>
        prev.map((a) =>
          selecionados.includes(a.idUsuario) ? { ...a, status: pendingBatchStatus } : a
        )
      );
      addToast(`${selecionados.length} aluno(s) ${novoStatus ? "ativados" : "desativados"} com sucesso`, "success");
      setSelecionados([]);
    } catch (err) {
      addToast("Falha ao atualizar status", "error");
    } finally {
      setPendingBatchStatus(null);
    }
  };

  const totalAlunos = alunos.length;
  const alunosAtivos = alunos.filter((a) => a.status === "Ativo").length;
  const alunosInativos = alunos.filter((a) => a.status === "Inativo").length;
  const totalLivros = alunos.reduce((acc, aluno) => acc + aluno.livros, 0);
  const alunosFiltrados = alunos.filter((aluno) => {
    const termo = pesquisa.toLowerCase();
    return (
      aluno.nome.toLowerCase().includes(termo) ||
      aluno.email.toLowerCase().includes(termo) ||
      aluno.ra.toLowerCase().includes(termo)
    );
  });

  return (
    <div className="aluno-page page-shell">
      <div className="titulo">
        <div>
          <h1>Gestão de Alunos</h1>
          <p>Cadastre e acompanhe os alunos da biblioteca.</p>
        </div>

        <div className="titulo-acoes">
          <button className="btn-novo-aluno" onClick={abrirCriacao}>
            + Novo Aluno
          </button>
          <button className="btn-importar" onClick={() => setModalImportar(true)}>
            <Upload size={16} /> Importar
          </button>
        </div>
      </div>


      <div className="stats-cards-grid">
        <StatsCard
          title="Total de Alunos"
          value={totalAlunos}
          subtitle="Cadastros registrados"
          icon={<Users size={18} />}
          color="blue"
        />

        <StatsCard
          title="Alunos Ativos"
          value={alunosAtivos}
          subtitle="Com acesso liberado"
          icon={<UserCheck size={18} />}
          color="green"
        />

        <StatsCard
          title="Alunos Inativos"
          value={alunosInativos}
          subtitle="Com acesso suspenso"
          icon={<UserX size={18} />}
          color="red"
        />

        <StatsCard
          title="Livros Emprestados"
          value={totalLivros}
          subtitle="Em posse dos alunos"
          icon={<BookOpen size={18} />}
          color="orange"
        />
      </div>

      <div className="topo-lista">
        <h2>Lista de Alunos</h2>
        <SearchBar
          value={pesquisa}
          onChange={setPesquisa}
          placeholder="Buscar por nome, e-mail ou RA..."
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
          <thead>
            <tr>
              <th className="col-check">
                <input
                  type="checkbox"
                  checked={alunosFiltrados.length > 0 && selecionados.length === alunosFiltrados.length}
                  onChange={toggleSelecionarTodos}
                  title="Selecionar todos"
                />
              </th>
              <th>Nome</th>
              <th>RA</th>
              <th>E-mail</th>
              <th>Livros</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>

          <tbody>
            {alunosFiltrados.map((aluno) => (
              <tr key={aluno.idUsuario} className={selecionados.includes(aluno.idUsuario) ? "row-selecionada" : ""}>
                <td className="col-check">
                  <input
                    type="checkbox"
                    checked={selecionados.includes(aluno.idUsuario)}
                    onChange={() => toggleSelecionado(aluno.idUsuario)}
                  />
                </td>
                <td>{aluno.nome}</td>
                <td>{aluno.ra}</td>
                <td>{aluno.email}</td>
                <td>{aluno.livros}</td>
                <td>
                  <span className={aluno.status === "Ativo" ? "badge-ativo" : "badge-inativo"}>
                    {aluno.status}
                  </span>
                  {aluno.formado && (
                    <span className="badge-formado" style={{ marginLeft: 6 }}>Formado</span>
                  )}
                </td>

                <td className="acoes">
                  <button className="btn-status" onClick={() => handleToggleStatus(aluno.idUsuario)} title="Alterar status">
                    {aluno.status === "Ativo" ? (
                      <UserX size={16} className="icon-red" />
                    ) : (
                      <UserCheck size={16} className="icon-green" />
                    )}
                  </button>

                  <button className="btn-edit" onClick={() => abrirEdicao(aluno.idUsuario)}>
                    <Pencil size={16} />
                  </button>

                  <button className="btn-delete" onClick={() => handleExcluir(aluno.idUsuario)}>
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AlunoModal
        aberto={modalAberto}
        modoEdicao={modoEdicao}
        aluno={novoAluno}
        isProcessing={isProcessing}
        isDirty={isDirty}
        onChange={handleChange}
        onClose={fecharModal}
        onSave={handleSalvar}
      />

      <ImportarModal
        aberto={modalImportar}
        titulo="Importar Alunos via Excel"
        onClose={() => { setModalImportar(false); fetchAlunos(); }}
        onImportar={importarAlunos}
      />

      <ConfirmModal
        show={Boolean(pendingDeleteAluno)}
        title="Confirmar exclusão"
        message="Tem certeza que deseja excluir este aluno?"
        onConfirm={confirmExcluirAluno}
        onCancel={() => setPendingDeleteAluno(null)}
        confirmText="Excluir"
        cancelText="Cancelar"
        irreversivel
      />
      <ConfirmModal
        show={Boolean(pendingToggleAluno)}
        title="Confirmar alteração de status"
        message={`Tem certeza que deseja ${pendingToggleAluno?.novoStatus === "Inativo" ? "desativar" : "ativar"} este aluno?`}
        onConfirm={confirmToggleAlunoStatus}
        onCancel={() => setPendingToggleAluno(null)}
        confirmText={pendingToggleAluno?.novoStatus === "Inativo" ? "Desativar" : "Ativar"}
        cancelText="Cancelar"
      />
      <ConfirmModal
        show={Boolean(pendingReativar)}
        title="Usuário já cadastrado"
        message={`O aluno "${pendingReativar?.nome}" já existe na base mas está inativo. Deseja reativá-lo com os novos dados?`}
        onConfirm={confirmReativar}
        onCancel={() => setPendingReativar(null)}
        confirmText="Reativar"
        cancelText="Cancelar"
      />
      <ConfirmModal
        show={pendingBatchExcluir}
        title="Excluir em lote"
        message={`Tem certeza que deseja excluir ${selecionados.length} aluno(s)?`}
        onConfirm={confirmBatchExcluir}
        onCancel={() => setPendingBatchExcluir(false)}
        confirmText="Excluir"
        cancelText="Cancelar"
        irreversivel
      />
      <ConfirmModal
        show={Boolean(pendingBatchStatus)}
        title={`${pendingBatchStatus === "Ativo" ? "Ativar" : "Inativar"} em lote`}
        message={`Tem certeza que deseja ${pendingBatchStatus === "Ativo" ? "ativar" : "inativar"} ${selecionados.length} aluno(s)?`}
        onConfirm={confirmBatchStatus}
        onCancel={() => setPendingBatchStatus(null)}
        confirmText={pendingBatchStatus === "Ativo" ? "Ativar" : "Inativar"}
        cancelText="Cancelar"
      />
    </div>
  );
}
