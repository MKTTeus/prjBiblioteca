import React, { useEffect, useState } from "react";
import "./Comunidade.css";
import "../CadastroLivros/components/BookForm/BookFormModal.css";
import { Users, UserCheck, UserX, BookOpen, Pencil, Trash2 } from "lucide-react";
import {
  getComunidade,
  createComunidade,
  updateComunidade,
  deleteComunidade,
} from "../../../services/api";
import SearchBar from "./components/SearchBar";
import ComunidadeModal from "./components/ComunidadeModal";
import StatsCard from "../../../components/StatsCard/StatsCard";

const maxCPFLength = 11;

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

  useEffect(() => {
    async function fetchMembros() {
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
            status: u.usuStatus === false ? "Inativo" : "Ativo",
          }))
        );
      } catch (err) {
        console.error("Erro ao carregar comunidade:", err);
      }
    }

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
                  status: updated.usuStatus === false ? "Inativo" : "Ativo",
                }
              : membro
          )
        );
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
      }

      fecharModal();
    } catch (err) {
      console.error("Erro ao salvar membro:", err);
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

  const handleExcluir = async (idUsuario) => {
    try {
      await deleteComunidade(idUsuario);
      setMembros((prev) => prev.filter((membro) => membro.idUsuario !== idUsuario));
    } catch (err) {
      console.error("Erro ao excluir membro:", err);
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
                status: updated.usuStatus === false ? "Inativo" : "Ativo",
              }
            : membro
        )
      );
    } catch (err) {
      console.error("Erro ao alterar status do membro:", err);
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
    <div className="comunidade-page">
      <div className="titulo">
        <div>
          <h1>Gestão da Comunidade</h1>
          <p>Cadastre e acompanhe os membros da biblioteca.</p>
        </div>

        <button className="btn-novo" onClick={abrirCriacao}>
          + Novo Membro
        </button>
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

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>CPF</th>
              <th>E-mail</th>
              <th>Telefone</th>
              <th>Livros</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>

          <tbody>
            {membrosFiltrados.map((membro) => (
              <tr key={membro.idUsuario}>
                <td>{membro.nome}</td>
                <td>{membro.cpf}</td>
                <td>{membro.email}</td>
                <td>{membro.telefone}</td>
                <td className="col-livros">{membro.livros}</td>
                <td>
                  <span className={membro.status === "Ativo" ? "badge-ativo" : "badge-inativo"}>
                    {membro.status}
                  </span>
                </td>

                <td className="acoes">
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
        maxCPFLength={maxCPFLength}
        onChange={handleChange}
        onClose={fecharModal}
        onSave={handleSalvar}
      />
    </div>
  );
}
