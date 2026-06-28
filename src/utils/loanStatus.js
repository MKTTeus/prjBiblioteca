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

  // Pendente: solicitação ainda não aprovada
  if (
    loan.movStatus === "Pendente" ||
    loan.movTipo === "SOLICITACAO" ||
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