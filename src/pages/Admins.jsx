import React, { useEffect, useState } from "react";
import "../styles/Admins.css";
import { CiSearch } from "react-icons/ci";
import {
  Shield,
  UserCheck,
  UserX,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { getAdmins, createAdmin, updateAdmin, deleteAdmin } from "../services/api";

export default function Admin() {
  const [modalAberto, setModalAberto] = useState(false);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [indexEditando, setIndexEditando] = useState(null);
  const [pesquisa, setPesquisa] = useState("");

  const [novoAdmin, setNovoAdmin] = useState({
    nome: "",
    senha: "",
    email: "",
    status: "Ativo",
  });

 const [admins, setAdmins] = useState([]);

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
        console.error("Erro ao carregar admins:", err);
      }
    }
    fetchAdmins();
  }, []);
  const fecharModal = () => {
    setModalAberto(false);
    setModoEdicao(false);
    setIndexEditando(null);
    setNovoAdmin({ nome: "", senha: "", email: "", status: "Ativo"});
  };

  const handleChange = (e) => {
    setNovoAdmin({ ...novoAdmin, [e.target.name]: e.target.value });
  };

  const handleSalvar = async () => {
    if (!novoAdmin.nome || !novoAdmin.email) return;

    try {
      if (modoEdicao && indexEditando != null) {
        const alvo = admins[indexEditando];
        const payload = {
          nome: novoAdmin.nome,
          email: novoAdmin.email,
          status: novoAdmin.status,
        };
        const updated = await updateAdmin(alvo.idAdmin, payload);
        const atualizados = admins.map((admin, i) =>
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
        );
        setAdmins(atualizados);
      } else {
        const created = await createAdmin({
          nome: novoAdmin.nome,
          senha: novoAdmin.senha,
          email: novoAdmin.email,
          status: novoAdmin.status,
        });
        setAdmins([
          ...admins,
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
      }
      fecharModal();
    } catch (err) {
      console.error("Erro ao salvar admin:", err);
    }
  };

 const handleEditar = (index) => {
    const a = admins[index];
    setNovoAdmin({
      nome: a.nome,
      senha: "",  
      email: a.email,
      status: a.status || "Ativo",
    });
    setIndexEditando(index);
    setModoEdicao(true);
    setModalAberto(true);
  };
  const handleExcluir = async (index) => {
    const alvo = admins[index];
    try {
      await deleteAdmin(alvo.idAdmin);
      setAdmins(admins.filter((_, i) => i !== index));
    } catch (err) {
      console.error("Erro ao excluir admin:", err);
    }
  };

  const handleToggleStatus = async (index) => {
    try {
      const admin = admins[index];
      const novoStatus = admin.status === "Ativo" ? "Inativo" : "Ativo";
      const payload = {
        nome: admin.nome,
        email: admin.email,
        status: novoStatus,
      };
      await updateAdmin(admin.idAdmin, payload);
      const atualizados = admins.map((a, i) =>
        i === index
          ? {
              ...a,
              status: novoStatus,
            }
          : a
      );
      setAdmins(atualizados);
    } catch (err) {
      console.error("Erro ao atualizar status:", err);
    }
  };

  const adminsFiltrados = admins.filter((admin) =>
    admin.nome.toLowerCase().includes(pesquisa.toLowerCase())
  );

  const totalAdmins = admins.length;
  const adminsAtivos = admins.filter((a) => a.status === "Ativo").length;
  const adminsInativos = admins.filter((a) => a.status === "Inativo").length;

  return (
    <div className="admin-page">
      <div className="titulo">
        <div>
          <h1>Gestão de Admins</h1>
          <p>Cadastre e acompanhe os administradores do sistema.</p>
        </div>

        <button className="btn-novo" onClick={() => setModalAberto(true)}>
          + Novo Admin
        </button>
      </div>

      <div className="cards">
        <div className="card">
          <div className="card-top">
            <Shield size={22} className="icon-blue" />
            <h2>{totalAdmins}</h2>
          </div>
          <span>Total de Admins</span>
        </div>

        <div className="card">
          <div className="card-top">
            <UserCheck size={22} className="icon-green" />
            <h2>{adminsAtivos}</h2>
          </div>
          <span>Admins Ativos</span>
        </div>

        <div className="card">
          <div className="card-top">
            <UserX size={22} className="icon-red" />
            <h2>{adminsInativos}</h2>
          </div>
          <span>Admins Inativos</span>
        </div>
      </div>

      <div className="topo-lista">
        <h2>Lista de Admins</h2>
        <div className="search-wrapper">
          <CiSearch />
          <input
            type="text"
            placeholder="Pesquisar Admin..."
            className="input-pesquisa"
            value={pesquisa}
            onChange={(e) => setPesquisa(e.target.value)}
          />
        </div>
      </div>

      <div className="table-container">
        <table>
<thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>

          <tbody>
            {adminsFiltrados.map((admin, index) => (
              <tr key={index}>
                <td>{admin.nome}</td>
                <td>{admin.email}</td>
                <td>
                  <span
                    className={
                      admin.status === "Ativo"
                        ? "badge-ativo"
                        : "badge-inativo"
                    }
                  >
                    {admin.status}
                  </span>
                </td>

                <td className="acoes">
                  <button
                    className="btn-status"
                    onClick={() => handleToggleStatus(index)}
                  >
                    {admin.status === "Ativo" ? (
                      <UserX size={16} className="icon-red" />
                    ) : (
                      <UserCheck size={16} className="icon-green" />
                    )}
                  </button>

                  <button
                    className="btn-edit"
                    onClick={() => handleEditar(index)}
                  >
                    <Pencil size={16} />
                  </button>

                  <button
                    className="btn-delete"
                    onClick={() => handleExcluir(index)}
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalAberto && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <div>
                <h2>
                  {modoEdicao ? "Editar Admin" : "Cadastrar Novo Admin"}
                </h2>
              </div>

              <button onClick={fecharModal}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-form">
              <div className="form-group">
                <label>Nome *</label>
                <input
                  name="nome"
                  value={novoAdmin.nome}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Senha *</label>
                <input
                  type="password"
                  name="senha"
                  value={novoAdmin.senha}
                  onChange={handleChange}
                  disabled={modoEdicao}
                />
              </div>

              <div className="form-group">
                <label>E-mail</label>
                <input
                  name="email"
                  value={novoAdmin.email}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Status</label>
                <select
                  name="status"
                  value={novoAdmin.status}
                  onChange={handleChange}
                >
                  <option value="Ativo">Ativo</option>
                  <option value="Inativo">Inativo</option>
                </select>
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn-cancelar" onClick={fecharModal}>
                Cancelar
              </button>

              <button className="btn-criar" onClick={handleSalvar}>
                {modoEdicao ? "Salvar Alterações" : "Criar Admin"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}