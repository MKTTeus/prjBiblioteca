/**
 * resolverStatus — fonte única da verdade para o status visual de um empréstimo.
 *
 * Replica a mesma lógica que o admin usa em utils.js > getStatusEmprestimo:
 * ignora movStatus do banco e recalcula sempre pela data prevista de devolução.
 *
 * @param {object} loan — objeto retornado por GET /emprestimos
 * @returns {"pendente"|"ativo"|"atrasado"|"devolvido"|"negado"|string}
 */
export function resolverStatus(loan) {
  if (!loan) return "desconhecido";

  // Devolvido é definitivo
  if (loan.empLiv_Status === "Devolvido") return "devolvido";

  // Negado é definitivo
  if (loan.movStatus === "Negado" || loan.status === "negado") return "negado";

  // Expirado é definitivo — solicitação aprovada cujo prazo de retirada
  // passou sem o aluno buscar o livro. Precisa vir ANTES do fallback de
  // "pendente" abaixo, senão fica preso como pendente pra sempre (movTipo
  // continua "SOLICITACAO" mesmo depois de expirado).
  if (loan.movStatus === "Expirado" || loan.status === "expirado") return "expirado";

  // Aprovado: já aprovado pela biblioteca, aguardando confirmação/retirada
  if (
    loan.movStatus === "Aprovado" ||
    loan.status === "aprovado"
  ) return "aprovado";

  // Pendente: solicitação ainda não decidida pela biblioteca
  if (
    loan.movStatus === "Pendente" ||
    loan.status === "pendente"
  ) return "pendente";

  // Calcular atraso pela data prevista (mesma lógica do admin)
  if (loan.empLiv_DataPrevistaDevolucao) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const prevista = new Date(loan.empLiv_DataPrevistaDevolucao);
    prevista.setHours(0, 0, 0, 0);
    if (prevista < hoje) return "atrasado";
  }

  // Fallback: status que veio do backend
  return loan.status || "ativo";
}