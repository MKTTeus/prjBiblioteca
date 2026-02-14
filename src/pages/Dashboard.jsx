import "../styles/Dashboard.css";
import { FaBook, FaUsers, FaExchangeAlt, FaClock } from "react-icons/fa";

export default function Dashboard() {
  return (
    <div className="dashboard">
      <div className="header-dashboard">
        <h1>Bem-vindo ao Sistema de Biblioteca</h1>
        <p>
          Gerencie o acervo, empréstimos e cadastros da biblioteca escolar de forma simples e eficiente.
        </p>
      </div>

      <div className="cards">
        <div className="card">
          <div className="card-header">
            <span>Total de Livros</span>
            <div className="icon blue">
              <FaBook />
            </div>
          </div>
          <h2>2.847</h2>
          <small className="positive">+12 este mês</small>
        </div>

        <div className="card">
          <div className="card-header">
            <span>Alunos Cadastrados</span>
            <div className="icon green">
              <FaUsers />
            </div>
          </div>
          <h2>485</h2>
          <small className="positive">+8 novos</small>
        </div>

        <div className="card">
          <div className="card-header">
            <span>Empréstimos Ativos</span>
            <div className="icon orange">
              <FaExchangeAlt />
            </div>
          </div>
          <h2>127</h2>
          <small>15 hoje</small>
        </div>

        <div className="card">
          <div className="card-header">
            <span>Devoluções Pendentes</span>
            <div className="icon red">
              <FaClock />
            </div>
          </div>
          <h2>23</h2>
          <small className="danger">3 em atraso</small>
        </div>
      </div>
    </div>
  );
}
