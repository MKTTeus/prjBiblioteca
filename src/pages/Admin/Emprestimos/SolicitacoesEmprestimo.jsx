import { useEffect, useMemo, useState } from "react";
import { FiList, FiClock, FiCheckCircle, FiAlertTriangle } from "react-icons/fi";
import "./SolicitacoesEmprestimo.css";
import HeaderEmprestimos from "./components/HeaderEmprestimos";
import StatsCard from "../../../components/StatsCard/StatsCard";
import FiltrosEmprestimos from "./components/FiltrosEmprestimos";
import { 
  getSolicitacoesEmprestimo,
  aprovarSolicitacaoEmprestimo,
  rejeitarSolicitacaoEmprestimo,
  confirmarRetirada,
  registrarRetirada,
  expirarSolicitacao,
} from "../../../services/api";
import "./Emprestimos.css";
import LoadingButton from "../../../components/LoadingButton/LoadingButton";
import { useToast } from "../../../contexts/ToastContext";
const statusLabel = {
  ativo: "Aceita",
  aceito: "Aceito",
  aprovado: "Aprovado",
  pendente: "Pendente",
  cancelado: "Cancelada",
  negado: "Negado",
  rejeitado: "Rejeitado",
  expirado: "Expirada",
};
// const statusConfirmacaoLabel = {
//   PENDENTE: "Aguardando Confirmação",
//   CONFIRMADA: "Confirmada — Aguardando Retirada",
//   RETIRADA: "Retirada Realizada",
//   EXPIRADA: "Expirada",
// };

