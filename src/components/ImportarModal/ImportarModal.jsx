import React, { useState, useRef } from "react";
import "./ImportarModal.css";
import { Upload, FileSpreadsheet, X, AlertCircle, CheckCircle, Info } from "lucide-react";

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
      setResultado({ importados: 0, ignorados: 0, erros: ["Falha na importação. Verifique o arquivo."] });
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
    <div className="importar-overlay" onClick={handleFechar}>
      <div className="importar-box" onClick={(e) => e.stopPropagation()}>

        <div className="importar-header">
          <h2>{titulo}</h2>
          <button className="btn-fechar" onClick={handleFechar}>
            <X size={18} />
          </button>
        </div>

        <div className="importar-body">
          <p className="importar-instrucao">
            Envie um arquivo <strong>.xlsx</strong> ou <strong>.csv</strong> com as colunas na primeira linha.
          </p>

          <div className="importar-senha-aviso">
            <Info size={15} />
            Os usuários serão cadastrados com a senha padrão <strong>&nbsp;mudar@123</strong>
          </div>

          <div
            className={`importar-dropzone${arquivo ? " tem-arquivo" : ""}`}
            onClick={() => inputRef.current.click()}
          >
            <div className="importar-dropzone-icon">
              <FileSpreadsheet size={36} />
            </div>
            <p className={arquivo ? "nome-arquivo" : ""}>
              {arquivo ? arquivo.name : "Clique para selecionar o arquivo"}
            </p>
            {!arquivo && <p style={{ marginTop: 4, fontSize: "0.75rem" }}>.xlsx ou .csv</p>}
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.csv"
              style={{ display: "none" }}
              onChange={handleArquivo}
            />
          </div>

          {resultado && (
            <div className="importar-resultado">
              <p className="res-sucesso">
                <CheckCircle size={16} /> {resultado.importados} importado(s) com sucesso
              </p>
              {resultado.ignorados > 0 && (
                <p className="res-ignorados">
                  <AlertCircle size={16} /> {resultado.ignorados} ignorado(s)
                </p>
              )}
              {resultado.erros?.length > 0 && (
                <ul className="res-erros">
                  {resultado.erros.map((e, i) => (
                    <li key={i}><AlertCircle size={13} /> {e}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="importar-footer">
          <button className="btn-cancelar" onClick={handleFechar}>Fechar</button>
          <button
            className="btn-importar-acao"
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