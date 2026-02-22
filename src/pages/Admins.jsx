import React, { useState } from "react";
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

export default function Admin() {
  const [modalAberto, setModalAberto] = useState(false);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [indexEditando, setIndexEditando] = useState(null);
  const [pesquisa, setPesquisa] = useState("");

  const [novoAdmin, setNovoAdmin] = useState({
    nome: "",
    cpf: "",
    email: "",
    telefone: "",
  });

  const [admins, setAdmins] = useState([
    {
      nome: "Gabriel Oliveira",
      cpf: "321.654.987-00",
      email: "gabriel@admin.com",
      telefone: "(11) 99999-1111",
      livros: 0,
      status: "Ativo",
    },
    {
      nome: "Camila Rodrigues",
      cpf: "789.456.123-88",
      email: "camila@admin.com",
      telefone: "(11) 98888-2222",
      livros: 0,
      status: "Ativo",
    },
  ]);

  const fecharModal = () => {
    setModalAberto(false);
    setModoEdicao(false);
    setIndexEditando(null);
    setNovoAdmin({ nome: "", cpf: "", email: "", telefone: "" });
  };

  const handleChange = (e) => {
    setNovoAdmin({ ...novoAdmin, [e.target.name]: e.target.value });
  };

  const handleSalvar = () => {
    if (!novoAdmin.nome || !novoAdmin.cpf) return;

    if (modoEdicao) {
      const atualizados = admins.map((admin, i) =>
        i === indexEditando ? { ...admin, ...novoAdmin } : admin
      );
      setAdmins(atualizados);
    } else {
      setAdmins([
        ...admins,
        { ...novoAdmin, livros: 0, status: "Ativo" },
      ]);
    }

    fecharModal();
  };

  const handleEditar = (index) => {
    setNovoAdmin(admins[index]);
    setIndexEditando(index);
    setModoEdicao(true);
    setModalAberto(true);
  };

  const handleExcluir = (index) => {
    setAdmins(admins.filter((_, i) => i !== index));
  };

  const handleToggleStatus = (index) => {
    const atualizados = admins.map((admin, i) =>
      i === index
        ? {
            ...admin,
            status: admin.status === "Ativo" ? "Inativo" : "Ativo",
          }
        : admin
    );
    setAdmins(atualizados);
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
              <th>CPF</th>
              <th>E-mail</th>
              <th>Telefone</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>

          <tbody>
            {adminsFiltrados.map((admin, index) => (
              <tr key={index}>
                <td>{admin.nome}</td>
                <td>{admin.cpf}</td>
                <td>{admin.email}</td>
                <td>{admin.telefone}</td>
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
                <label>CPF *</label>
                <input
                  name="cpf"
                  value={novoAdmin.cpf}
                  onChange={handleChange}
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
                <label>Telefone</label>
                <input
                  name="telefone"
                  value={novoAdmin.telefone}
                  onChange={handleChange}
                />
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