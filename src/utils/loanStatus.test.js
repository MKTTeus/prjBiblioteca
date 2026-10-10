import { resolverStatus, dataBiblioteca } from './loanStatus';
test('usa a data de São Paulo inclusive na virada UTC', () => {
  expect(dataBiblioteca(new Date('2026-10-08T01:00:00Z'))).toBe('2026-10-07');
});
test('devolução parcial é determinada pela cópia e não pela movimentação', () => {
  expect(resolverStatus({movStatus:'Ativo',itemStatus:'Devolvido',status:'devolvido',dataDevolucao:'2026-10-07'})).toBe('devolvido');
  expect(resolverStatus({movStatus:'Ativo',itemStatus:'Ativo',status:'atrasado'})).toBe('atrasado');
});
test.each(['Pendente','Aprovado','Negado','Expirado'])('prazo antigo não muda o estado %s', movStatus => {
  expect(resolverStatus({movStatus,empLiv_DataPrevistaDevolucao:'2000-01-01'})).toBe(movStatus.toLowerCase());
});
