import {
  FiAlertCircle,
  FiAlertTriangle,
  FiBookOpen,
  FiCalendar,
  FiCheckCircle,
} from "react-icons/fi";

export const FILTRO_STATUS_OPTIONS = [
  { valor: "todos", label: "Todos" },
  { valor: "ativo", label: "Ativos" },
  { valor: "atrasado", label: "Em Atraso" },
  { valor: "devolvido", label: "Devolvidos" },
];

export function formatarUsuarios(alunos = [], comunidade = []) {
  return [
    ...alunos.map((usuario) => ({
      id: usuario.idUsuario,
      nome: usuario.usuNome,
      tipo: "Aluno",
      documento: usuario.usuRA,
    })),
    ...comunidade.map((usuario) => ({
      id: usuario.idUsuario,
      nome: usuario.usuNome,
      tipo: "Comunidade",
      documento: usuario.usuCPF,
    })),
  ];
}

export function criarMapaPorId(itens = [], campoId = "id") {
  return itens.reduce((mapa, item) => {
    mapa[item[campoId]] = item;
    return mapa;
  }, {});
}

export function getStatusEmprestimo(emprestimo) {
  if (emprestimo.empLiv_Status === "Devolvido") return "devolvido";

  const hoje = new Date();
  const dataPrevista = new Date(emprestimo.empLiv_DataPrevistaDevolucao);

  if (dataPrevista < hoje) return "atrasado";

  return "ativo";
}

export function getStatusVisual(emprestimo) {
  const status = getStatusEmprestimo(emprestimo);

  if (status === "ativo") {
    return { texto: "Ativo", icone: <FiBookOpen />, classe: "ativo" };
  }

  if (status === "atrasado") {
    return { texto: "Em atraso", icone: <FiAlertCircle />, classe: "atrasado" };
  }

  return { texto: "Devolvido", icone: <FiCheckCircle />, classe: "devolvido" };
}

export function isMesmoDia(data, referencia = new Date()) {
  if (!data) return false;

  const valor = new Date(data);
  if (Number.isNaN(valor.getTime())) return false;

  return (
    valor.getFullYear() === referencia.getFullYear() &&
    valor.getMonth() === referencia.getMonth() &&
    valor.getDate() === referencia.getDate()
  );
}

export function calcularMetricas(emprestimos = []) {
  return {
    ativos: emprestimos.filter((item) => getStatusEmprestimo(item) === "ativo").length,
    atrasados: emprestimos.filter((item) => getStatusEmprestimo(item) === "atrasado").length,
    devolvidosHoje: emprestimos.filter((item) => isMesmoDia(item.empLiv_DataDevolucao)).length,
    renovacoes: emprestimos.reduce(
      (total, item) =>
        total +
        Number(item.empLiv_RenovacoesTotais || item.empLiv_QtdRenovacoes || item.renovacoes || 0),
      0
    ),
  };
}

export function criarCardsResumo(metricas) {
  return [
    {
      chave: "ativos",
      titulo: "Empréstimos Ativos",
      valor: metricas.ativos,
      icone: <FiBookOpen />,
      cor: "blue",
    },
    {
      chave: "atrasados",
      titulo: "Em Atraso",
      valor: metricas.atrasados,
      icone: <FiAlertTriangle />,
      cor: "red",
    },
    {
      chave: "devolvidos-hoje",
      titulo: "Devolvidos Hoje",
      valor: metricas.devolvidosHoje,
      icone: <FiCheckCircle />,
      cor: "green",
    },
    {
      chave: "renovacoes",
      titulo: "Renovações Totais",
      valor: metricas.renovacoes,
      icone: <FiCalendar />,
      cor: "orange",
    },
  ];
}

export function filtrarEmprestimos(emprestimos, busca, filtroStatus, mapUsuarios, mapExemplares) {
  const termoBusca = (busca || "").toLowerCase();

  return emprestimos.filter((emprestimo) => {
    const usuario = mapUsuarios[emprestimo.idUsuario];
    const exemplar = mapExemplares[emprestimo.idExemplar];

    const textoBusca = [
      emprestimo.idEmprestimo,
      usuario?.nome,
      usuario?.documento,
      usuario?.tipo,
      exemplar?.nome,
      exemplar?.tombo,
      exemplar?.isbn,
      exemplar?.exeLivISBN,
      exemplar?.livISBN,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const correspondeBusca = textoBusca.includes(termoBusca);
    const statusOk =
      filtroStatus === "todos" || getStatusEmprestimo(emprestimo) === filtroStatus;

    return correspondeBusca && statusOk;
  });
}

export function filtrarUsuarios(usuarios, buscaUsuario) {
  const termoBusca = (buscaUsuario || "").toLowerCase();
  return usuarios.filter((usuario) =>
    `${usuario.nome} ${usuario.documento} ${usuario.tipo}`.toLowerCase().includes(termoBusca)
  );
}

export function filtrarExemplares(exemplares, buscaExemplar) {
  const termoBusca = (buscaExemplar || "").toLowerCase();
  return exemplares.filter((exemplar) =>
    `${exemplar.nome} ${exemplar.tombo}`.toLowerCase().includes(termoBusca)
  );
}

export function formatarData(data) {
  if (!data) return "-";
  return new Date(data).toLocaleDateString("pt-BR");
}
