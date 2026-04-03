import { formatarData, getStatusEmprestimo, getStatusVisual } from "../utils";

export default function EmprestimoRow({ emprestimo, usuario, exemplar, onDevolver }) {
  const statusVisual = getStatusVisual(emprestimo);
  const isbn = exemplar?.isbn || exemplar?.exeLivISBN || exemplar?.livISBN || "-";

  return (
    <tr>
      <td className="emp-id-cell">{emprestimo.idEmprestimo}</td>

      <td className="emp-main-cell">
        <strong>{usuario?.nome || "-"}</strong>
        <small>{usuario?.tipo === "Aluno" ? "RA" : "CPF"}: {usuario?.documento || "-"}</small>
      </td>

      <td className="emp-main-cell">
        <strong>{exemplar?.nome || "-"}</strong>
        <small>ISBN: {isbn}</small>
        <small>Tombo: {exemplar?.tombo || "-"}</small>
      </td>

      <td>{formatarData(emprestimo.empLiv_DataEmprestimo)}</td>
      <td>{formatarData(emprestimo.empLiv_DataPrevistaDevolucao)}</td>

      <td>
        <span className={`emp-status ${statusVisual.classe}`}>
          {statusVisual.icone}
          {statusVisual.texto}
        </span>
      </td>

      <td className="emp-actions-cell">
        <button type="button" className="emp-btn-light">
          Renovar
        </button>

        {getStatusEmprestimo(emprestimo) !== "devolvido" && (
          <button
            type="button"
            className="emp-btn-light"
            onClick={() => onDevolver(emprestimo.idEmprestimo)}
          >
            Devolver
          </button>
        )}
      </td>
    </tr>
  );
}
