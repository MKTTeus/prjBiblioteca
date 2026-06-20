import React, { useState, useRef } from "react";
import { Upload, FileSpreadsheet, X, AlertCircle, CheckCircle } from "lucide-react";

export default function ImportarModal({ aberto, titulo, onClose, onImportar }) {
  const [arquivo, setArquivo] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const inputRef = useRef();

  if (!aberto) return null;

  const handleArquivo = (e) => {
    setArquivo(e.target.files[0]);
    setResultado(null);
  };

  const handleImportar = async () => {
    if (!arquivo) return;
    setCarregando(true);
    try {
      const res = await onImportar(arquivo);
      setResultado(res);
    } catch (err) {
      setResultado({ erros: ["Falha na importação. Verifique o arquivo."] });
    } finally {
      setCarregando(false);
    }
  };

  const handleFechar = () => {
    setArquivo(null);
    setResultado(null);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleFechar}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <h2>{titulo}</h2>
          <button className="btn-close" onClick={handleFechar}><X size={18} /></button>
        </div>

        <div className="modal-body" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Instruções */}
          <p style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
            Envie um arquivo <strong>.xlsx</strong> com as colunas na primeira linha.
          </p>

          {/* Área de upload */}
          <div
            onClick={() => inputRef.current.click()}
            style={{
              border: "2px dashed var(--border)",
              borderRadius: 8,
              padding: "2rem",
              textAlign: "center",
              cursor: "pointer",
              background: arquivo ? "var(--bg-subtle)" : "transparent",
            }}
          >
            <FileSpreadsheet size={32} style={{ color: "var(--primary)", marginBottom: 8 }} />
            <p style={{ margin: 0, fontSize: "0.875rem" }}>
              {arquivo ? arquivo.name : "Clique para selecionar o arquivo"}
            </p>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.csv"
              style={{ display: "none" }}
              onChange={handleArquivo}
            />
          </div>

          {/* Resultado */}
          {resultado && (
            <div style={{ fontSize: "0.875rem" }}>
              <p style={{ color: "var(--green)", display: "flex", alignItems: "center", gap: 6 }}>
                <CheckCircle size={16} /> {resultado.importados} importado(s) com sucesso
              </p>
              {resultado.ignorados > 0 && (
                <p style={{ color: "var(--yellow)" }}>
                  {resultado.ignorados} ignorado(s)
                </p>
              )}
              {resultado.erros?.length > 0 && (
                <ul style={{ color: "var(--red)", paddingLeft: 16, margin: "0.5rem 0 0" }}>
                  {resultado.erros.map((e, i) => (
                    <li key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <AlertCircle size={13} /> {e}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ padding: "1rem 1.5rem", display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button className="btn-cancelar" onClick={handleFechar}>Fechar</button>
          <button
            className="btn-salvar"
            onClick={handleImportar}
            disabled={!arquivo || carregando}
          >
            <Upload size={16} />
            {carregando ? "Importando..." : "Importar"}
          </button>
        </div>
      </div>
    </div>
  );
}