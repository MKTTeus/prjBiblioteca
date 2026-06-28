import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Calendar, Users, GraduationCap, AlertTriangle, Lock } from "lucide-react";
import { useToast } from "../../../../../contexts/ToastContext";
import StatsCard from "../../../../../components/StatsCard/StatsCard";
import { getAnoLetivo, encerrarAnoLetivo } from "../../../../../services/api";
import "./AnoLetivo.css";

export default function AnoLetivo() {
  const { addToast } = useToast();
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [processando, setProcessando] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAnoLetivo();
      setInfo(data);
    } catch (err) {
      addToast("Erro ao carregar dados do ano letivo", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const fraseEsperada = info?.fraseConfirmacao || "";
  const fraseOk =
    confirmacao.trim().toUpperCase() === fraseEsperada.toUpperCase();

  const abrirModal = () => {
    setSenha("");
    setConfirmacao("");
    setShowModal(true);
  };

  const fecharModal = () => {
    if (processando) return;
    setShowModal(false);
  };

  const handleEncerrar = async () => {
    if (!senha || !fraseOk) return;
    setProcessando(true);
    try {
      const r = await encerrarAnoLetivo({ senha, confirmacao });
      addToast(
        `Ano letivo encerrado: ${r.promovidos} promovido(s), ${r.formados} formado(s). Novo ano: ${r.novoAnoLetivo}.`,
        "success"
      );
      setShowModal(false);
      await carregar();
    } catch (err) {
      addToast(err?.data?.detail || err?.message || "Falha ao encerrar o ano letivo", "error");
    } finally {
      setProcessando(false);
    }
  };

  return (
    <div className="card">
      <div className="ano-letivo-header">
        <h3>Ano Letivo</h3>
        <p>Encerre o ano letivo para promover os alunos automaticamente.</p>
      </div>

      <div className="ano-letivo-cards">
        <StatsCard
          title="Ano Letivo Atual"
          value={loading ? "—" : info?.anoLetivoAtual ?? "—"}
          subtitle="Período corrente do sistema"
          icon={<Calendar size={18} />}
          color="blue"
        />
        <StatsCard
          title="Alunos Ativos"
          value={loading ? "—" : info?.alunosAtivos ?? 0}
          subtitle="Participam da promoção"
          icon={<Users size={18} />}
          color="green"
        />
        <StatsCard
          title="Concluintes"
          value={loading ? "—" : info?.concluintes ?? 0}
          subtitle="3º Ano EM — serão formados"
          icon={<GraduationCap size={18} />}
          color="orange"
        />
      </div>

      <div className="ano-letivo-acao">
        <div className="ano-letivo-aviso">
          <AlertTriangle size={16} />
          <span>
            Operação crítica: afeta todos os alunos ativos. Exige senha e frase de confirmação.
          </span>
        </div>
        <button
          className="btn-encerrar"
          onClick={abrirModal}
          disabled={loading}
        >
          Encerrar Ano Letivo
        </button>
      </div>

      {showModal && createPortal(
        <div className="al-overlay" onClick={fecharModal}>
          <div className="al-modal" onClick={(e) => e.stopPropagation()}>
            <AlertTriangle className="al-modal-icon" size={30} />
            <h3>Encerrar o ano letivo {info?.anoLetivoAtual}?</h3>

            <p>Esta operação irá:</p>
            <ul className="al-resumo">
              <li>Promover automaticamente os alunos para a série seguinte;</li>
              <li>Formar os concluintes do 3º Ano EM (histórico preservado);</li>
              <li>Atualizar o ano letivo dos alunos promovidos;</li>
              <li>
                Definir <strong>{(info?.anoLetivoAtual ?? 0) + 1}</strong> como o novo ano letivo do
                sistema.
              </li>
            </ul>

            <p className="al-warning">
              <AlertTriangle size={14} /> Esta ação não pode ser desfeita.
            </p>

            <div className="al-field">
              <label>Senha do administrador</label>
              <div className="al-input-wrap">
                <Lock className="al-input-icon" size={15} />
                <input
                  type="password"
                  placeholder="Sua senha atual"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  disabled={processando}
                  autoFocus
                />
              </div>
            </div>

            <div className="al-field">
              <label>
                Digite a frase: <code>{fraseEsperada}</code>
              </label>
              <input
                type="text"
                placeholder={fraseEsperada}
                value={confirmacao}
                onChange={(e) => setConfirmacao(e.target.value)}
                disabled={processando}
              />
            </div>

            <div className="al-modal-actions">
              <button className="al-btn al-btn--ghost" onClick={fecharModal} disabled={processando}>
                Cancelar
              </button>
              <button
                className="al-btn al-btn--danger"
                onClick={handleEncerrar}
                disabled={processando || !senha || !fraseOk}
              >
                {processando ? "Processando…" : "Encerrar Ano Letivo"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
