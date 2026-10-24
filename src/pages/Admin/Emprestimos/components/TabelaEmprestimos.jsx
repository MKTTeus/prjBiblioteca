import { FiBookOpen, FiUser, FiCalendar, FiRefreshCw, FiCheckCircle } from "react-icons/fi";
import EmprestimoRow from "./EmprestimoRow";
import Pagination from "../../../../components/Pagination/Pagination";
import usePagination from "../../../../hooks/usePagination";
import { formatarData, getStatusEmprestimo, getStatusVisual } from "../utils";
import { formatarCPF } from "../../../../utils/masks";

function EmprestimoMobileCard({ emprestimo, usuario, exemplar, onDevolver, onRenovar }) {
  const statusVisual = getStatusVisual(emprestimo);
  const status = getStatusEmprestimo(emprestimo);
  const podeAgir = status === "ativo" || status === "atrasado";
  const isAluno = usuario?.tipo === "Aluno";
  const documento = usuario?.documento
    ? isAluno ? usuario.documento : formatarCPF(usuario.documento)
    : "-";

  return (
    <article className="emp-mobile-card">
      <div className="emp-mobile-card-heading">
        <h3>Empréstimo #{emprestimo.idEmprestimo || "-"}</h3>
        <span className={`emp-status ${statusVisual.classe}`}>
          {statusVisual.icone}{statusVisual.texto}
        </span>
      </div>
      <div className="emp-mobile-card-main">
        <div className="emp-mobile-card-entity">
          <span className="emp-mobile-card-icon" aria-hidden="true"><FiUser /></span>
          <div>
            <strong>{usuario?.nome || emprestimo.usuario || "Usuário não informado"}</strong>
            <small>{emprestimo.usuarioTipo === "Professor" ? "Professor" : `${isAluno ? "RA" : "CPF"}: ${documento}`}</small>
          </div>
        </div>
        <div className="emp-mobile-card-entity">
          <span className="emp-mobile-card-icon" aria-hidden="true"><FiBookOpen /></span>
          <div>
            <strong>{exemplar?.nome || emprestimo.titulo || "Livro não informado"}</strong>
            <small>Tombo: {exemplar?.tombo || emprestimo.codigo || "-"}</small>
            <small>ISBN: {exemplar?.isbn || exemplar?.exeLivISBN || emprestimo.isbn || "-"}</small>
          </div>
        </div>
      </div>
      <div className="emp-mobile-card-dates">
        <div><FiCalendar aria-hidden="true" /><span>Emprestado em</span><strong>{formatarData(emprestimo.empLiv_DataEmprestimo)}</strong></div>
        <div><FiCalendar aria-hidden="true" /><span>Devolver até</span><strong>{formatarData(emprestimo.empLiv_DataPrevistaDevolucao)}</strong></div>
      </div>
      {podeAgir && (
        <div className="emp-mobile-card-actions">
          <button type="button" onClick={() => onRenovar(emprestimo)}><FiRefreshCw /> Renovar</button>
          <button type="button" onClick={() => onDevolver(emprestimo)}><FiCheckCircle /> Devolver</button>
        </div>
      )}
    </article>
  );
}

export default function TabelaEmprestimos({
  emprestimos,
  mapUsuarios,
  mapExemplares,
  onDevolver,
  onRenovar,
}) {
  const { paginaAtual, totalPaginas, paginaItens, irParaPagina } = usePagination(emprestimos);

  return (
    <div className="emp-table-box emp-circulacao-lista">
      <div className="emp-table-header">
        <h2>Lista de Empréstimos</h2>
        <span className="emp-list-count">{emprestimos.length} {emprestimos.length === 1 ? "empréstimo" : "empréstimos"}</span>
      </div>

      <div className="emp-mobile-list" aria-label="Empréstimos">
        {emprestimos.length === 0 ? (
          <p className="emp-mobile-list-empty">Nenhum empréstimo encontrado para os filtros informados.</p>
        ) : paginaItens.map((emprestimo) => (
          <EmprestimoMobileCard
            key={`${emprestimo.idEmprestimo}-${emprestimo.idExemplar}`}
            emprestimo={emprestimo}
            usuario={mapUsuarios[emprestimo.idUsuario]}
            exemplar={mapExemplares[emprestimo.idExemplar]}
            onDevolver={onDevolver}
            onRenovar={onRenovar}
          />
        ))}
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
                <div className="emp-empty-table-content">
                  <span className="emp-empty-table-icon" aria-hidden="true"><FiBookOpen /></span>
                  <strong>Nenhum empréstimo encontrado</strong>
                  <span>Não há registros para os filtros informados.</span>
                </div>
              </td>
            </tr>
          ) : (
            paginaItens.map((emprestimo) => (
              <EmprestimoRow
                key={`${emprestimo.idEmprestimo}-${emprestimo.idExemplar}`}
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