function filtrarSolicitacoes(solicitacoes, busca) {
  const termo = String(busca || "").trim().toLowerCase();
  if (!termo) {
    return solicitacoes;
  }
  return solicitacoes.filter((solicitacao) => {
    const titulo = String(solicitacao.titulo || solicitacao.empLiv_Titulo || "").toLowerCase();
    const codigo = String(solicitacao.codigo || solicitacao.empLiv_Tombo || "").toLowerCase();
    const id = String(solicitacao.idEmprestimo || solicitacao.idMovimentacao || "").toLowerCase();
    const status = String(solicitacao.status || solicitacao.movStatus || "").toLowerCase();
    const buscaUsuario = String(solicitacao.usuario || solicitacao.nome || "").toLowerCase();
    const termoStatus = statusLabel[status] ? statusLabel[status].toLowerCase() : status;
    return (
      id.includes(termo) ||
      titulo.includes(termo) ||
      codigo.includes(termo) ||
      buscaUsuario.includes(termo) ||
      termoStatus.includes(termo)
    );
  });
}
function calcHorasRestantes(dataLimite) {
  if (!dataLimite) return null;
  try {
    const limite = new Date(dataLimite);
    const agora = new Date();
    const diff = (limite - agora) / (1000 * 60 * 60);
    return Math.max(0, diff);
  } catch {
    return null;
  }
}
function formatDataLimite(dataLimite) {
  if (!dataLimite) return "-";
  try {
    const d = new Date(dataLimite);
    return d.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dataLimite;
  }
}
function BadgePrazo({ dataLimite }) {
  const horas = calcHorasRestantes(dataLimite);
  if (horas === null) return null;
  const isUrgente = horas <= 2;
  const horasInt = Math.ceil(horas);
  let label;
  if (horas <= 0) {
    label = "Expirado";
  } else if (horasInt <= 1) {
    label = "< 1h restante";
  } else {
    label = `${horasInt}h restantes`;
  }
  return (
    <span
      className={`badge-prazo ${isUrgente ? "badge-prazo-urgente" : "badge-prazo-normal"}`}
      title={`Prazo: ${formatDataLimite(dataLimite)}`}
    >
      {isUrgente && <FiAlertTriangle size={12} />}
      {label}
    </span>
  );
}
export default function SolicitacoesEmprestimo() {
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [processando, setProcessando] = useState({});
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const { addToast } = useToast();
  const OPCOES_FILTRO = [
    { valor: "todos", label: "Todos" },
    { valor: "pendentes", label: "Pendentes" },
    { valor: "confirmadas", label: "Confirmadas" },
    { valor: "aprovados", label: "Aprovados" },
    { valor: "negados", label: "Negados" },
    { valor: "expirados", label: "Expirados" },
  ];
  useEffect(() => {
    async function carregarDados() {
      setCarregando(true);
      try {
        const data = await getSolicitacoesEmprestimo();
        const arr = Array.isArray(data) ? data : [];
        setSolicitacoes(arr);
      } catch (error) {
        console.error(error);
        setSolicitacoes([]);
      } finally {
        setCarregando(false);
      }
    }
    carregarDados();
  }, []);
  // Auto-refresh every 60s to update countdown badges
  useEffect(() => {
    const interval = setInterval(() => {
      setSolicitacoes((prev) => [...prev]); // trigger re-render for badge updates
    }, 60000);
    return () => clearInterval(interval);
  }, []);
  const metricas = useMemo(() => {
    const total = solicitacoes.length;
    const pendentes = solicitacoes.filter((item) => {
      const s = String(item.status || item.movStatus || "").toLowerCase();
      return s === "pendente";
    }).length;
    const confirmadas = solicitacoes.filter((item) => {
      return item.statusConfirmacao === "CONFIRMADA";
    }).length;
    const aceitas = solicitacoes.filter((item) => {
      const s = String(item.status || item.movStatus || "").toLowerCase();
      return s === "ativo" || s === "aceito" || s === "aceita" || s === "aprovado";
    }).length;
    const negados = solicitacoes.filter((item) => {
      const s = String(item.status || item.movStatus || "").toLowerCase();
      return s === "negado" || s === "cancelado" || s === "rejeitado";
    }).length;
    const expirados = solicitacoes.filter((item) => {
      const s = String(item.status || item.movStatus || "").toLowerCase();
      return s === "expirado" || item.statusConfirmacao === "EXPIRADA";
    }).length;
    return { total, pendentes, confirmadas, negados, aceitas, expirados };
  }, [solicitacoes]);
  const cardsResumo = useMemo(
    () => [
      {
        chave: "total",
        titulo: "Solicitações",
        valor: metricas.total,
        cor: "blue",
        icone: <FiList size={18} />,
      },
      {
        chave: "pendentes",
        titulo: "Aguardando Resposta",
        valor: metricas.pendentes,
        cor: "orange",
        icone: <FiClock size={18} />,
      },
      {
        chave: "confirmadas",
        titulo: "Aguardando Retirada",
        valor: metricas.confirmadas,
        cor: "purple",
        icone: <FiAlertTriangle size={18} />,
      },
      {
        chave: "aceitas",
        titulo: "Aprovadas",
        valor: metricas.aceitas,
        cor: "green",
        icone: <FiCheckCircle size={18} />,
      },
      {
        chave: "negados",
        titulo: "Negadas",
        valor: metricas.negados,
        cor: "red",
        icone: <FiClock size={18} />,
      },
      {
        chave: "expirados",
        titulo: "Expiradas",
        valor: metricas.expirados,
        cor: "gray",
        icone: <FiAlertTriangle size={18} />,
      },
    ],
    [metricas]
  );
  const solicitacoesFiltradas = useMemo(() => {
    let list = filtrarSolicitacoes(solicitacoes, busca);
    if (filtroStatus && filtroStatus !== "todos") {
      list = list.filter((item) => {
        const status = String(item.status || item.movStatus || "").toLowerCase();
        const statusConf = item.statusConfirmacao || "PENDENTE";
        if (filtroStatus === "pendentes") return status === "pendente" && statusConf === "PENDENTE";
        if (filtroStatus === "confirmadas") return statusConf === "CONFIRMADA";
        if (filtroStatus === "aprovados") return status === "ativo" || status === "aceita" || status === "aceito" || status === "aprovado";
        if (filtroStatus === "negados") return status === "cancelado" || status === "negado" || status === "rejeitado";
        if (filtroStatus === "expirados") return status === "expirado" || statusConf === "EXPIRADA";
        return true;
      });
    }
    return list;
  }, [solicitacoes, busca, filtroStatus]);
  async function handleAprovarSolicitacao(item) {
    const id = item.idEmprestimo || item.idMovimentacao;
    if (!id) {
      addToast("Erro: ID da solicitação não encontrado", "error");
      return;
    }
    setProcessando((prev) => ({ ...prev, [id]: true }));
    try {
      await aprovarSolicitacaoEmprestimo(id);
      setSolicitacoes((prev) =>
        prev.map((s) =>
          (s.idEmprestimo || s.idMovimentacao) === id
            ? { ...s, status: "ativo", movStatus: "Ativo" }
            : s
        )
      );
      addToast("Solicitação aprovada com sucesso", "success");
    } catch (error) {
      console.error(error);
      const mensagem = error.data?.detail || error.message || "Erro ao aprovar solicitação";
      addToast(mensagem, "error");
    } finally {
      setProcessando((prev) => ({ ...prev, [id]: false }));
    }
  }
  async function handleNegarSolicitacao(item) {
    const id = item.idEmprestimo || item.idMovimentacao;
    if (!id) {
      addToast("Erro: ID da solicitação não encontrado", "error");
      return;
    }
    setProcessando((prev) => ({ ...prev, [id]: true }));
    try {
      await rejeitarSolicitacaoEmprestimo(id);
      setSolicitacoes((prev) =>
        prev.map((s) =>
          (s.idEmprestimo || s.idMovimentacao) === id
            ? { ...s, status: "negado", movStatus: "Negado" }
            : s
        )
      );
      addToast("Solicitação rejeitada", "error");
    } catch (error) {
      console.error(error);
      const mensagem = error.data?.detail || error.message || "Erro ao rejeitar solicitação";
      addToast(mensagem, "error");
    } finally {
      setProcessando((prev) => ({ ...prev, [id]: false }));
    }
  }
  async function handleConfirmarRetirada(item) {
    const id = item.idEmprestimo || item.idMovimentacao;
    if (!id) {
      addToast("Erro: ID da solicitação não encontrado", "error");
      return;
    }
    setProcessando((prev) => ({ ...prev, [id]: true }));
    try {
      const resultado = await confirmarRetirada(id);
      setSolicitacoes((prev) =>
        prev.map((s) =>
          (s.idEmprestimo || s.idMovimentacao) === id
            ? {
                ...s,
                statusConfirmacao: "CONFIRMADA",
                dataConfirmacao: resultado.dataConfirmacao,
                prazoHoras: resultado.prazoHoras,
                dataLimite: resultado.dataLimite,
              }
            : s
        )
      );
      addToast(
        `Retirada confirmada! Prazo: ${formatDataLimite(resultado.dataLimite)}`,
        "success"
      );
    } catch (error) {
      console.error(error);
      const mensagem = error.data?.detail || error.message || "Erro ao confirmar retirada";
      addToast(mensagem, "error");
    } finally {
      setProcessando((prev) => ({ ...prev, [id]: false }));
    }
  }
  async function handleRegistrarRetirada(item) {
    const id = item.idEmprestimo || item.idMovimentacao;
    if (!id) {
      addToast("Erro: ID da solicitação não encontrado", "error");
      return;
    }
    setProcessando((prev) => ({ ...prev, [id]: true }));
    try {
      await registrarRetirada(id);
      setSolicitacoes((prev) =>
        prev.map((s) =>
          (s.idEmprestimo || s.idMovimentacao) === id
            ? {
                ...s,
                status: "ativo",
                movStatus: "Ativo",
                statusConfirmacao: "RETIRADA",
              }
            : s
        )
      );
      addToast("Retirada registrada com sucesso! Empréstimo ativo.", "success");
    } catch (error) {
      console.error(error);
      const mensagem = error.data?.detail || error.message || "Erro ao registrar retirada";
      addToast(mensagem, "error");
    } finally {
      setProcessando((prev) => ({ ...prev, [id]: false }));
    }
  }
  async function handleExpirarSolicitacao(item) {
    const id = item.idEmprestimo || item.idMovimentacao;
    if (!id) {
      addToast("Erro: ID da solicitação não encontrado", "error");
      return;
    }
    if (!window.confirm("Tem certeza que deseja expirar esta solicitação? O exemplar será liberado.")) {
      return;
    }
    setProcessando((prev) => ({ ...prev, [id]: true }));
    try {
      await expirarSolicitacao(id);
      setSolicitacoes((prev) =>
        prev.map((s) =>
          (s.idEmprestimo || s.idMovimentacao) === id
            ? {
                ...s,
                status: "expirado",
                movStatus: "Expirado",
                statusConfirmacao: "EXPIRADA",
              }
            : s
        )
      );
      addToast("Solicitação expirada com sucesso", "success");
    } catch (error) {
      console.error(error);
      const mensagem = error.data?.detail || error.message || "Erro ao expirar solicitação";
      addToast(mensagem, "error");
    } finally {
      setProcessando((prev) => ({ ...prev, [id]: false }));
    }
  }
  return (
    <div className="solicitacoes-page emp-page page-shell">
      <HeaderEmprestimos
        title="Solicitações de Empréstimo"
        subtitle="Visualize o volume de pedidos e encontre rapidamente solicitações de empréstimo."
      />
      <section className="stats-cards-grid stats-cards-grid-admin" aria-label="Resumo de solicitações">
        {cardsResumo.map((card) => (
          <StatsCard
            key={card.chave}
            title={card.titulo}
            value={card.valor}
            subtitle="Atualizado com os dados da tela"
            icon={card.icone}
            color={card.cor}
          />
        ))}
      </section>
      <FiltrosEmprestimos
        busca={busca}
        onBuscaChange={setBusca}
        filtroStatus={filtroStatus}
        opcoesFiltro={OPCOES_FILTRO}
        onFiltroStatusChange={setFiltroStatus}
      />
      <section className="emp-table-box">
        <div className="emp-table-header">
          <h2>Lista de Solicitações</h2>
        </div>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Usuário</th>
              <th>Livro</th>
              <th>Tipo de Solicitante</th>
              <th>Solicitação</th>
              <th>Confirmação / Prazo</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {carregando ? (
              <tr>
                <td colSpan="8" className="emp-empty-table">
                  Carregando solicitações...
                </td>
              </tr>
            ) : solicitacoesFiltradas.length === 0 ? (
              <tr>
                <td colSpan="8" className="emp-empty-table">
                  Nenhuma solicitação encontrada para os filtros informados.
                </td>
              </tr>
            ) : (
              solicitacoesFiltradas.map((item) => {
                let status = String(item.status || item.movStatus || "").toLowerCase();
                const statusConf = item.statusConfirmacao || "PENDENTE";
                const usuario = item.usuario || item.nome || item.usuNome || "Usuário não informado";
                const titulo = item.titulo || item.empLiv_Titulo || "Livro não informado";
                const tombo = item.codigo || item.empLiv_Tombo || item.exemplar?.exeLivTombo || "-";
                const id = item.idEmprestimo || item.idMovimentacao;
                const isProcessando = processando[id];
                const isExpirada = statusConf === "EXPIRADA" || status === "expirado";
                const horasRestantes = calcHorasRestantes(item.dataLimite);
                return (
                  <tr key={id || `${item.id}-${item.dataEmprestimo}`} className={isExpirada ? "row-expirada" : ""}>
                    <td className="emp-id-cell">{id || "-"}</td>
                    <td className="emp-main-cell">
                      <strong>{usuario}</strong>
                      <small>{item.usuarioTipo || item.tipo || "-"}</small>
                    </td>
                    <td className="emp-main-cell">
                      <strong>{titulo}</strong>
                      <small>Tombo: {tombo}</small>
                    </td>
                    <td>{item.usuarioTipo || item.tipo || "-"}</td>
                    <td>{item.movDataSolicitacao || item.dataEmprestimo || item.empLiv_DataEmprestimo || "-"}</td>
                    <td className="emp-confirmacao-cell">
                      {statusConf === "CONFIRMADA" && item.dataLimite ? (
                        <div className="confirmacao-info">
                          <small className="confirmacao-prazo">
                            Prazo: {formatDataLimite(item.dataLimite)}
                          </small>
                          <BadgePrazo dataLimite={item.dataLimite} />
                          {horasRestantes !== null && horasRestantes <= 2 && horasRestantes > 0 && (
                            <span className="inline-warning">
                              ⚠️ Prazo próximo de expirar!
                            </span>
                          )}
                        </div>
                      ) : statusConf === "RETIRADA" ? (
                        <span className="confirmacao-badge confirmacao-retirada">Retirado</span>
                      ) : statusConf === "EXPIRADA" ? (
                        <span className="confirmacao-badge confirmacao-expirada" title="A reserva expirou e foi cancelada">
                          Expirada
                        </span>
                      ) : status === "negado" || status === "rejeitado" || status === "cancelado" ? (
                        <span className="confirmacao-badge confirmacao-nao-aplica">—</span>
                      ) : status === "aprovado" ? (
                        <span className="confirmacao-badge confirmacao-pendente" title="Aprovada — aguardando confirmação de retirada">
                          Aguardando retirada
                        </span>
                      ) : (
                        <span className="confirmacao-badge confirmacao-pendente" title="Aguardando decisão do administrador">
                          Aguardando aprovação
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`emp-status ${isExpirada ? "expirado" : status}`}>
                        {isExpirada
                          ? "Expirada"
                          : statusConf === "CONFIRMADA"
                          ? "Confirmada"
                          : statusLabel[status] || status || "Não informado"}
                      </span>
                    </td>
                    <td className="emp-actions-cell">
                      <div className="emp-actions">
                        {status === "pendente" && statusConf === "PENDENTE" && (
                          <>
                            <LoadingButton
                              className="emp-btn-light"
                              onClick={() => handleAprovarSolicitacao(item)}
                              disabled={isProcessando}
                              title="Aprovar solicitação e liberar para confirmar retirada"
                            >
                              Aprovar
                            </LoadingButton>
                            <LoadingButton
                              className="emp-btn-light"
                              onClick={() => handleNegarSolicitacao(item)}
                              disabled={isProcessando}
                            >
                              Negar
                            </LoadingButton>
                          </>
                        )}
                        {status === "aprovado" && statusConf === "PENDENTE" && (
                          <LoadingButton
                            className="emp-btn-confirm"
                            onClick={() => handleConfirmarRetirada(item)}
                            disabled={isProcessando}
                            title="Confirmar que o aluno pode retirar o livro"
                          >
                            Confirmar retirada
                          </LoadingButton>
                        )}
                        {statusConf === "CONFIRMADA" && (
                          <>
                            <LoadingButton
                              className="emp-btn-retirar"
                              onClick={() => handleRegistrarRetirada(item)}
                              disabled={isProcessando}
                              title="Registrar que o aluno retirou o livro"
                            >
                              Retirar
                            </LoadingButton>
                            <LoadingButton
                              className="emp-btn-expirar"
                              onClick={() => handleExpirarSolicitacao(item)}
                              disabled={isProcessando}
                              title="Expirar manualmente esta solicitação"
                            >
                              Expirar
                            </LoadingButton>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}