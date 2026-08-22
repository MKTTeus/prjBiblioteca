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
    item.turma || "-",
    item.serie || "-",
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
  "Turma",
  "Série",
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
    item.turma || "-",
    item.serie || "-",
    item.contato || "-",
    item.titulo,
    item.tombo || "-",
    formatarData(item.dataPrevistaDevolucao),
    item.situacao === "devolvido_em_atraso" ? formatarData(item.dataDevolucao) : "-",
    item.diasAtraso,
  ]);
}

export const COLUNAS_EXPORT_ATRASOS = [
  "Usuário",
  "Tipo",
  "Turma",
  "Série",
  "Contato",
  "Livro",
  "Tombo",
  "Previsão Devolução",
  "Devolvido em",
  "Dias em Atraso",
];

// ── Ranking (agrupamentos: por aluno, turma, série ou livro) ──────
export const AGRUPADOR_EMPRESTIMOS_OPTIONS = [
  { valor: "", label: "Nenhum (lista detalhada)" },
  { valor: "usuario", label: "Por aluno — quem mais empresta" },
  { valor: "turma", label: "Por turma" },
  { valor: "serie", label: "Por série" },
  { valor: "livro", label: "Por livro — mais emprestados" },
];

export const AGRUPADOR_ATRASOS_OPTIONS = [
  { valor: "", label: "Nenhum (lista detalhada)" },
  { valor: "usuario", label: "Por aluno — reincidentes" },
  { valor: "turma", label: "Por turma" },
];

// ── Relatório: Empréstimos por mês (dentro de um ano letivo) ──────
export const MESES_LABEL = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export function anosLetivosPadrao(anoAtualExtra) {
  const anoAtual = new Date().getFullYear();
  const anos = new Set([anoAtual, anoAtual - 1, anoAtual - 2, anoAtual - 3]);
  if (anoAtualExtra) anos.add(anoAtualExtra);
  return Array.from(anos).sort((a, b) => b - a);
}

export function linhasParaExportMensal(meses) {
  return meses.map((m) => [m.label, m.total, m.ativos, m.atrasados, m.devolvidos]);
}

export const COLUNAS_EXPORT_MENSAL = ["Mês", "Total", "Ativos", "Atrasados", "Devolvidos"];

export function linhasParaExportRankingEmprestimos(ranking) {
  return ranking.map((r) => [r.rotulo || "-", r.total, r.ativos, r.atrasados, r.devolvidos]);
}

export const COLUNAS_EXPORT_RANKING_EMPRESTIMOS = [
  "Item",
  "Total",
  "Ativos",
  "Atrasados",
  "Devolvidos",
];

export function linhasParaExportRankingAtrasos(ranking) {
  return ranking.map((r) => [r.rotulo || "-", r.ocorrencias, r.diasAtrasoTotal]);
}

export const COLUNAS_EXPORT_RANKING_ATRASOS = [
  "Item",
  "Ocorrências",
  "Dias de Atraso (total)",
];

// ── Relatório: Acervo por gênero/autor/editora ───────────
export const AGRUPADOR_OPTIONS = [
  { valor: "genero", label: "Gênero" },
  { valor: "autor", label: "Autor" },
  { valor: "editora", label: "Editora" },
];

const LABEL_AGRUPADOR = {
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
    LABEL_AGRUPADOR[agrupador] || "Gênero",
    "Títulos",
    "Exemplares (cópias)",
    "Disponíveis",
    "Emprestados",
  ];
}