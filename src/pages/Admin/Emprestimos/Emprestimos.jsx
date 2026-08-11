import { useEffect, useMemo, useState } from "react";
import "./Emprestimos.css";

import StatsCard from "../../../components/StatsCard/StatsCard";
import ConfirmModal from "../../../components/ConfirmModal/ConfirmModal";
import { useToast } from "../../../contexts/ToastContext";
import {
  criarEmprestimo,
  devolverEmprestimo,
  renovarEmprestimo,
  getAlunos,
  getComunidade,
  getEmprestimos,
  getExemplaresDisponiveis,
} from "../../../services/api";
import FiltrosEmprestimos from "./components/FiltrosEmprestimos";
import HeaderEmprestimos from "./components/HeaderEmprestimos";
import NovoEmprestimoModal from "./components/NovoEmprestimoModal";
import RenovarEmprestimoModal from "./components/RenovarEmprestimoModal";
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
  const [salvando, setSalvando] = useState(false);
  const { addToast } = useToast();

  const [emprestimoRenovar, setEmprestimoRenovar] = useState(null);
  const [renovando, setRenovando] = useState(false);

  const [emprestimoDevolver, setEmprestimoDevolver] = useState(null);
  const [devolvendo, setDevolvendo] = useState(false);

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    try {
      const [dadosEmprestimos, alunos, comunidade, dadosExemplaresDisponiveis] = await Promise.all([
        getEmprestimos(),
        getAlunos(),
        getComunidade(),
        getExemplaresDisponiveis(),
      ]);

      const usuariosFormatados = formatarUsuarios(alunos, comunidade);

      setEmprestimos(dadosEmprestimos);
      setUsuarios(usuariosFormatados);
      setMapUsuarios(criarMapaPorId(usuariosFormatados));
      setExemplares(dadosExemplaresDisponiveis);
      setMapExemplares(criarMapaPorId(dadosExemplaresDisponiveis));
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

  async function registrarEmprestimo() {
    setSalvando(true);
    try {
      await criarEmprestimo(selecionado);
      addToast("Empréstimo realizado com sucesso", "success");
      fecharModal();
      carregarDados();
    } catch (error) {
      console.error(error);
      addToast("Falha ao realizar o empréstimo", "error");
    } finally {
      setSalvando(false);
    }
  }

  function abrirDevolver(emprestimo) {
    setEmprestimoDevolver(emprestimo);
  }

  function fecharDevolver() {
    if (devolvendo) return;
    setEmprestimoDevolver(null);
  }

  async function confirmarDevolucao() {
    if (!emprestimoDevolver) return;
    setDevolvendo(true);
    try {
      await devolverEmprestimo(emprestimoDevolver.idEmprestimo);
      addToast("Empréstimo devolvido com sucesso", "success");
      setEmprestimoDevolver(null);
      carregarDados();
    } catch (error) {
      console.error(error);
      addToast("Falha ao devolver o empréstimo", "error");
    } finally {
      setDevolvendo(false);
    }
  }

  function abrirRenovar(emprestimo) {
    setEmprestimoRenovar(emprestimo);
  }

  function fecharRenovar() {
    if (renovando) return;
    setEmprestimoRenovar(null);
  }

  async function confirmarRenovacao(novaData) {
    if (!emprestimoRenovar) return;
    setRenovando(true);
    try {
      await renovarEmprestimo(emprestimoRenovar.idEmprestimo, novaData);
      addToast("Empréstimo renovado com sucesso", "success");
      setEmprestimoRenovar(null);
      carregarDados();
    } catch (error) {
      console.error(error);
      addToast(error?.data?.detail || "Falha ao renovar o empréstimo", "error");
    } finally {
      setRenovando(false);
    }
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
    <div className="emp-page page-shell">
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
        onDevolver={abrirDevolver}
        onRenovar={abrirRenovar}
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
        totalExemplaresDisponiveis={exemplares.length}
        onSalvar={registrarEmprestimo}
        salvando={salvando}
      />

      <RenovarEmprestimoModal
        aberto={Boolean(emprestimoRenovar)}
        emprestimo={emprestimoRenovar}
        usuario={emprestimoRenovar ? mapUsuarios[emprestimoRenovar.idUsuario] : null}
        onFechar={fecharRenovar}
        onConfirmar={confirmarRenovacao}
        renovando={renovando}
      />

      <ConfirmModal
        show={Boolean(emprestimoDevolver)}
        title="Confirmar devolução"
        message={
          emprestimoDevolver ? (
            <>
              Confirmar a devolução de{" "}
              <strong>{emprestimoDevolver.titulo || emprestimoDevolver.empLiv_Titulo || "este livro"}</strong>
              {mapUsuarios[emprestimoDevolver.idUsuario]
                ? ` por ${mapUsuarios[emprestimoDevolver.idUsuario].nome}`
                : ""}
              ?
            </>
          ) : (
            ""
          )
        }
        confirmText="Devolver"
        cancelText="Cancelar"
        confirming={devolvendo}
        onConfirm={confirmarDevolucao}
        onCancel={fecharDevolver}
      />
    </div>
  );
}