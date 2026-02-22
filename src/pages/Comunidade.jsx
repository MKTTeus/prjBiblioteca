import React, { useState } from "react";
import "../styles/Comunidade.css";
import { CiSearch } from "react-icons/ci";
import {
  Users,
  UserCheck,
  UserX,
  BookOpen,
  Pencil,
  Trash2,
  X,
} from "lucide-react";

export default function Membros() {
  const [modalAberto, setModalAberto] = useState(false);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [indexEditando, setIndexEditando] = useState(null);
  const [pesquisa, setPesquisa] = useState("");

  const [novoMembro, setNovoMembro] = useState({
    nome: "",
    cpf: "",
    email: "",
    telefone: "",
    telefone2: "",
  });

  const [membros, setMembros] = useState([
    {
      nome: "Lucas Almeida Rocha",
      cpf: "123.456.789-10",
      email: "lucas.rocha@escola.com",
      telefone: "(11) 98888-1111",
      telefone2: "(11) 97777-2222",
      livros: 3,
      status: "Ativo",
    },
    {
      nome: "Fernanda Souza Martins",
      cpf: "987.654.321-00",
      email: "fernanda.martins@escola.com",
      telefone: "(11) 96666-3333",
      telefone2: "(11) 95555-4444",
      livros: 0,
      status: "Inativo",
    },
    {
      nome: "Rafael Henrique Costa",
      cpf: "456.123.789-55",
      email: "rafael.costa@escola.com",
      telefone: "(11) 94444-5555",
      telefone2: "(11) 93333-6666",
      livros: 1,
      status: "Ativo",
    },
  ]);

  const fecharModal = () => {
    setModalAberto(false);
    setModoEdicao(false);
    setIndexEditando(null);
    setNovoMembro({
      nome: "",
      cpf: "",
      email: "",
      telefone: "",
      telefone2: "",
    });
  };

  const handleChange = (e) => {
    setNovoMembro({
      ...novoMembro,
      [e.target.name]: e.target.value,
    });
  };

  const handleSalvar = () => {
    if (!novoMembro.nome || !novoMembro.cpf) return;

    if (modoEdicao) {
      const membrosAtualizados = membros.map((membro, i) =>
        i === indexEditando ? { ...membro, ...novoMembro } : membro
      );
      setMembros(membrosAtualizados);
    } else {
      const membroCriado = {
        ...novoMembro,
        livros: 0,
        status: "Ativo",
      };
      setMembros([...membros, membroCriado]);
    }

    fecharModal();
  };

  const handleEditar = (index) => {
    setNovoMembro(membros[index]);
    setIndexEditando(index);
    setModoEdicao(true);
    setModalAberto(true);
  };

  const handleExcluir = (index) => {
    setMembros(membros.filter((_, i) => i !== index));
  };

  const handleToggleStatus = (index) => {
    const novos = membros.map((membro, i) =>
      i === index
        ? {
            ...membro,
            status: membro.status === "Ativo" ? "Inativo" : "Ativo",
          }
        : membro
    );
    setMembros(novos);
  };

  const membrosFiltrados = membros.filter((membro) =>
    membro.nome.toLowerCase().includes(pesquisa.toLowerCase())
  );

  const totalMembros = membros.length;
  const membrosAtivos = membros.filter((a) => a.status === "Ativo").length;
  const membrosInativos = membros.filter((a) => a.status === "Inativo").length;
  const totalLivros = membros.reduce((acc, m) => acc + m.livros, 0);

  return (
    <div className="comunidade-page">
      <div className="titulo">
        <div>
          <h1>Gestão de Comunidade</h1>
          <p>Cadastre e acompanhe os membros da biblioteca.</p>
        </div>

        <button className="btn-novo" onClick={() => setModalAberto(true)}>
          + Novo Membro
        </button>
      </div>

      <div className="cards">
        <div className="card">
          <div className="card-top">
            <Users size={22} />
            <h2>{totalMembros}</h2>
          </div>
          <span>Total de Membros</span>
        </div>

        <div className="card">
          <div className="card-top">
            <UserCheck size={22} className="icon-green" />
            <h2>{membrosAtivos}</h2>
          </div>
          <span>Membros Ativos</span>
        </div>

        <div className="card">
          <div className="card-top">
            <UserX size={22} className="icon-red" />
            <h2>{membrosInativos}</h2>
          </div>
          <span>Membros Inativos</span>
        </div>

        <div className="card">
          <div className="card-top">
            <BookOpen size={22} className="icon-orange" />
            <h2>{totalLivros}</h2>
          </div>
          <span>Livros Emprestados</span>
        </div>
      </div>

      <div className="topo-lista">
        <h2>Lista de Membros</h2>
        <div className="search-wrapper">
          <CiSearch />
          <input
            type="text"
            placeholder="Pesquisar membro..."
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
              <th>Livros</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>

          <tbody>
            {membrosFiltrados.map((membro, index) => (
              <tr key={index}>
                <td>{membro.nome}</td>
                <td>{membro.cpf}</td>
                <td>{membro.email}</td>
                <td>{membro.telefone}</td>
                <td className="col-livros">{membro.livros}</td>
                <td>
                  <span
                    className={
                      membro.status === "Ativo"
                        ? "badge-ativo"
                        : "badge-inativo"
                    }
                  >
                    {membro.status}
                  </span>
                </td>

                <td className="acoes">
                  <button
                    className="btn-status"
                    onClick={() => handleToggleStatus(index)}
                  >
                    {membro.status === "Ativo" ? (
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
                  {modoEdicao ? "Editar Membro" : "Cadastrar Novo Membro"}
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
                  value={novoMembro.nome}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>CPF *</label>
                <input
                  name="cpf"
                  value={novoMembro.cpf}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>E-mail</label>
                <input
                  name="email"
                  value={novoMembro.email}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Telefone</label>
                <input
                  name="telefone"
                  value={novoMembro.telefone}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn-cancelar" onClick={fecharModal}>
                Cancelar
              </button>

              <button className="btn-criar" onClick={handleSalvar}>
                {modoEdicao ? "Salvar Alterações" : "Criar Membro"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}