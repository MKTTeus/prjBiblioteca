import EmprestimoRow from "./EmprestimoRow";
import Pagination from "../../../../components/Pagination/Pagination";
import usePagination from "../../../../hooks/usePagination";

export default function TabelaEmprestimos({
  emprestimos,
  mapUsuarios,
  mapExemplares,
  onDevolver,
  onRenovar,
}) {
  const { paginaAtual, totalPaginas, paginaItens, irParaPagina } = usePagination(emprestimos);

  return (
    <div className="emp-table-box">
      <div className="emp-table-header">
        <h2>Lista de Empréstimos</h2>
      </div>

      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Aluno</th>
            <th>Livro</th>
            <th>Empréstimo</th>
            <th>Vencimento</th>
            <th>Status</th>
            <th>Ações</th>
          </tr>
        </thead>

        <tbody>
          {emprestimos.length === 0 ? (
            <tr>
              <td colSpan="7" className="emp-empty-table">
                Nenhum empréstimo encontrado para os filtros informados.
              </td>
            </tr>
          ) : (
            paginaItens.map((emprestimo) => (
              <EmprestimoRow
                key={emprestimo.idEmprestimo}
                emprestimo={emprestimo}
                usuario={mapUsuarios[emprestimo.idUsuario]}
                exemplar={mapExemplares[emprestimo.idExemplar]}
                onDevolver={onDevolver}
                onRenovar={onRenovar}
              />
            ))
          )}
        </tbody>
      </table>

      <Pagination
        paginaAtual={paginaAtual}
        totalPaginas={totalPaginas}
        onChange={irParaPagina}
        totalItens={emprestimos.length}
      />
    </div>
  );
}
