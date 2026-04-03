import { useEffect, useMemo, useState } from "react";
import "./Emprestimos.css";

import StatsCard from "../../../components/StatsCard/StatsCard";
import {
  criarEmprestimo,
  devolverEmprestimo,
  getAlunos,
  getComunidade,
  getEmprestimos,
  getExemplares,
} from "../../../services/api";
import FiltrosEmprestimos from "./components/FiltrosEmprestimos";
import HeaderEmprestimos from "./components/HeaderEmprestimos";
import NovoEmprestimoModal from "./components/NovoEmprestimoModal";
import TabelaEmprestimos from "./components/TabelaEmprestimos";
import {
  FILTRO_STATUS_OPTIONS,
  calcularMetricas,
  criarCardsResumo,
  criarMapaPorId,
  filtrarEmprestimos,
  filtrarExemplares,
  filtrarUsuarios,
  formatarUsuarios,
} from "./utils";

export default function Emprestimos() {
  const [emprestimos, setEmprestimos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [exemplares, setExemplares] = useState([]);
  const [mapUsuarios, setMapUsuarios] = useState({});
  const [mapExemplares, setMapExemplares] = useState({});

  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");

  const [modalAberto, setModalAberto] = useState(false);
  const [buscaUsuario, setBuscaUsuario] = useState("");
  const [buscaExemplar, setBuscaExemplar] = useState("");
  const [selecionado, setSelecionado] = useState({
    idUsuario: null,
    idExemplar: null,
  });

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    try {
      const [dadosEmprestimos, alunos, comunidade, dadosExemplares] = await Promise.all([
        getEmprestimos(),
        getAlunos(),
        getComunidade(),
        getExemplares(),
      ]);

      const usuariosFormatados = formatarUsuarios(alunos, comunidade);

      setEmprestimos(dadosEmprestimos);
      setUsuarios(usuariosFormatados);
      setMapUsuarios(criarMapaPorId(usuariosFormatados));
      setExemplares(dadosExemplares);
      setMapExemplares(criarMapaPorId(dadosExemplares));
    } catch (error) {
      console.error(error);
    }
  }

  const metricas = useMemo(() => calcularMetricas(emprestimos), [emprestimos]);
  const cardsResumo = useMemo(() => criarCardsResumo(metricas), [metricas]);

  const emprestimosFiltrados = useMemo(
    () => filtrarEmprestimos(emprestimos, busca, filtroStatus, mapUsuarios, mapExemplares),
    [emprestimos, busca, filtroStatus, mapUsuarios, mapExemplares]
  );

  const usuariosFiltrados = useMemo(() => filtrarUsuarios(usuarios, buscaUsuario), [usuarios, buscaUsuario]);

  const exemplaresFiltrados = useMemo(
    () => filtrarExemplares(exemplares, buscaExemplar),
    [exemplares, buscaExemplar]
  );

  const usuarioSelecionado = selecionado.idUsuario
    ? mapUsuarios[selecionado.idUsuario] ||
      usuarios.find((usuario) => usuario.id === selecionado.idUsuario) ||
      null
    : null;

  const exemplarSelecionado = selecionado.idExemplar
    ? mapExemplares[selecionado.idExemplar] ||
      exemplares.find((exemplar) => exemplar.id === selecionado.idExemplar) ||
      null
    : null;

  const resumoUsuario = usuarioSelecionado
    ? `${usuarioSelecionado.nome || "Usuário selecionado"} (${
        usuarioSelecionado.tipo === "Aluno" ? "RA" : "CPF"
      }: ${usuarioSelecionado.documento || "-"})`
    : "Nenhum usuário selecionado";

  const resumoExemplar = exemplarSelecionado
    ? `${exemplarSelecionado.nome || "Exemplar selecionado"} - Tombo: ${
        exemplarSelecionado.tombo || "-"
      }`
    : "Nenhum exemplar selecionado";

  async function registrarEmprestimo() {
    await criarEmprestimo(selecionado);
    fecharModal();
    carregarDados();
  }

  async function devolver(idEmprestimo) {
    await devolverEmprestimo(idEmprestimo);
    carregarDados();
  }

  function fecharModal() {
    setModalAberto(false);
    setSelecionado({ idUsuario: null, idExemplar: null });
    setBuscaUsuario("");
    setBuscaExemplar("");
  }

  function selecionarUsuario(idUsuario) {
    setSelecionado((estadoAtual) => ({
      idUsuario,
      idExemplar: estadoAtual.idUsuario === idUsuario ? estadoAtual.idExemplar : null,
    }));
    setBuscaExemplar("");
  }

  function selecionarExemplar(idExemplar) {
    setSelecionado((estadoAtual) => ({
      ...estadoAtual,
      idExemplar,
    }));
  }

  return (
    <div className="emp-page">
      <HeaderEmprestimos onNovoEmprestimo={() => setModalAberto(true)} />

      <section className="stats-cards-grid" aria-label="Resumo de empréstimos">
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
        opcoesFiltro={FILTRO_STATUS_OPTIONS}
        onFiltroStatusChange={setFiltroStatus}
      />

      <TabelaEmprestimos
        emprestimos={emprestimosFiltrados}
        mapUsuarios={mapUsuarios}
        mapExemplares={mapExemplares}
        onDevolver={devolver}
      />

      <NovoEmprestimoModal
        aberto={modalAberto}
        onFechar={fecharModal}
        buscaUsuario={buscaUsuario}
        onBuscaUsuarioChange={setBuscaUsuario}
        usuariosFiltrados={usuariosFiltrados}
        selecionado={selecionado}
        onSelecionarUsuario={selecionarUsuario}
        usuarioSelecionado={usuarioSelecionado}
        buscaExemplar={buscaExemplar}
        onBuscaExemplarChange={setBuscaExemplar}
        exemplaresFiltrados={exemplaresFiltrados}
        onSelecionarExemplar={selecionarExemplar}
        resumoUsuario={resumoUsuario}
        resumoExemplar={resumoExemplar}
        onSalvar={registrarEmprestimo}
      />
    </div>
  );
}
