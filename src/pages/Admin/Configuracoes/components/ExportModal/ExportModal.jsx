import { useState } from "react";
import { FiX, FiDownload, FiFileText, FiCode, FiLoader } from "react-icons/fi";
import { getConfiguracoes } from "../../../../../services/api";
import "./ExportModal.css";

const LABELS = {
  // Geral
  nome_biblioteca: "Nome da Biblioteca",
  dias_emprestimo: "Dias de Empréstimo",
  maximo_renovacoes: "Máximo de Renovações",
  livros_por_aluno: "Livros por Aluno",
  tema: "Tema",
  // Notificações
  notificacao_email: "Notificações por E-mail",
  notificacao_sms: "Notificações por SMS",
  lembrete_atraso: "Lembretes de Atraso",
  lembrete_devolucao: "Lembretes de Devolução",
  dias_antecedencia_lembrete: "Dias de Antecedência para Lembrete",
  // Segurança
  timeout_sessao: "Timeout da Sessão (min)",
  tamanho_minimo_senha: "Tamanho Mínimo da Senha",
  exigir_senha_forte: "Exigir Senha Forte",
  autenticacao_dois_fatores: "Autenticação de Dois Fatores",
  // E-mail
  smtp_servidor: "Servidor SMTP",
  smtp_porta: "Porta SMTP",
  smtp_usuario: "Usuário SMTP",
  smtp_senha: "Senha SMTP",
  // Backups
  frequencia_backup: "Frequência de Backup",
  // Avançado
  modo_debug: "Modo de Debug",
  modo_manutencao: "Modo de Manutenção",
  log_api: "Log da API",
};

const SECTIONS = [
  { label: "Geral", keys: ["nome_biblioteca", "dias_emprestimo", "maximo_renovacoes", "livros_por_aluno", "tema"] },
  { label: "Notificações", keys: ["notificacao_email", "notificacao_sms", "lembrete_atraso", "lembrete_devolucao", "dias_antecedencia_lembrete"] },
  { label: "Segurança", keys: ["timeout_sessao", "tamanho_minimo_senha", "exigir_senha_forte", "autenticacao_dois_fatores"] },
  { label: "E-mail", keys: ["smtp_servidor", "smtp_porta", "smtp_usuario", "smtp_senha"] },
  { label: "Backups", keys: ["frequencia_backup"] },
  { label: "Avançado", keys: ["modo_debug", "modo_manutencao", "log_api"] },
];

function buildConfigMap(configs) {
  const map = {};
  if (!Array.isArray(configs)) return map;
  configs.forEach(({ chave, valor }) => { map[chave] = valor; });
  return map;
}

function maskSenha(chave, valor) {
  if (chave === "smtp_senha" && valor) return "••••••••";
  return valor ?? "—";
}

function exportJSON(configs) {
  const map = buildConfigMap(configs);
  // Remove senha do JSON por segurança
  const safe = { ...map, smtp_senha: undefined };
  delete safe.smtp_senha;

  const blob = new Blob([JSON.stringify(safe, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `configuracoes-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportPDF(configs, nomeBiblioteca) {
  const map = buildConfigMap(configs);
  const date = new Date().toLocaleString("pt-BR");

  const sectionsHTML = SECTIONS.map(({ label, keys }) => {
    const rows = keys.map((key) => {
      const valor = maskSenha(key, map[key]);
      return `
        <tr>
          <td class="col-label">${LABELS[key] ?? key}</td>
          <td class="col-value">${valor}</td>
        </tr>`;
    }).join("");

    return `
      <div class="section">
        <div class="section-title">${label}</div>
        <table>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }).join("");

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <title>Configurações do Sistema</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; background: #fff; padding: 32px 40px; }
    header { border-bottom: 2px solid #6366f1; padding-bottom: 16px; margin-bottom: 28px; display: flex; justify-content: space-between; align-items: flex-end; }
    header h1 { font-size: 22px; font-weight: 700; color: #4f46e5; }
    header .meta { font-size: 12px; color: #64748b; text-align: right; line-height: 1.6; }
    .section { margin-bottom: 24px; break-inside: avoid; }
    .section-title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #6366f1; background: #eef2ff; padding: 6px 12px; border-radius: 6px; margin-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
    tr:nth-child(even) { background: #f8fafc; }
    td { padding: 7px 12px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
    .col-label { color: #475569; width: 52%; font-weight: 500; }
    .col-value { color: #1e293b; }
    footer { margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 11px; color: #94a3b8; text-align: center; }
    .notice { font-size: 11px; color: #94a3b8; margin-top: 4px; }
    @media print {
      body { padding: 16px 24px; }
      @page { margin: 1.5cm; size: A4; }
    }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>${nomeBiblioteca || "Biblioteca"}</h1>
      <div class="notice">Relatório de Configurações do Sistema</div>
    </div>
    <div class="meta">
      <div>Gerado em: ${date}</div>
      <div>⚠ Senha SMTP ocultada por segurança</div>
    </div>
  </header>
  ${sectionsHTML}
  <footer>Documento gerado automaticamente pelo sistema de gerenciamento da biblioteca.</footer>
  <script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); }</script>
</body>
</html>`;

  const win = window.open("", "_blank", "width=800,height=700");
  if (!win) {
    alert("Permita pop-ups para gerar o PDF.");
    return;
  }
  win.document.write(html);
  win.document.close();
}

export default function ExportModal({ onClose }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handle(format) {
    setLoading(true);
    setError(null);
    try {
      const configs = await getConfiguracoes();
      const nomeBiblioteca = localStorage.getItem("nomeBiblioteca") || "Biblioteca";
      if (format === "json") {
        exportJSON(configs);
        onClose();
      } else {
        exportPDF(configs, nomeBiblioteca);
        onClose();
      }
    } catch {
      setError("Erro ao carregar configurações. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="export-overlay" onClick={onClose}>
      <div className="export-modal" onClick={(e) => e.stopPropagation()}>
        <div className="export-modal-header">
          <h3>Exportar Configurações</h3>
          <button className="export-close-btn" onClick={onClose} aria-label="Fechar">
            <FiX size={18} />
          </button>
        </div>

        <p className="export-subtitle">
          Escolha o formato para exportar todas as configurações atuais do sistema.
        </p>

        {error && <div className="export-error">{error}</div>}

        <div className="export-options">
          <button
            className="export-option-btn"
            onClick={() => handle("json")}
            disabled={loading}
          >
            <div className="export-option-icon json-icon">
              <FiCode size={26} />
            </div>
            <div className="export-option-info">
              <span className="export-option-title">JSON</span>
              <span className="export-option-desc">Arquivo estruturado para importação ou backup</span>
            </div>
            {loading ? <FiLoader className="export-spinner" size={16} /> : <FiDownload size={16} className="export-arrow" />}
          </button>

          <button
            className="export-option-btn"
            onClick={() => handle("pdf")}
            disabled={loading}
          >
            <div className="export-option-icon pdf-icon">
              <FiFileText size={26} />
            </div>
            <div className="export-option-info">
              <span className="export-option-title">PDF</span>
              <span className="export-option-desc">Relatório formatado para impressão ou arquivo</span>
            </div>
            {loading ? <FiLoader className="export-spinner" size={16} /> : <FiDownload size={16} className="export-arrow" />}
          </button>
        </div>

        <p className="export-notice">⚠ A senha SMTP é ocultada em ambos os formatos.</p>
      </div>
    </div>
  );
}