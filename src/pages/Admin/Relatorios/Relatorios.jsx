export const STATUS_OPTIONS = [
  { valor: "todos", label: "Todos" },
  { valor: "ativo", label: "Ativos" },
  { valor: "atrasado", label: "Em Atraso" },
  { valor: "devolvido", label: "Devolvidos" },
];

export const TIPO_USUARIO_OPTIONS = [
  { valor: "todos", label: "Todos" },
  { valor: "Aluno", label: "Alunos" },
  { valor: "Comunidade", label: "Comunidade" },
];

export const STATUS_LABEL = {
  ativo: "Ativo",
  atrasado: "Em atraso",
  devolvido: "Devolvido",
};

export function formatarData(data) {
  if (!data) return "-";
  const d = new Date(`${data}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("pt-BR");
}

export function linhasParaExport(itens) {
  return itens.map((item) => [
    item.usuario,
    item.usuarioTipo,
    item.titulo,
    item.isbn || "-",
    item.tombo || "-",
    formatarData(item.dataEmprestimo),
    formatarData(item.dataPrevistaDevolucao),
    formatarData(item.dataDevolucao),
    STATUS_LABEL[item.status] || item.status,
  ]);
}

export const COLUNAS_EXPORT = [
  "Usuário",
  "Tipo",
  "Livro",
  "ISBN",
  "Tombo",
  "Empréstimo",
  "Previsão Devolução",
  "Devolução",
  "Status",
];