import { useEffect, useMemo, useState } from "react";
import { FiList, FiClock, FiCheckCircle } from "react-icons/fi";
import "./SolicitacoesEmprestimo.css";

import HeaderEmprestimos from "./components/HeaderEmprestimos";
import StatsCard from "../../../components/StatsCard/StatsCard";
import FiltrosEmprestimos from "./components/FiltrosEmprestimos";
import { 
  getSolicitacoesEmprestimo,
  aprovarSolicitacaoEmprestimo,
  rejeitarSolicitacaoEmprestimo
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
};

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

export default function SolicitacoesEmprestimo() {
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [processando, setProcessando] = useState({});

  const [filtroStatus, setFiltroStatus] = useState("todos");
  const { addToast } = useToast();

  const OPCOES_FILTRO = [
    { valor: "todos", label: "Todos" },
    { valor: "aprovados", label: "Aprovados" },
    { valor: "negados", label: "Negados" },
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

  const metricas = useMemo(() => {
    const total = solicitacoes.length;
    const pendentes = solicitacoes.filter((item) => {
      const s = String(item.status || item.movStatus || "").toLowerCase();
      return s === "pendente";
    }).length;
    const aceitas = solicitacoes.filter((item) => {
      const s = String(item.status || item.movStatus || "").toLowerCase();
      return s === "ativo" || s === "aceito" || s === "aceita" || s === "aprovado";
    }).length;
    const negados = solicitacoes.filter((item) => {
      const s = String(item.status || item.movStatus || "").toLowerCase();
      return s === "negado" || s === "cancelado" || s === "rejeitado";
    }).length;

    return { total, pendentes, negados, aceitas };
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
    ],
    [metricas]
  );

  const solicitacoesFiltradas = useMemo(() => {
    let list = filtrarSolicitacoes(solicitacoes, busca);

    if (filtroStatus && filtroStatus !== "todos") {
      list = list.filter((item) => {
        const status = String(item.status || item.movStatus || "").toLowerCase();
        if (filtroStatus === "aprovados") return status === "ativo" || status === "aceita" || status === "aceito" || status === "aprovado";
        if (filtroStatus === "negados") return status === "cancelado" || status === "negado" || status === "rejeitado";
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
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>

          <tbody>
            {carregando ? (
              <tr>
                <td colSpan="7" className="emp-empty-table">
                  Carregando solicitações...
                </td>
              </tr>
            ) : solicitacoesFiltradas.length === 0 ? (
              <tr>
                <td colSpan="7" className="emp-empty-table">
                  Nenhuma solicitação encontrada para os filtros informados.
                </td>
              </tr>
            ) : (
              solicitacoesFiltradas.map((item) => {
                let status = String(item.status || item.movStatus || "").toLowerCase();
                const usuario = item.usuario || item.nome || item.usuNome || "Usuário não informado";
                const titulo = item.titulo || item.empLiv_Titulo || "Livro não informado";
                const tombo = item.codigo || item.empLiv_Tombo || item.exemplar?.exeLivTombo || "-";
                const id = item.idEmprestimo || item.idMovimentacao;
                const isProcessando = processando[id];

                return (
                  <tr key={id || `${item.id}-${item.dataEmprestimo}`}>
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

                    <td>
                      <span className={`emp-status ${status}`}>
                        {statusLabel[status] || status || "Não informado"}
                      </span>
                    </td>

                    <td className="emp-actions-cell">
                      {status === "pendente" && (
                        <>
                          <LoadingButton 
                            className="emp-btn-light" 
                            onClick={() => handleAprovarSolicitacao(item)}
                            disabled={isProcessando}
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