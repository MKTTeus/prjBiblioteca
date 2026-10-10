export function dataBiblioteca(referencia = new Date()) {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(referencia);
}

export function resolverStatus(loan) {
  if (!loan) return 'desconhecido';
  if (loan.dataDevolucao || loan.empLiv_DataDevolucao || String(loan.itemStatus || loan.empLiv_Status).toLowerCase() === 'devolvido') return 'devolvido';
  const informado = String(loan.status || loan.itemStatus || loan.movStatus || '').toLowerCase();
  if (['negado','expirado','aprovado','pendente','atrasado','devolvido'].includes(informado)) return informado;
  const prevista = loan.empLiv_DataPrevistaDevolucao || loan.dataPrevistaDevolucao;
  if (prevista && String(prevista).slice(0,10) < dataBiblioteca()) return 'atrasado';
  return informado || 'ativo';
}
