import { FiPlus } from "react-icons/fi";

export default function HeaderEmprestimos({
  title = "Empréstimos e Devoluções",
  subtitle = "Gerencie empréstimos, devoluções e renovações",
  actionLabel = "Novo Empréstimo",
  onNovoEmprestimo,
}) {
  return (
    <div className="emp-header">
      <div className="emp-header-copy">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>

      {onNovoEmprestimo ? (
        <div className="emp-header-actions">
          <button onClick={onNovoEmprestimo} className="emp-btn-primary">
            <FiPlus />
            {actionLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
}
