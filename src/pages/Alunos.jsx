import React, { useState } from "react";
import "../styles/Alunos.css";
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

export default function Alunos() {
  const [modalAberto, setModalAberto] = useState(false);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [indexEditando, setIndexEditando] = useState(null);

  const [novoAluno, setNovoAluno] = useState({
    nome: "",
    ra: "",
    email: "",
    telefone: "",
    telefone2: "",
  });

  const [alunos, setAlunos] = useState([
    {
      nome: "Ana Silva Santos",
      ra: "RA2024001",
      email: "ana.silva@escola.com",
      livros: 2,
      status: "Ativo",
    },
    {
      nome: "Carlos Eduardo Lima",
      ra: "RA2024002",
      email: "carlos.lima@escola.com",
      livros: 1,
      status: "Ativo",
    },
    {
      nome: "Mariana Costa Oliveira",
      ra: "RA2024003",
      email: "mariana.costa@escola.com",
      livros: 0,
      status: "Inativo",
    },
  ]);

  const handleChange = (e) => {
    setNovoAluno({
      ...novoAluno,
      [e.target.name]: e.target.value,
    });
  };

  const handleSalvar = () => {
    if (!novoAluno.nome || !novoAluno.ra) return;

    if (modoEdicao) {
      const alunosAtualizados = alunos.map((aluno, i) =>
        i === indexEditando ? { ...aluno, ...novoAluno } : aluno
      );
      setAlunos(alunosAtualizados);
    } else {
      const alunoCriado = {
        ...novoAluno,
        livros: 0,
        status: "Ativo",
      };
      setAlunos([...alunos, alunoCriado]);
    }

    fecharModal();
  };

  const handleEditar = (index) => {
    setNovoAluno(alunos[index]);
    setIndexEditando(index);
    setModoEdicao(true);
    setModalAberto(true);
  };

  const handleExcluir = (index) => {
    const novosAlunos = alunos.filter((_, i) => i !== index);
    setAlunos(novosAlunos);
  };

  const handleToggleStatus = (index) => {
    const novosAlunos = alunos.map((aluno, i) => {
      if (i === index) {
        return {
          ...aluno,
          status: aluno.status === "Ativo" ? "Inativo" : "Ativo",
        };
      }
      return aluno;
    });

    setAlunos(novosAlunos);
  };

  const fecharModal = () => {
    setModalAberto(false);
    setModoEdicao(false);
    setIndexEditando(null);
    setNovoAluno({
      nome: "",
      ra: "",
      email: "",
      telefone: "",
      telefone2: "",
    });
  };

  const totalAlunos = alunos.length;
  const alunosAtivos = alunos.filter((a) => a.status === "Ativo").length;
  const alunosInativos = alunos.filter((a) => a.status === "Inativo").length;
  const totalLivros = alunos.reduce((acc, aluno) => acc + aluno.livros, 0);

  return (
    <div className="aluno-page">
      <div className="titulo">
        <div>
          <h1>Gestão de Alunos</h1>
          <p>Cadastre e acompanhe os alunos da biblioteca.</p>
        </div>

        <button
          className="btn-novo"
          onClick={() => setModalAberto(true)}
        >
          + Novo Aluno
        </button>
      </div>

      <div className="cards">
        <div className="card">
          <div className="card-top">
            <Users size={22} />
            <h2>{totalAlunos}</h2>
          </div>
          <span>Total de Alunos</span>
        </div>

        <div className="card">
          <div className="card-top">
            <UserCheck size={22} className="icon-green" />
            <h2>{alunosAtivos}</h2>
          </div>
          <span>Alunos Ativos</span>
        </div>

        <div className="card">
          <div className="card-top">
            <UserX size={22} className="icon-red" />
            <h2>{alunosInativos}</h2>
          </div>
          <span>Alunos Inativos</span>
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
        <h2>Lista de Alunos</h2>
        <div>
          <CiSearch />
          <input
            type="text"
            placeholder="Pesquisar aluno..."
            className="input-pesquisa"
          />
        </div>
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
            {alunos.map((aluno, index) => (
              <tr key={index}>
                <td>{aluno.nome}</td>
                <td>{aluno.ra}</td>
                <td>{aluno.email}</td>
                <td>{aluno.livros}</td>
                <td>
                  <span
                    className={
                      aluno.status === "Ativo"
                        ? "badge-ativo"
                        : "badge-inativo"
                    }
                  >
                    {aluno.status}
                  </span>
                </td>

                <td className="acoes">
                  <button
                    className="btn-status"
                    onClick={() => handleToggleStatus(index)}
                  >
                    {aluno.status === "Ativo" ? (
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
                  {modoEdicao
                    ? "Editar Aluno"
                    : "Cadastrar Novo Aluno"}
                </h2>
                <p>
                  {modoEdicao
                    ? "Altere as informações do aluno."
                    : "Preencha os dados para cadastrar um novo aluno no sistema."}
                </p>
              </div>

              <button onClick={fecharModal}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-form">
              <div className="form-group">
                <label>Nome Completo *</label>
                <input
                  name="nome"
                  value={novoAluno.nome}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>RA *</label>
                <input
                  name="ra"
                  value={novoAluno.ra}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>E-mail</label>
                <input
                  name="email"
                  value={novoAluno.email}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Telefone</label>
                <input
                  name="telefone"
                  value={novoAluno.telefone}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Telefone 2</label>
                <input
                  name="telefone2"
                  value={novoAluno.telefone2}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="modal-actions">
              <button
                className="btn-cancelar"
                onClick={fecharModal}
              >
                Cancelar
              </button>

              <button
                className="btn-criar"
                onClick={handleSalvar}
              >
                {modoEdicao ? "Salvar Alterações" : "Criar Usuário"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}