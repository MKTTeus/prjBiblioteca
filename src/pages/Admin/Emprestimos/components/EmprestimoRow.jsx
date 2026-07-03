import { formatarData, getStatusEmprestimo, getStatusVisual } from "../utils";
import { formatarCPF } from "../../../../utils/masks";

export default function EmprestimoRow({ emprestimo, usuario, exemplar, onDevolver, onRenovar }) {
  const statusVisual = getStatusVisual(emprestimo);
  const nome = exemplar?.nome || emprestimo.titulo || "-";
  const tombo = exemplar?.tombo || emprestimo.codigo || "-";
  const isbn = exemplar?.isbn || exemplar?.exeLivISBN || emprestimo.isbn || "-";
  const isAluno = usuario?.tipo === "Aluno";
  const documento = usuario?.documento
    ? isAluno
      ? usuario.documento
      : formatarCPF(usuario.documento)
    : "-";

  return (
    <tr>
      <td className="emp-id-cell">{emprestimo.idEmprestimo}</td>

      <td className="emp-main-cell">
        <strong>{usuario?.nome || "-"}</strong>
        <small>{isAluno ? "RA" : "CPF"}: {documento}</small>
      </td>

      <td className="emp-main-cell">
        <strong>{nome}</strong>
        <small>ISBN: {isbn}</small>
        <small>Tombo: {tombo}</small>
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
  <div className="emp-actions">
    <button
      type="button"
      className="emp-btn-light"
      onClick={() => onRenovar(emprestimo.idEmprestimo)}
    >
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
  </div>
</td>
    </tr>
  );
}
