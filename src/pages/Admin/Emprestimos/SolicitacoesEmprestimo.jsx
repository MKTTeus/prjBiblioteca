import { useEffect, useMemo, useState } from "react";
import { FiList, FiClock, FiCheckCircle } from "react-icons/fi";
import "./SolicitacoesEmprestimo.css";

import HeaderEmprestimos from "./components/HeaderEmprestimos";
import StatsCard from "../../../components/StatsCard/StatsCard";
import FiltrosEmprestimos from "./components/FiltrosEmprestimos";
import { getEmprestimos } from "../../../services/api";
import "./Emprestimos.css";
import LoadingButton from "../../../components/LoadingButton/LoadingButton";
import { useToast } from "../../../contexts/ToastContext";

const statusLabel = {
  ativo: "Aceita",
  aceito: "Aceito",
  pendente: "Pendente",
  cancelado: "Cancelada",
  negado: "Negado",
  devolvido: "Negado",
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

  useEffect(() => {
    async function carregarDados() {
      setCarregando(true);
      try {
        const data = await getEmprestimos();
        const arr = Array.isArray(data) ? data : [];
        // adicionar item mock para testes (pendente)
        const mock = {
          idMovimentacao: 999999,
          idEmprestimo: 999999,
          usuario: "João Silva",
          usuarioTipo: "Aluno",
          titulo: "Introdução à Programação",
          empLiv_Titulo: "Introdução à Programação",
          codigo: "TB-1234",
          empLiv_Tombo: "TB-1234",
          movDataSolicitacao: new Date().toISOString(),
          status: "pendente",
          movStatus: "pendente",
        };
        arr.push(mock);
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
    const aceitas = solicitacoes.filter((item) => {
      const s = String(item.status || item.movStatus || "").toLowerCase();
      return s === "ativo" || s === "aceito" || s === "aceita" || s === "aprovado";
    }).length;
    const negados = solicitacoes.filter((item) => {
      let s = String(item.status || item.movStatus || "").toLowerCase();
      if (s === "devolvido") s = "negado";
      return s === "negado" || s === "cancelado" || s === "rejeitado";
    }).length;

    return { total, negados, aceitas };
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
        chave: "negados",
        titulo: "Solicitações Negadas",
        valor: metricas.negados,
        cor: "orange",
        icone: <FiClock size={18} />,
      },
      {
        chave: "aceitas",
        titulo: "Solicitações Aceitas",
        valor: metricas.aceitas,
        cor: "green",
        icone: <FiCheckCircle size={18} />,
      },
    ],
    [metricas]
  );

  const [filtroStatus, setFiltroStatus] = useState("todos");
  const { addToast } = useToast();

  const OPCOES_FILTRO = [
    { valor: "todos", label: "Todos" },
    { valor: "aprovados", label: "Aprovados" },
    { valor: "negados", label: "Negados" },
  ];

  const solicitacoesFiltradas = useMemo(() => {
    let list = filtrarSolicitacoes(solicitacoes, busca);

    if (filtroStatus && filtroStatus !== "todos") {
      list = list.filter((item) => {
        let status = String(item.status || item.movStatus || "").toLowerCase();
        if (status === "devolvido") status = "negado";
        if (filtroStatus === "aprovados") return status === "ativo" || status === "aceita" || status === "aceito" || status === "aprovado";
        if (filtroStatus === "negados") return status === "cancelado" || status === "negado" || status === "rejeitado";
        return true;
      });
    }

    return list;
  }, [solicitacoes, busca, filtroStatus]);

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
                if (status === "devolvido") status = "negado";
                const usuario = item.usuario || item.nome || item.usuNome || "Usuário não informado";
                const titulo = item.titulo || item.empLiv_Titulo || "Livro não informado";
                const tombo = item.codigo || item.empLiv_Tombo || item.exemplar?.exeLivTombo || "-";

                function handleAprovar() {
                  // Presentation-only update; backend endpoint not available
                  setSolicitacoes((prev) =>
                    prev.map((s) =>
                      (s.idEmprestimo || s.idMovimentacao) === (item.idEmprestimo || item.idMovimentacao)
                        ? { ...s, status: "aceito", movStatus: "aceito" }
                        : s
                    )
                  );
                  addToast("Solicitação aprovada", "success");
                }

                function handleNegar() {
                  setSolicitacoes((prev) =>
                    prev.map((s) =>
                      (s.idEmprestimo || s.idMovimentacao) === (item.idEmprestimo || item.idMovimentacao)
                        ? { ...s, status: "negado", movStatus: "negado" }
                        : s
                    )
                  );
                  addToast("Solicitação negada", "error");
                }

                return (
                  <tr key={item.idEmprestimo || item.idMovimentacao || `${item.id}-${item.dataEmprestimo}`}>
                    <td className="emp-id-cell">{item.idEmprestimo || item.idMovimentacao || "-"}</td>

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
                          <LoadingButton className="emp-btn-light" onClick={handleAprovar}>
                            Aprovar
                          </LoadingButton>

                          <LoadingButton className="emp-btn-light" onClick={handleNegar}>
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
