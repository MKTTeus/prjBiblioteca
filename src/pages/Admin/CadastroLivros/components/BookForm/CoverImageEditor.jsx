import React, { useEffect, useMemo, useRef, useState } from "react";
import { HiOutlineCheck, HiOutlineXMark } from "react-icons/hi2";
import "./CoverImageEditor.css";

// Só a exibição do preview — não afeta o tamanho do arquivo final gerado.
const LARGURA_PREVIEW_MAX = 320;
const LARGURA_MINIMA_PX = 50;

/**
 * CoverImageEditor
 *
 * Modal de ajuste da imagem de capa antes do upload: permite girar em passos
 * de 90° e redimensionar mantendo a proporção original (sem distorcer a
 * capa). O resultado é gerado em PNG (sem perda) e devolvido via
 * onConfirm(arquivoEditado) — a otimização/compressão final (WebP, limite de
 * 1600px) continua acontecendo no backend, no upload.
 *
 * Props:
 *  - file: File original selecionado pelo usuário
 *  - onCancel(): fecha sem aplicar nada
 *  - onConfirm(file: File): chamado com o arquivo já girado/redimensionado
 */
export default function CoverImageEditor({ file, onCancel, onConfirm }) {
  const canvasRef = useRef(null);
  const imgElRef = useRef(null);

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [rotacao, setRotacao] = useState(0); // 0 | 90 | 180 | 270
  const [naturalW, setNaturalW] = useState(0);
  const [naturalH, setNaturalH] = useState(0);
  const [largura, setLargura] = useState("");
  const [processando, setProcessando] = useState(false);

  // Dimensões do arquivo original já considerando o giro atual — 90°/270°
  // trocam largura e altura.
  const rotW = useMemo(() => (rotacao % 180 === 0 ? naturalW : naturalH), [rotacao, naturalW, naturalH]);
  const rotH = useMemo(() => (rotacao % 180 === 0 ? naturalH : naturalW), [rotacao, naturalW, naturalH]);

  const altura = useMemo(() => {
    const larguraNum = Number(largura);
    if (!rotW || !larguraNum) return 0;
    return Math.round((larguraNum / rotW) * rotH);
  }, [largura, rotW, rotH]);

  // Carrega a imagem original a partir do File selecionado. Usa FileReader
  // (data: URL) em vez de URL.createObjectURL (blob: URL) porque a CSP do
  // projeto libera "img-src 'self' data: https:" — sem blob:, uma imagem
  // carregada via createObjectURL seria bloqueada pelo navegador.
  useEffect(() => {
    let cancelado = false;
    setCarregando(true);
    setErro(null);

    const leitor = new FileReader();
    leitor.onload = () => {
      if (cancelado) return;
      const img = new Image();
      img.onload = () => {
        if (cancelado) return;
        imgElRef.current = img;
        setNaturalW(img.naturalWidth);
        setNaturalH(img.naturalHeight);
        setLargura(String(img.naturalWidth));
        setCarregando(false);
      };
      img.onerror = () => {
        if (cancelado) return;
        setErro("Não foi possível abrir essa imagem.");
        setCarregando(false);
      };
      img.src = leitor.result;
    };
    leitor.onerror = () => {
      if (cancelado) return;
      setErro("Não foi possível ler o arquivo selecionado.");
      setCarregando(false);
    };
    leitor.readAsDataURL(file);

    return () => {
      cancelado = true;
    };
  }, [file]);

  // Ao girar, volta a largura para o tamanho cheio na nova orientação —
  // evita manter um valor que só fazia sentido na orientação anterior.
  useEffect(() => {
    if (rotW) setLargura(String(rotW));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rotacao]);

  // Redesenha o preview sempre que giro ou tamanho mudam.
  useEffect(() => {
    if (carregando || erro || !canvasRef.current || !imgElRef.current || !rotW || !rotH) return;
    const escalaPreview = Math.min(1, LARGURA_PREVIEW_MAX / rotW);
    const previewW = Math.max(1, Math.round(rotW * escalaPreview));
    const previewH = Math.max(1, Math.round(rotH * escalaPreview));
    desenharNoCanvas(canvasRef.current, imgElRef.current, rotacao, naturalW, naturalH, previewW, previewH);
  }, [carregando, erro, rotacao, naturalW, naturalH, rotW, rotH]);

  function girar(delta) {
    setRotacao((r) => (((r + delta) % 360) + 360) % 360);
  }

  function handleLarguraChange(e) {
    const bruto = e.target.value;
    if (bruto === "") {
      setLargura("");
      return;
    }
    const valor = Number(bruto);
    if (Number.isNaN(valor)) return;
    setLargura(String(Math.min(Math.max(valor, LARGURA_MINIMA_PX), rotW)));
  }

  async function handleAplicar() {
    const larguraNum = Number(largura);
    if (!imgElRef.current || !larguraNum || !altura) return;
    setProcessando(true);
    try {
      const canvasFinal = document.createElement("canvas");
      desenharNoCanvas(canvasFinal, imgElRef.current, rotacao, naturalW, naturalH, larguraNum, altura);
      const blob = await new Promise((resolve) => canvasFinal.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("Falha ao gerar a imagem.");
      const nomeBase = (file.name || "capa").replace(/\.[^.]+$/, "");
      const arquivoEditado = new File([blob], `${nomeBase}-editada.png`, { type: "image/png" });
      onConfirm(arquivoEditado);
    } catch (e) {
      console.error("Erro ao processar imagem editada:", e);
      setErro("Não foi possível processar a imagem editada.");
    } finally {
      setProcessando(false);
    }
  }

  const semAlteracao = rotacao === 0 && Number(largura) === naturalW;

  return (
    <div className="cover-editor-overlay" onClick={onCancel}>
      <div className="cover-editor-box" onClick={(e) => e.stopPropagation()}>
        <div className="cover-editor-header">
          <span>Ajustar capa</span>
          <button className="cover-editor-close" onClick={onCancel} aria-label="Fechar">✕</button>
        </div>

        {erro ? (
          <div className="cover-editor-error">{erro}</div>
        ) : carregando ? (
          <div className="cover-editor-loading">
            <span className="isbn-spinner" />
            <span>Carregando imagem...</span>
          </div>
        ) : (
          <>
            <div className="cover-editor-preview-frame">
              <canvas ref={canvasRef} className="cover-editor-canvas" />
            </div>

            <div className="cover-editor-controls">
              <div className="cover-editor-control-group">
                <span className="cover-editor-control-label">Girar</span>
                <div className="cover-editor-rotate-buttons">
                  <button type="button" onClick={() => girar(-90)} title="Girar 90° à esquerda">
                    ↺ 90°
                  </button>
                  <button type="button" onClick={() => girar(90)} title="Girar 90° à direita">
                    90° ↻
                  </button>
                </div>
              </div>

              <div className="cover-editor-control-group">
                <label className="cover-editor-control-label" htmlFor="cover-editor-largura">
                  Largura (px)
                </label>
                <input
                  id="cover-editor-largura"
                  type="number"
                  min={LARGURA_MINIMA_PX}
                  max={rotW}
                  value={largura}
                  onChange={handleLarguraChange}
                />
                <span className="cover-editor-dimensoes-hint">
                  Resultado: {Number(largura) || 0} × {altura || 0} px
                  {" "}(original nesta orientação: {rotW} × {rotH} px)
                </span>
              </div>
            </div>

            <p className="cover-editor-hint">
              A proporção é sempre mantida — sem distorcer a capa. Depois do envio, o sistema
              ainda otimiza a imagem automaticamente (WebP, até 1600px).
            </p>
          </>
        )}

        <div className="cover-editor-actions">
          <button type="button" className="cover-editor-cancel" onClick={onCancel} disabled={processando}>
            <HiOutlineXMark /> Cancelar
          </button>
          <button
            type="button"
            className="cover-editor-confirm"
            onClick={handleAplicar}
            disabled={carregando || !!erro || processando || !largura}
          >
            {processando ? (
              <span className="isbn-spinner" />
            ) : (
              <HiOutlineCheck />
            )}
            <span>
              {processando
                ? "Processando..."
                : semAlteracao
                ? "Usar esta capa"
                : "Aplicar e usar esta capa"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

// Desenha a imagem original girada (múltiplo de 90°) e redimensionada para
// outW×outH no canvas informado. Como o giro é sempre múltiplo de 90°, a
// caixa girada corresponde exatamente a naturalW×naturalH ou naturalH×naturalW
// — não sobra nem falta pixel, sem precisar preencher cantos.
function desenharNoCanvas(canvas, img, rotacaoDeg, naturalW, naturalH, outW, outH) {
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, outW, outH);

  const rad = (rotacaoDeg * Math.PI) / 180;
  const rotW = rotacaoDeg % 180 === 0 ? naturalW : naturalH;
  const rotH = rotacaoDeg % 180 === 0 ? naturalH : naturalW;
  const escalaX = outW / rotW;
  const escalaY = outH / rotH;

  ctx.save();
  ctx.translate(outW / 2, outH / 2);
  ctx.rotate(rad);
  ctx.scale(escalaX, escalaY);
  ctx.drawImage(img, -naturalW / 2, -naturalH / 2, naturalW, naturalH);
  ctx.restore();
}