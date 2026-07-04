import React, { useCallback, useEffect, useState } from "react";
import {
  HiOutlineSparkles,
  HiOutlineRefresh,
  HiOutlinePencil,
  HiOutlineDownload,
  HiOutlineClipboard,
  HiOutlinePrinter,
  HiOutlineCheck,
  HiOutlineX,
  HiOutlineExclamation,
} from "react-icons/hi";
import { useAuth } from "../../../../../contexts/AuthContext";
import {
  getFichaCatalografica,
  gerarFichaCatalografica,
  updateFichaCatalografica,
} from "../../../../../services/api";
import "./BookInfoModal.css";
export default function BookInfoModal({ book, onClose }) {
  const { user } = useAuth();
  const isAdmin = user?.tipo === "admin";
  const [ficha, setFicha] = useState(null);
  const [fichaStatus, setFichaStatus] = useState("idle"); // idle | loading | generating | error | done
  const [fichaError, setFichaError] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editTexto, setEditTexto] = useState("");
  const [editCDD, setEditCDD] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const carregarFicha = useCallback(async () => {
    if (!book?.idLivro) return;
    setFichaStatus("loading");
    setFichaError(null);
    try {
      const data = await getFichaCatalografica(book.idLivro);
      setFicha(data);
      setFichaStatus("done");
    } catch (err) {
      if (err?.status === 404) {
        setFichaStatus("inexistente");
      } else {
        setFichaError("Erro ao carregar a ficha catalográfica.");
        setFichaStatus("error");
      }
    }
  }, [book?.idLivro]);
  useEffect(() => {
    carregarFicha();
  }, [carregarFicha]);
  if (!book) return null;
  const tombos = book.exemplares || [];
  const tombosDisponiveis = tombos.filter((t) => (t.exeLivStatus || "").toLowerCase() === "disponível");
  async function handleGerar() {
    setFichaStatus("generating");
    setFichaError(null);
    try {
      const data = await gerarFichaCatalografica(book.idLivro);
      setFicha(data);
      setFichaStatus("done");
    } catch (err) {
      const detail = err?.data?.detail || "Erro ao gerar a ficha catalográfica.";
      setFichaError(typeof detail === "string" ? detail : "Erro ao gerar a ficha catalográfica.");
      setFichaStatus("error");
    }
  }
  function handleEditToggle() {
    if (!editMode) {
      setEditTexto(ficha?.fichaTexto || "");
      setEditCDD(ficha?.fichaJson?.cdd || "");
    }
    setEditMode((prev) => !prev);
  }
  async function handleSalvarEdicao() {
    setSavingEdit(true);
    try {
      const updated = await updateFichaCatalografica(book.idLivro, {
        ficTexto: editTexto,
        ficCDD: editCDD || null,
        ficRevisada: true,
      });
      setFicha(updated);
      setEditMode(false);
    } catch (err) {
      alert("Erro ao salvar alterações. Tente novamente.");
    } finally {
      setSavingEdit(false);
    }
  }
  function handleCopiar() {
    if (!ficha?.fichaTexto) return;
    navigator.clipboard.writeText(ficha.fichaTexto).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  }
  function handleExportarPDF() {
    if (!ficha?.fichaTexto) return;
    const titulo = book.livTitulo || "Livro";
    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <title>Ficha Catalográfica — ${titulo}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Courier New', Courier, monospace; color: #111; background: #fff; padding: 40px; }
    header { border-bottom: 2px solid #4f46e5; padding-bottom: 14px; margin-bottom: 28px; display: flex; justify-content: space-between; align-items: flex-end; }
    header h1 { font-size: 16px; font-weight: 700; color: #4f46e5; font-family: Arial, sans-serif; }
    header .sub { font-size: 11px; color: #64748b; font-family: Arial, sans-serif; }
    .ficha-box { border: 2px solid #333; max-width: 520px; margin: 0 auto; padding: 28px 32px; font-size: 13px; line-height: 1.7; }
    .ficha-autor { font-weight: bold; margin-bottom: 12px; }
    .ficha-titulo { margin-left: 28px; text-indent: -14px; margin-bottom: 8px; }
    .ficha-pub { margin-left: 28px; margin-bottom: 8px; }
    .ficha-desc { margin-left: 28px; margin-bottom: 8px; }
    .ficha-isbn { margin-left: 28px; margin-bottom: 12px; }
    .ficha-assuntos { margin-left: 28px; margin-bottom: 12px; }
    .ficha-cdd { text-align: right; font-weight: bold; margin-top: 14px; border-top: 1px solid #333; padding-top: 8px; }
    footer { margin-top: 32px; font-size: 10px; color: #94a3b8; text-align: center; font-family: Arial, sans-serif; }
    @media print { body { padding: 20px 30px; } @page { margin: 2cm; size: A4; } }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>Ficha Catalográfica</h1>
      <div class="sub">${titulo}</div>
    </div>
    <div class="sub">Gerado em: ${new Date().toLocaleString("pt-BR")}</div>
  </header>
  <div class="ficha-box">
    ${ficha.fichaHtml || ficha.fichaTexto.split("\n\n").map((p, i) => `<div class="ficha-${["autor","titulo","pub","desc","isbn","assuntos","cdd"][i] || "item"}">${p.replace(/\n/g,"<br/>")}</div>`).join("")}
  </div>
  <footer>Documento gerado automaticamente pelo sistema de gerenciamento da biblioteca.</footer>
  <script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); }</script>
</body>
</html>`;
    const win = window.open("", "_blank", "width=800,height=700");
    if (!win) { alert("Permita pop-ups para exportar o PDF."); return; }
    win.document.write(html);
    win.document.close();
  }
  function handleImprimir() {
    handleExportarPDF();
  }
  function renderFichaSection() {
    return (
      <div className="ficha-section">
        <div className="ficha-section-header">
          <h3>Ficha Catalográfica</h3>
          {fichaStatus === "done" && isAdmin && (
            <div className="ficha-actions">
              {!editMode && (
                <>
                  <button
                    className="ficha-btn ficha-btn--secondary"
                    onClick={handleGerar}
                    title="Regenerar ficha com IA"
                  >
                    <HiOutlineRefresh /> Regenerar
                  </button>
                  <button
                    className="ficha-btn ficha-btn--secondary"
                    onClick={handleEditToggle}
                    title="Editar ficha manualmente"
                  >
                    <HiOutlinePencil /> Editar
                  </button>
                </>
              )}
              {editMode && (
                <>
                  <button
                    className="ficha-btn ficha-btn--primary"
                    onClick={handleSalvarEdicao}
                    disabled={savingEdit}
                  >
                    <HiOutlineCheck /> {savingEdit ? "Salvando..." : "Salvar"}
                  </button>
                  <button
                    className="ficha-btn ficha-btn--ghost"
                    onClick={handleEditToggle}
                    disabled={savingEdit}
                  >
                    <HiOutlineX /> Cancelar
                  </button>
                </>
              )}
              {!editMode && (
                <>
                  <button className="ficha-btn ficha-btn--ghost" onClick={handleCopiar} title="Copiar texto">
                    {copiado ? <HiOutlineCheck /> : <HiOutlineClipboard />} {copiado ? "Copiado!" : "Copiar"}
                  </button>
                  <button className="ficha-btn ficha-btn--ghost" onClick={handleExportarPDF} title="Exportar PDF">
                    <HiOutlineDownload /> PDF
                  </button>
                  <button className="ficha-btn ficha-btn--ghost" onClick={handleImprimir} title="Imprimir">
                    <HiOutlinePrinter /> Imprimir
                  </button>
                </>
              )}
            </div>
          )}
          {fichaStatus === "inexistente" && isAdmin && (
            <div className="ficha-actions">
              <button className="ficha-btn ficha-btn--primary" onClick={handleGerar}>
                <HiOutlineSparkles /> Gerar Ficha
              </button>
            </div>
          )}
        </div>
        {/* ── Estados ── */}
        {fichaStatus === "loading" && (
          <div className="ficha-state ficha-state--loading">
            <span className="ficha-spinner" />
            Carregando ficha catalográfica...
          </div>
        )}
        {fichaStatus === "generating" && (
          <div className="ficha-state ficha-state--generating">
            <span className="ficha-spinner ficha-spinner--accent" />
            Gerando ficha com IA... Aguarde um momento.
          </div>
        )}
        {fichaStatus === "error" && (
          <div className="ficha-state ficha-state--error">
            <HiOutlineExclamation className="ficha-state-icon" />
            <div>
              <strong>Erro</strong>
              <p>{fichaError || "Não foi possível processar a ficha."}</p>
              {isAdmin && (
                <button className="ficha-btn ficha-btn--secondary" style={{ marginTop: 8 }} onClick={handleGerar}>
                  Tentar novamente
                </button>
              )}
            </div>
          </div>
        )}
        {fichaStatus === "inexistente" && (
          <div className="ficha-state ficha-state--empty">
            <HiOutlineSparkles className="ficha-state-icon" />
            <div>
              <strong>Ficha ainda não gerada</strong>
              <p>Clique em &quot;Gerar Ficha&quot; para criar automaticamente a ficha catalográfica deste livro.</p>
            </div>
          </div>
        )}
        {fichaStatus === "done" && ficha && !editMode && (
          <>
            {(ficha.geradaPorIA || ficha.classificacaoSugerida) && (
              <div className="ficha-badge-ia">
                <HiOutlineSparkles /> CDD sugerida pela IA — confira antes de publicar
              </div>
            )}
            <div
              className="ficha-card"
              dangerouslySetInnerHTML={{ __html: ficha.fichaHtml || ficha.fichaTexto }}
            />
          </>
        )}
        {fichaStatus === "done" && ficha && editMode && (
          <div className="ficha-edit-area">
            <label className="ficha-edit-label">
              <span>Código CDD</span>
              <input
                className="ficha-edit-input-cdd"
                value={editCDD}
                onChange={(e) => setEditCDD(e.target.value)}
                placeholder="Ex.: 823.914"
              />
            </label>
            <label className="ficha-edit-label">
              <span>Texto completo da ficha</span>
              <textarea
                className="ficha-edit-textarea"
                value={editTexto}
                onChange={(e) => setEditTexto(e.target.value)}
                rows={14}
                spellCheck
              />
            </label>
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <h2>Informações do Livro</h2>
          <button onClick={onClose}>✕</button>
        </div>
        <div className="modal-content info-layout">
          <div className="info-capa">
            <img
              src={book.livCapaURL || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='220' viewBox='0 0 150 220'%3E%3Crect fill='%23e0e0e0' width='150' height='220'/%3E%3Ctext x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='12' fill='%23999'%3ESem capa%3C/text%3E%3C/svg%3E"}
              onError={(e) => {
                e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='220' viewBox='0 0 150 220'%3E%3Crect fill='%23e0e0e0' width='150' height='220'/%3E%3Ctext x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='12' fill='%23999'%3ESem capa%3C/text%3E%3C/svg%3E";
              }}
              alt={book.livTitulo}
            />
          </div>
          <div className="info-dados">
            <h3>{book.livTitulo}</h3>
            <p><b>Autor:</b> {book.livAutor}</p>
            <p><b>Editora:</b> {book.livEditora}</p>
            <p><b>Ano:</b> {book.livAnoPublicacao}</p>
            <p><b>Páginas:</b> {book.livPaginas}</p>
            {book.livCategoria && (
              <p><b>Categoria:</b> {book.livCategoria}</p>
            )}
            {book.livGenero && (
              <p><b>Gênero:</b> {book.livGenero}</p>
            )}
            {book.livCDD && (
              <p>
                <b>CDD:</b> {book.livCDD}
                {book.livCDDSugerida && (
                  <span className="cdd-sugerida-badge"> (sugerida por IA)</span>
                )}
              </p>
            )}
            <div className="info-descricao">
              <h4>Descrição</h4>
              <p>{book.livDescricao || "Sem descrição"}</p>
            </div>
          </div>
        </div>
        {/* ── Ficha Catalográfica ── */}
        {renderFichaSection()}
        {/* ── Exemplares ── */}
        <div className="tombos-section">
          <h3>Exemplares (Tombos)</h3>
          {tombos.length === 0 ? (
            <p>Nenhum exemplar cadastrado</p>
          ) : (
            <>
              <div className="tombos-summary">
                <div className="tombos-summary-item">
                  <strong>{tombos.length}</strong>
                  <span>Total</span>
                </div>
                <div className="tombos-summary-item">
                  <strong>{tombosDisponiveis.length}</strong>
                  <span>Disponíveis</span>
                </div>
                <div className="tombos-summary-item">
                  <strong>{tombos.length - tombosDisponiveis.length}</strong>
                  <span>Emprestados</span>
                </div>
              </div>
              <div className="tombos-grid">
                {tombos.map((t) => {
                  const status = t.exeLivStatus || (t.disponivel ? "Disponível" : "Indisponível");
                  const codigo = t.exeLivTombo || t.tomboCodigo || "-";
                  const isDisponivel = status.toLowerCase() === "disponível";
                  return (
                    <div
                      key={t.idExemplar || codigo}
                      className={`tombo-card ${isDisponivel ? "disponivel" : "indisponivel"}`}
                    >
                      <div className="tombo-code">{codigo}</div>
                      <div className="tombo-meta">
                        <span className="tombo-status">{status}</span>
                        <span className="tombo-isbn">ISBN: {t.exeLivISBN || "-"}</span>
                        <span className="tombo-desc">{t.exeLivDescricao || "Sem descrição"}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
