import React, { useEffect, useState, useCallback } from "react";
import {
  FiDownload,
  FiTrash2,
  FiRefreshCw,
  FiSave,
  FiDatabase,
  FiClock,
  FiFileText,
  FiAlertCircle,
} from "react-icons/fi";
import {
  listarBackups,
  salvarBackup,
  getBackupDownloadUrl,
  excluirBackup,
} from "../../../services/api";
import "./Backups.css";

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return "—";
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function Backups() {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);
  const [toast, setToast] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  const showToast = (msg, tipo = "success") => {
    setToast({ msg, tipo });
    setTimeout(() => setToast(null), 3500);
  };

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const res = await listarBackups();
      setBackups(res.backups || []);
    } catch (e) {
      setErro("Não foi possível carregar a lista de backups.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const handleSalvar = async () => {
    setSalvando(true);
    try {
      const res = await salvarBackup();
      showToast(`Backup salvo: ${res.arquivo}`);
      await carregar();
    } catch (e) {
      showToast("Erro ao gerar backup. Tente novamente.", "error");
    } finally {
      setSalvando(false);
    }
  };

  const handleDownload = async (nome) => {
    setDownloadingId(nome);
    try {
      const res = await getBackupDownloadUrl(nome);
      const a = document.createElement("a");
      a.href = res.url;
      a.download = nome;
      a.click();
    } catch (e) {
      showToast("Erro ao obter link de download.", "error");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleExcluir = async (nome) => {
    try {
      await excluirBackup(nome);
      showToast("Backup excluído com sucesso.");
      setConfirmDelete(null);
      await carregar();
    } catch (e) {
      showToast("Erro ao excluir backup.", "error");
    }
  };

  return (
    <div className="backups-page">
      {/* Toast */}
      {toast && (
        <div className={`backups-toast backups-toast--${toast.tipo}`}>
          {toast.tipo === "error" ? <FiAlertCircle /> : <FiDatabase />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Header */}
      <div className="backups-header">
        <div className="backups-header-text">
          <h1>
            <FiDatabase className="header-icon" />
            Backups do Sistema
          </h1>
          <p>
            O backup é gerado automaticamente todo dia às&nbsp;16h e salvo com
            segurança no Supabase Storage. Você também pode gerar um backup
            manual a qualquer momento.
          </p>
        </div>

        <div className="backups-header-actions">
          <button
            className="btn-secondary"
            onClick={carregar}
            disabled={loading}
            title="Atualizar lista"
          >
            <FiRefreshCw className={loading ? "spin" : ""} />
            Atualizar
          </button>
          <button
            className="btn-primary"
            onClick={handleSalvar}
            disabled={salvando}
          >
            <FiSave />
            {salvando ? "Gerando…" : "Gerar Backup Agora"}
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div className="backups-info-banner">
        <FiClock className="info-icon" />
        <span>
          <strong>Agendamento automático:</strong> Vercel Cron dispara
          diariamente às <strong>16:00 (UTC)</strong> → chama{" "}
          <code>/api/cron/backup-diario</code> → gera JSON completo → salva no
          bucket <code>backups</code> do Supabase Storage.
        </span>
      </div>

      {/* Error */}
      {erro && (
        <div className="backups-error">
          <FiAlertCircle />
          <span>{erro}</span>
          <button onClick={carregar}>Tentar novamente</button>
        </div>
      )}

      {/* Table */}
      {!erro && (
        <div className="backups-table-wrapper">
          {loading ? (
            <div className="backups-loading">
              <FiRefreshCw className="spin" />
              <span>Carregando backups…</span>
            </div>
          ) : backups.length === 0 ? (
            <div className="backups-empty">
              <FiFileText size={40} />
              <p>Nenhum backup encontrado.</p>
              <span>
                Clique em <strong>Gerar Backup Agora</strong> para criar o
                primeiro.
              </span>
            </div>
          ) : (
            <table className="backups-table">
              <thead>
                <tr>
                  <th>Arquivo</th>
                  <th>Tamanho</th>
                  <th>Gerado em</th>
                  <th className="col-actions">Ações</th>
                </tr>
              </thead>
              <tbody>
                {backups.map((b) => (
                  <tr key={b.nome}>
                    <td className="col-nome">
                      <FiFileText className="file-icon" />
                      <span>{b.nome}</span>
                    </td>
                    <td className="col-tamanho">{formatBytes(b.tamanho)}</td>
                    <td className="col-data">{formatDate(b.criado_em)}</td>
                    <td className="col-actions">
                      <button
                        className="action-btn download"
                        onClick={() => handleDownload(b.nome)}
                        disabled={downloadingId === b.nome}
                        title="Baixar backup"
                      >
                        <FiDownload />
                        {downloadingId === b.nome ? "…" : "Baixar"}
                      </button>
                      <button
                        className="action-btn delete"
                        onClick={() => setConfirmDelete(b.nome)}
                        title="Excluir backup"
                      >
                        <FiTrash2 />
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Confirm delete modal */}
      {confirmDelete && (
        <div className="backups-modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div
            className="backups-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <FiTrash2 className="modal-icon-delete" size={32} />
            <h3>Excluir backup?</h3>
            <p>
              O arquivo <strong>{confirmDelete}</strong> será removido
              permanentemente do Supabase Storage.
            </p>
            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() => setConfirmDelete(null)}
              >
                Cancelar
              </button>
              <button
                className="btn-danger"
                onClick={() => handleExcluir(confirmDelete)}
              >
                Sim, excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}