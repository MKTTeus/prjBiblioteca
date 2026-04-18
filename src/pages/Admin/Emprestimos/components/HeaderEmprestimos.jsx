import { FiPlus } from "react-icons/fi";

export default function HeaderEmprestimos({ onNovoEmprestimo }) {
  return (
    <div className="emp-header">
      <div className="emp-header-copy">
        <h1>Empréstimos e Devoluções</h1>
        <p>Gerencie empréstimos, devoluções e renovações</p>
      </div>

      <div className="emp-header-actions">
        <button onClick={onNovoEmprestimo} className="emp-btn-primary">
          <FiPlus />
          Novo Empréstimo
        </button>
      </div>
    </div>
  );
}
