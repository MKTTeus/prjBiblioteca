import React, { useEffect, useState } from "react";
import "./Admin.css";
import "../CadastroLivros/components/BookForm/BookFormModal.css";
import { Shield, UserCheck, UserX, Pencil, Trash2 } from "lucide-react";
import { getAdmins, createAdmin, updateAdmin, deleteAdmin } from "../../../services/api";
import { useToast } from "../../../contexts/ToastContext";
import ConfirmModal from "../../../components/ConfirmModal/ConfirmModal";
import SearchBar from "./components/SearchBar";
import AdminModal from "./components/AdminModal";
import StatsCard from "../../../components/StatsCard/StatsCard";

const EMPTY_ADMIN = {
  nome: "",
  senha: "",
  email: "",
  status: "Ativo",
};

export default function Admin() {
  const [modalAberto, setModalAberto] = useState(false);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [indexEditando, setIndexEditando] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [pesquisa, setPesquisa] = useState("");
  const [novoAdmin, setNovoAdmin] = useState(EMPTY_ADMIN);
  const [admins, setAdmins] = useState([]);
  const [pendingDeleteAdmin, setPendingDeleteAdmin] = useState(null);
  const { addToast } = useToast();

  useEffect(() => {
    async function fetchAdmins() {
      try {
        const data = await getAdmins();
        setAdmins(
          data.map((a) => ({
            idAdmin: a.idAdmin,
            nome: a.admNome,
            email: a.admEmail,
            livros: 0,
            status:
              typeof a.admStatus === "boolean"
                ? a.admStatus
                  ? "Ativo"
                  : "Inativo"
                : a.admStatus || "Ativo",
          }))
        );
      } catch (err) {
        console.error("Erro ao carregar administradores:", err);
      }
    }

    fetchAdmins();
  }, []);

  const handleChange = (e) => {
    setNovoAdmin((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setIsDirty(true);
  };

  const fecharModal = () => {
    setModalAberto(false);
    setModoEdicao(false);
    setIndexEditando(null);
    setNovoAdmin(EMPTY_ADMIN);
    setIsDirty(false);
  };

  const handleSalvar = async () => {
    if (!novoAdmin.nome || !novoAdmin.email) return;
    if (isProcessing) return;
    if (modoEdicao && !isDirty) return;

    setIsProcessing(true);

    try {
      if (modoEdicao && indexEditando != null) {
        const alvo = admins[indexEditando];
        const payload = {
          nome: novoAdmin.nome,
          email: novoAdmin.email,
          status: novoAdmin.status === "Ativo",
        };

        const updated = await updateAdmin(alvo.idAdmin, payload);
        setAdmins((prev) =>
          prev.map((admin, i) =>
            i === indexEditando
              ? {
                  ...admin,
                  nome: updated.admNome,
                  email: updated.admEmail,
                  status:
                    typeof updated.admStatus === "boolean"
                      ? updated.admStatus
                        ? "Ativo"
                        : "Inativo"
                      : updated.admStatus || novoAdmin.status,
                }
              : admin
          )
        );
        addToast("Informações atualizadas com sucesso", "success");
      } else {
        const created = await createAdmin({
          nome: novoAdmin.nome,
          senha: novoAdmin.senha,
          email: novoAdmin.email,
          status: novoAdmin.status === "Ativo",
        });

        setAdmins((prev) => [
          ...prev,
          {
            idAdmin: created.idAdmin,
            nome: created.admNome,
            senha: created.admSenha,
            email: created.admEmail,
            livros: 0,
            status:
              typeof created.admStatus === "boolean"
                ? created.admStatus
                  ? "Ativo"
                  : "Inativo"
                : created.admStatus || novoAdmin.status,
          },
        ]);
        addToast("Cadastro realizado com sucesso", "success");
      }

      fecharModal();
    } catch (err) {
      console.error("Erro ao salvar administrador:", err);
      addToast(modoEdicao ? "Falha ao atualizar as informações" : "Falha ao realizar o cadastro", "error");
    } finally {
      setTimeout(() => setIsProcessing(false), 600);
      setIsDirty(false);
    }
  };

  const abrirCriacao = () => {
    setNovoAdmin(EMPTY_ADMIN);
    setModoEdicao(false);
    setIndexEditando(null);
    setModalAberto(true);
    setIsDirty(false);
  };

  const abrirEdicao = (idAdmin) => {
    const index = admins.findIndex((admin) => admin.idAdmin === idAdmin);
    if (index === -1) return;

    const admin = admins[index];
    setNovoAdmin({
      nome: admin.nome || "",
      senha: "",
      email: admin.email || "",
      status: admin.status || "Ativo",
    });
    setIndexEditando(index);
    setModoEdicao(true);
    setModalAberto(true);
    setIsDirty(false);
  };

  const handleExcluir = (idAdmin) => {
    const target = admins.find((admin) => admin.idAdmin === idAdmin);
    setPendingDeleteAdmin(target || { idAdmin, nome: "este administrador" });
  };

  const confirmExcluirAdmin = async () => {
    if (!pendingDeleteAdmin) return;

    try {
      await deleteAdmin(pendingDeleteAdmin.idAdmin);
      setAdmins((prev) => prev.filter((admin) => admin.idAdmin !== pendingDeleteAdmin.idAdmin));
      addToast("Administrador excluído com sucesso", "success");
    } catch (err) {
      console.error("Erro ao excluir administrador:", err);
      addToast("Falha ao excluir o administrador", "error");
    } finally {
      setPendingDeleteAdmin(null);
    }
  };

  const handleToggleStatus = async (idAdmin) => {
    const index = admins.findIndex((admin) => admin.idAdmin === idAdmin);
    if (index === -1) return;

    try {
      const admin = admins[index];
      const novoStatus = admin.status === "Ativo" ? "Inativo" : "Ativo";
      const payload = {
        nome: admin.nome,
        email: admin.email,
        status: novoStatus === "Ativo",
      };
      await updateAdmin(admin.idAdmin, payload);

      setAdmins((prev) =>
        prev.map((item, i) =>
          i === index
            ? {
                ...item,
                status: novoStatus,
              }
            : item
        )
      );
    } catch (err) {
      console.error("Erro ao atualizar status:", err);
    }
  };

  const totalAdmins = admins.length;
  const adminsAtivos = admins.filter((a) => a.status === "Ativo").length;
  const adminsInativos = admins.filter((a) => a.status === "Inativo").length;
  const adminsFiltrados = admins.filter((admin) => {
    const termo = pesquisa.toLowerCase();
    return admin.nome.toLowerCase().includes(termo) || admin.email.toLowerCase().includes(termo);
  });

  return (
    <div className="admin-page">
      <div className="titulo">
        <div>
          <h1>Gestão de Administradores</h1>
          <p>Cadastre e acompanhe os administradores do sistema.</p>
        </div>

        <button className="btn-novo-admin" onClick={abrirCriacao}>
          + Novo Administrador
        </button>
      </div>

      <div className="stats-cards-grid stats-cards-grid-admin">
        <StatsCard
          title="Total de Administradores"
          value={totalAdmins}
          subtitle="Perfis com acesso total"
          icon={<Shield size={18} />}
          color="blue"
        />

        <StatsCard
          title="Administradores Ativos"
          value={adminsAtivos}
          subtitle="Com acesso liberado"
          icon={<UserCheck size={18} />}
          color="green"
        />

        <StatsCard
          title="Administradores Inativos"
          value={adminsInativos}
          subtitle="Com acesso suspenso"
          icon={<UserX size={18} />}
          color="red"
        />
      </div>

      <div className="topo-lista">
        <h2>Lista de Administradores</h2>
        <SearchBar
          value={pesquisa}
          onChange={setPesquisa}
          placeholder="Buscar por nome ou e-mail..."
        />
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Status</th>
              <th className="acoes-coluna">Ações</th>
            </tr>
          </thead>

          <tbody>
            {adminsFiltrados.map((admin) => (
              <tr key={admin.idAdmin}>
                <td>{admin.nome}</td>
                <td>{admin.email}</td>
                <td>
                  <span className={admin.status === "Ativo" ? "badge-ativo" : "badge-inativo"}>
                    {admin.status}
                  </span>
                </td>

                <td className="acoes-cell">
                  <div className="acoes">
                    <button className="btn-status" onClick={() => handleToggleStatus(admin.idAdmin)}>
                      {admin.status === "Ativo" ? (
                        <UserX size={16} className="icon-red" />
                      ) : (
                        <UserCheck size={16} className="icon-green" />
                      )}
                    </button>

                    <button className="btn-edit" onClick={() => abrirEdicao(admin.idAdmin)}>
                      <Pencil size={16} />
                    </button>

                    <button className="btn-delete" onClick={() => handleExcluir(admin.idAdmin)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AdminModal
        aberto={modalAberto}
        modoEdicao={modoEdicao}
        admin={novoAdmin}
        isProcessing={isProcessing}
        isDirty={isDirty}
        onChange={handleChange}
        onClose={fecharModal}
        onSave={handleSalvar}
      />

      <ConfirmModal
        show={Boolean(pendingDeleteAdmin)}
        title="Confirmar exclusão"
        message={
          pendingDeleteAdmin
            ? `Tem certeza que deseja excluir este administrador?`
            : "Tem certeza que deseja excluir este administrador?"
        }
        onConfirm={confirmExcluirAdmin}
        onCancel={() => setPendingDeleteAdmin(null)}
        confirmText="Excluir"
        cancelText="Cancelar"
      />
    </div>
  );
}
