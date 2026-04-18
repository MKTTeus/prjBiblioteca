import React, { useEffect, useState } from "react";
import "./Aluno.css";
import "../CadastroLivros/components/BookForm/BookFormModal.css";
import { Users, UserCheck, UserX, BookOpen, Pencil, Trash2 } from "lucide-react";
import { getAlunos, createAluno, updateAluno, deleteAluno } from "../../../services/api";
import { useToast } from "../../../contexts/ToastContext";
import ConfirmModal from "../../../components/ConfirmModal/ConfirmModal";
import SearchBar from "./components/SearchBar";
import AlunoModal from "./components/AlunoModal";
import StatsCard from "../../../components/StatsCard/StatsCard";

const EMPTY_ALUNO = {
  nome: "",
  ra: "",
  email: "",
  telefone: "",
  telefone2: "",
  endereco: "",
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
  const { addToast } = useToast();

  useEffect(() => {
    async function fetchAlunos() {
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
            livros: 0,
            status: u.usuStatus === false ? "Inativo" : "Ativo",
          }))
        );
      } catch (err) {
        console.error("Erro ao carregar alunos:", err);
      }
    }

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
      if (modoEdicao && indexEditando != null) {
        const alvo = alunos[indexEditando];
        const payload = {
          nome: novoAluno.nome,
          email: novoAluno.email,
          telefone: novoAluno.telefone,
          telefoneResponsavel: novoAluno.telefone2,
          endereco: novoAluno.endereco,
          ra: novoAluno.ra,
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
                  status: updated.usuStatus === false ? "Inativo" : "Ativo",
                }
              : aluno
          )
        );
        addToast("Informações atualizadas com sucesso", "success");
      } else {
        if (!novoAluno.senha || novoAluno.senha.length < 6) return;

        const created = await createAluno({
          nome: novoAluno.nome,
          email: novoAluno.email,
          senha: novoAluno.senha,
          telefone: novoAluno.telefone,
          telefoneResponsavel: novoAluno.telefone2,
          endereco: novoAluno.endereco,
          ra: novoAluno.ra,
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
            livros: 0,
            status: novoAluno.status || "Ativo",
          },
        ]);
        addToast("Cadastro realizado com sucesso", "success");
      }

      fecharModal();
    } catch (err) {
      console.error("Erro ao salvar aluno:", err);
      addToast(modoEdicao ? "Falha ao atualizar as informações" : "Falha ao realizar o cadastro", "error");
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
    setPendingToggleAluno(target || { idUsuario, status: "este aluno", novoStatus: target.status === "Ativo" ? "Inativo" : "Ativo" });
  };

  const confirmToggleAlunoStatus = async () => {
    if (!pendingToggleAluno) return;

    try {
      const index = alunos.findIndex((aluno) => aluno.idUsuario === pendingToggleAluno.idUsuario);
      if (index === -1) return;

      const alvo = alunos[index];
      const novoStatus = alvo.status === "Ativo" ? "Inativo" : "Ativo";

      const updated = await updateAluno(alvo.idUsuario, {
        status: novoStatus === "Ativo",
      });

      setAlunos((prev) =>
        prev.map((aluno, i) =>
          i === index
            ? {
                ...aluno,
                status: novoStatus,
              }
            : aluno
        )
      );
      addToast(`Aluno ${novoStatus.toLowerCase()} com sucesso`, "success");
    } catch (err) {
      console.error("Erro ao alterar status do aluno:", err);
      addToast("Falha ao alterar status", "error");
    } finally {
      setPendingToggleAluno(null);
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
    <div className="aluno-page">
      <div className="titulo">
        <div>
          <h1>Gestão de Alunos</h1>
          <p>Cadastre e acompanhe os alunos da biblioteca.</p>
        </div>

        <button className="btn-novo-aluno" onClick={abrirCriacao}>
          + Novo Aluno
        </button>
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

      <div className="table-container">
        <table>
          <thead>
            <tr>
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
              <tr key={aluno.idUsuario}>
                <td>{aluno.nome}</td>
                <td>{aluno.ra}</td>
                <td>{aluno.email}</td>
                <td>{aluno.livros}</td>
                <td>
                  <span className={aluno.status === "Ativo" ? "badge-ativo" : "badge-inativo"}>
                    {aluno.status}
                  </span>
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

      <ConfirmModal
        show={Boolean(pendingDeleteAluno)}
        title="Confirmar exclusão"
        message={
          pendingDeleteAluno
            ? `Tem certeza que deseja excluir este usuário?`
            : "Tem certeza que deseja excluir este usuário?"
        }
        onConfirm={confirmExcluirAluno}
        onCancel={() => setPendingDeleteAluno(null)}
        confirmText="Excluir"
        cancelText="Cancelar"
      />
      <ConfirmModal
        show={Boolean(pendingToggleAluno)}
        title="Confirmar alteração de status"
        message={`Tem certeza que deseja ${pendingToggleAluno?.novoStatus?.toLowerCase()} este aluno?`}
        onConfirm={confirmToggleAlunoStatus}
        onCancel={() => setPendingToggleAluno(null)}
        confirmText={pendingToggleAluno?.novoStatus === "Inativo" ? "Desativar" : "Ativar"}
        cancelText="Cancelar"
      />
    </div>
  );
}
