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

// ── Relatório: Usuários com atraso/inadimplentes ──────────────────
export function linhasParaExportAtrasos(itens) {
  return itens.map((item) => [
    item.usuario,
    item.usuarioTipo,
    item.contato || "-",
    item.titulo,
    item.tombo || "-",
    formatarData(item.dataPrevistaDevolucao),
    item.diasAtraso,
  ]);
}

export const COLUNAS_EXPORT_ATRASOS = [
  "Usuário",
  "Tipo",
  "Contato",
  "Livro",
  "Tombo",
  "Previsão Devolução",
  "Dias em Atraso",
];

// ── Relatório: Acervo por categoria/gênero/autor/editora ───────────
export const AGRUPADOR_OPTIONS = [
  { valor: "categoria", label: "Categoria" },
  { valor: "genero", label: "Gênero" },
  { valor: "autor", label: "Autor" },
  { valor: "editora", label: "Editora" },
];

const LABEL_AGRUPADOR = {
  categoria: "Categoria",
  genero: "Gênero",
  autor: "Autor",
  editora: "Editora",
};

export function linhasParaExportAcervo(itens) {
  return itens.map((item) => [
    item.grupo,
    item.quantidadeLivros,
    item.quantidadeExemplares,
    item.quantidadeDisponiveis,
    item.quantidadeEmprestados,
  ]);
}

export function colunasExportAcervo(agrupador) {
  return [
    LABEL_AGRUPADOR[agrupador] || "Categoria",
    "Títulos",
    "Exemplares (cópias)",
    "Disponíveis",
    "Emprestados",
  ];
}