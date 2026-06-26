import React, { useEffect, useState, useCallback } from "react";
import Select from "react-select";
import {
  FiDownload, FiTrash2, FiRefreshCw, FiSave,
  FiDatabase, FiFileText, FiAlertCircle,
  FiRotateCcw, FiChevronDown, FiChevronUp, FiLock,
} from "react-icons/fi";
import {
  listarBackups, salvarBackup, 
  excluirBackup, restaurarBackup, 
  getConfiguracoes, updateConfiguracao,
} from "../../../../../services/api";
import { getConfigValue } from "../../utils/configUtils";
import { useRegisterSave } from "../../contexts/ConfigSaveContext";
import "./Backups.css";
import { API_URL } from "../../../../../services/apiConfig";
import { getToken } from "../../../../../services/api";

const backupOptions = [
  { value: "diario", label: "Diário" },
  { value: "semanal", label: "Semanal" },
  { value: "mensal", label: "Mensal" },
];

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
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    }).format(new Date(iso));
  } catch { return iso; }
}

function formatNum(n) {
  if (n == null) return "—";
  return n.toLocaleString("pt-BR");
}

export default function Backups() {
  const [backups, setBackups]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [salvando, setSalvando]         = useState(false);
  const [salvandoFreq, setSalvandoFreq] = useState(false);
  const [erro, setErro]                 = useState(null);
  const [toast, setToast]               = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [expandedRow, setExpandedRow]   = useState(null);
  const [frequenciaBackup, setFrequenciaBackup] = useState("diario");

  // Restore modal state
  const [confirmRestore, setConfirmRestore] = useState(null); // nome do arquivo
  const [restoreSenha, setRestoreSenha]     = useState("");
  const [restoreErro, setRestoreErro]       = useState("");
  const [restaurando, setRestaurando]       = useState(false);

  const showToast = useCallback((msg, tipo = "success") => {
    setToast({ msg, tipo });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const res = await listarBackups();
      setBackups(res.backups || []);
    } catch {
      setErro("Não foi possível carregar a lista de backups.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadConfiguracoes = useCallback(async () => {
    try {
      const configs = await getConfiguracoes();
      setFrequenciaBackup(getConfigValue(configs, "frequencia_backup", "diario"));
    } catch {
      showToast("Erro ao carregar configuração de frequência de backup.", "error");
    }
  }, [showToast]);

  useEffect(() => { carregar(); loadConfiguracoes(); }, [carregar, loadConfiguracoes]);

  const handleSalvar = async () => {
    setSalvando(true);
    try {
      const res = await salvarBackup();
      showToast(`Backup salvo: ${res.arquivo}`);
      await carregar();
    } catch {
      showToast("Erro ao gerar backup. Tente novamente.", "error");
    } finally {
      setSalvando(false);
    }
  };

  const handleDownload = async (nome) => {
    setDownloadingId(nome);
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/backup/download/${encodeURIComponent(nome)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Erro no download");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = nome;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      showToast("Erro ao baixar o backup.", "error");
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
    } catch {
      showToast("Erro ao excluir backup.", "error");
    }
  };

  const handleSalvarFrequencia = async () => {
    setSalvandoFreq(true);
    try {
      await updateConfiguracao({ chave: "frequencia_backup", valor: frequenciaBackup });
      showToast("Frequência de backup atualizada com sucesso.");
    } catch {
      showToast("Erro ao salvar frequência de backup.", "error");
    } finally {
      setSalvandoFreq(false);
    }
  };

  // Register frequency save as this tab's save handler.
  // We re-throw on error so saveAll() can detect failure.
  useRegisterSave("backups", async () => {
    await updateConfiguracao({ chave: "frequencia_backup", valor: frequenciaBackup });
  });

  const abrirRestore = (nome) => {
    setConfirmRestore(nome);
    setRestoreSenha("");
    setRestoreErro("");
  };

  const handleRestaurar = async () => {
    if (!restoreSenha.trim()) {
      setRestoreErro("Informe sua senha para confirmar.");
      return;
    }
    setRestaurando(true);
    setRestoreErro("");
    try {
      const res = await restaurarBackup(confirmRestore, restoreSenha);
      if (res.ok) {
        showToast(`Restauração concluída: ${Object.values(res.restauradas).reduce((a,b)=>a+b,0)} registros restaurados.`);
        setConfirmRestore(null);
      } else {
        const errMsg = res.erros?.map(e => e.tabela).join(", ");
        showToast(`Restauração com erros em: ${errMsg}`, "error");
        setConfirmRestore(null);
      }
    } catch (e) {
      const detail = e?.message || "";
      if (detail.toLowerCase().includes("senha") || detail.includes("401")) {
        setRestoreErro("Senha incorreta. Tente novamente.");
      } else {
        setRestoreErro("Erro ao restaurar. Verifique e tente novamente.");
      }
    } finally {
      setRestaurando(false);
    }
  };

  return (
    <div className="bk-page">

      {/* Toast */}
      {toast && (
        <div className={`bk-toast bk-toast--${toast.tipo}`}>
          {toast.tipo === "error" ? <FiAlertCircle /> : <FiDatabase />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Header */}
      <div className="bk-header">
        <div className="bk-header-text">
          <h2><FiDatabase className="bk-header-icon" /> Backups do Sistema</h2>
          <p>
            Backup automático todo dia às&nbsp;<strong>16h</strong>. Você pode
            gerar ou restaurar manualmente a qualquer momento.
          </p>
        </div>
        <div className="bk-header-actions">
          <button className="bk-btn bk-btn--outline" onClick={carregar} disabled={loading}>
            <FiRefreshCw className={loading ? "bk-spin" : ""} /> Atualizar
          </button>
          <button className="bk-btn bk-btn--primary" onClick={handleSalvar} disabled={salvando}>
            <FiSave /> {salvando ? "Gerando…" : "Gerar Backup"}
          </button>
        </div>
      </div>

      <div className="bk-config-card">
        <div className="bk-config-row">
          <div className="form-group">
            <label>Frequência de Backup</label>
            <Select
              options={backupOptions}
              value={backupOptions.find((option) => option.value === frequenciaBackup)}
              onChange={(option) => setFrequenciaBackup(option?.value || "diario")}
              styles={{
                control: (base) => ({ ...base, minHeight: 38, height: 38, fontSize: "13.5px" }),
                valueContainer: (base) => ({ ...base, padding: "0 10px" }),
                indicatorsContainer: (base) => ({ ...base, height: 38 }),
              }}
            />
          </div>
          <button className="bk-btn bk-btn--outline" onClick={handleSalvarFrequencia} disabled={salvandoFreq}>
            {salvandoFreq ? "Salvando…" : "Salvar Frequência"}
          </button>
        </div>
      </div>
      
      {/* Error */}
      {erro && (
        <div className="bk-error">
          <FiAlertCircle />
          <span>{erro}</span>
          <button onClick={carregar}>Tentar novamente</button>
        </div>
      )}

      {/* Table */}
      {!erro && (
        <div className="bk-table-wrapper">
          {loading ? (
            <div className="bk-empty">
              <FiRefreshCw className="bk-spin" size={22} />
              <span>Carregando backups…</span>
            </div>
          ) : backups.length === 0 ? (
            <div className="bk-empty">
              <FiFileText size={36} />
              <p>Nenhum backup encontrado.</p>
              <span>Clique em <strong>Gerar Backup</strong> para criar o primeiro.</span>
            </div>
          ) : (
            <table className="bk-table">
              <thead>
                <tr>
                  <th>Arquivo</th>
                  <th>Tamanho</th>
                  <th>Registros</th>
                  <th>Gerado em</th>
                  <th className="bk-col-actions">Ações</th>
                </tr>
              </thead>
              <tbody>
                {backups.map((b) => (
                  <React.Fragment key={b.nome}>
                    <tr className="bk-row">
                      <td className="bk-col-nome">
                        <FiFileText className="bk-file-icon" />
                        <span>{b.nome}</span>
                      </td>
                      <td className="bk-col-size">{formatBytes(b.tamanho)}</td>
                      <td className="bk-col-records">
                        {b.total_registros != null ? (
                          <span className="bk-badge-records">
                            {formatNum(b.total_registros)} reg.
                            {b.contagem_tabelas && (
                              <button
                                className="bk-expand-btn"
                                onClick={() => setExpandedRow(expandedRow === b.nome ? null : b.nome)}
                                title="Ver detalhes por tabela"
                              >
                                {expandedRow === b.nome ? <FiChevronUp size={13}/> : <FiChevronDown size={13}/>}
                              </button>
                            )}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="bk-col-date">{formatDate(b.criado_em)}</td>
                      <td className="bk-col-actions">
                        <div className="bk-actions-group">
                          <button
                            className="bk-action-btn bk-action-btn--download"
                            onClick={() => handleDownload(b.nome)}
                            disabled={downloadingId === b.nome}
                            title="Baixar backup"
                          >
                            <FiDownload />
                            <span>{downloadingId === b.nome ? "…" : "Baixar"}</span>
                          </button>
                          <button
                            className="bk-action-btn bk-action-btn--restore"
                            onClick={() => abrirRestore(b.nome)}
                            title="Restaurar a este ponto"
                          >
                            <FiRotateCcw />
                            <span>Restaurar</span>
                          </button>
                          <button
                            className="bk-action-btn bk-action-btn--delete"
                            onClick={() => setConfirmDelete(b.nome)}
                            title="Excluir backup"
                          >
                            <FiTrash2 />
                            <span>Excluir</span>
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded: contagem por tabela */}
                    {expandedRow === b.nome && b.contagem_tabelas && (
                      <tr className="bk-row-expanded">
                        <td colSpan={5}>
                          <div className="bk-tabelas-grid">
                            {Object.entries(b.contagem_tabelas)
                              .filter(([, v]) => v > 0)
                              .map(([tabela, qtd]) => (
                                <div key={tabela} className="bk-tabela-chip">
                                  <span className="bk-chip-nome">{tabela}</span>
                                  <span className="bk-chip-qtd">{formatNum(qtd)}</span>
                                </div>
                              ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Modal: Confirmar exclusão */}
      {confirmDelete && (
        <div className="bk-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="bk-modal" onClick={e => e.stopPropagation()}>
            <FiTrash2 className="bk-modal-icon bk-modal-icon--danger" size={30} />
            <h3>Excluir backup?</h3>
            <p>O arquivo <strong>{confirmDelete}</strong> será removido permanentemente.</p>
            <div className="bk-modal-actions">
              <button className="bk-btn bk-btn--ghost" onClick={() => setConfirmDelete(null)}>Cancelar</button>
              <button className="bk-btn bk-btn--danger" onClick={() => handleExcluir(confirmDelete)}>Excluir</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Restaurar com senha */}
      {confirmRestore && (
        <div className="bk-overlay" onClick={() => !restaurando && setConfirmRestore(null)}>
          <div className="bk-modal bk-modal--restore" onClick={e => e.stopPropagation()}>
            <FiRotateCcw className="bk-modal-icon bk-modal-icon--restore" size={30} />
            <h3>Restaurar banco de dados?</h3>
            <p>
              Todos os dados atuais serão <strong>sobrescritos</strong> pelos dados do arquivo:
            </p>
            <div className="bk-restore-filename">{confirmRestore}</div>
            <p className="bk-restore-warning">
              <FiAlertCircle size={14} /> Esta ação não pode ser desfeita. Confirme com sua senha de administrador.
            </p>
            <div className="bk-password-field">
              <FiLock className="bk-lock-icon" />
              <input
                type="password"
                placeholder="Senha do administrador"
                value={restoreSenha}
                onChange={e => { setRestoreSenha(e.target.value); setRestoreErro(""); }}
                onKeyDown={e => e.key === "Enter" && handleRestaurar()}
                autoFocus
                disabled={restaurando}
              />
            </div>
            {restoreErro && <div className="bk-field-error"><FiAlertCircle size={13}/> {restoreErro}</div>}
            <div className="bk-modal-actions">
              <button
                className="bk-btn bk-btn--ghost"
                onClick={() => setConfirmRestore(null)}
                disabled={restaurando}
              >
                Cancelar
              </button>
              <button
                className="bk-btn bk-btn--restore"
                onClick={handleRestaurar}
                disabled={restaurando || !restoreSenha}
              >
                <FiRotateCcw /> {restaurando ? "Restaurando…" : "Restaurar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}