import React, { useEffect, useMemo, useRef, useState } from "react";
import { HiOutlineCheck, HiOutlineXMark, HiOutlineArrowsPointingOut } from "react-icons/hi2";
import "./CoverImageEditor.css";

// Tamanho máximo do palco de recorte na tela — só afeta a exibição, não o
// tamanho do arquivo final gerado (o recorte é sempre calculado em cima da
// imagem original, em resolução cheia).
const PALCO_LARGURA_MAX = 420;
const PALCO_ALTURA_MAX = 440;
const LARGURA_MINIMA_PX = 50;
const RECORTE_MINIMO_PX = 30; // tamanho mínimo da seleção, em pixels da imagem original

const TIPOS_ALCA = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

function clamp(valor, min, max) {
  return Math.min(Math.max(valor, min), max);
}

/**
 * CoverImageEditor
 *
 * Modal de ajuste da imagem de capa antes do upload: permite girar em passos
 * de 90° e recortar/redimensionar arrastando uma seleção com grade (como um
 * cortador de foto), mantendo a proporção escolhida na seleção. O resultado
 * é gerado em PNG (sem perda) e devolvido via onConfirm(arquivoEditado) — a
 * otimização/compressão final (WebP, limite de 1600px) continua acontecendo
 * no backend, no upload.
 *
 * Props:
 *  - file: File original selecionado pelo usuário (upload local, link da
 *    web já baixado pelo backend, ou capa já salva no livro)
 *  - onCancel(): fecha sem aplicar nada
 *  - onConfirm(file: File): chamado com o arquivo já girado/recortado
 */
export default function CoverImageEditor({ file, onCancel, onConfirm }) {
  const imgElRef = useRef(null);
  const arrastoRef = useRef(null);

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [dataUrl, setDataUrl] = useState("");
  const [rotacao, setRotacao] = useState(0); // 0 | 90 | 180 | 270
  const [naturalW, setNaturalW] = useState(0);
  const [naturalH, setNaturalH] = useState(0);
  const [recorte, setRecorte] = useState(null); // { x, y, w, h } no espaço da imagem já girada
  const [largura, setLargura] = useState("");
  const [processando, setProcessando] = useState(false);
  const [arrastando, setArrastando] = useState(false);

  // Dimensões do arquivo original já considerando o giro atual — 90°/270°
  // trocam largura e altura.
  const rotW = useMemo(() => (rotacao % 180 === 0 ? naturalW : naturalH), [rotacao, naturalW, naturalH]);
  const rotH = useMemo(() => (rotacao % 180 === 0 ? naturalH : naturalW), [rotacao, naturalW, naturalH]);

  // Escala do palco na tela — sempre cabe dentro do limite máximo, então a
  // imagem nunca "vaza" do quadro, independentemente do tamanho original.
  const escala = useMemo(() => {
    if (!rotW || !rotH) return 1;
    return Math.min(1, PALCO_LARGURA_MAX / rotW, PALCO_ALTURA_MAX / rotH);
  }, [rotW, rotH]);

  const palcoW = Math.max(1, Math.round(rotW * escala));
  const palcoH = Math.max(1, Math.round(rotH * escala));
  // Tamanho da <img> ANTES do giro via CSS — o giro (múltiplo de 90°) troca
  // largura/altura visualmente, então a caixa da imagem precisa ser
  // desenhada na orientação original para que, depois de girada, sua caixa
  // delimitadora bata exatamente com o palco (naturalH×naturalW == rotW×rotH).
  const imgTelaW = Math.max(1, Math.round(naturalW * escala));
  const imgTelaH = Math.max(1, Math.round(naturalH * escala));

  const altura = useMemo(() => {
    const larguraNum = Number(largura);
    if (!recorte || !recorte.w || !larguraNum) return 0;
    return Math.round((larguraNum / recorte.w) * recorte.h);
  }, [largura, recorte]);

  // Carrega a imagem original a partir do File selecionado. Usa FileReader
  // (data: URL) em vez de URL.createObjectURL (blob: URL) porque a CSP do
  // projeto libera "img-src 'self' data: https:" — sem blob:, uma imagem
  // carregada via createObjectURL seria bloqueada pelo navegador.
  useEffect(() => {
    let cancelado = false;
    setCarregando(true);
    setErro(null);
    setRecorte(null);

    const leitor = new FileReader();
    leitor.onload = () => {
      if (cancelado) return;
      const img = new Image();
      img.onload = () => {
        if (cancelado) return;
        imgElRef.current = img;
        setDataUrl(leitor.result);
        setNaturalW(img.naturalWidth);
        setNaturalH(img.naturalHeight);
        setRecorte({ x: 0, y: 0, w: img.naturalWidth, h: img.naturalHeight });
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

  // Ao girar, a seleção anterior não faz mais sentido na nova orientação —
  // volta a cobrir a imagem inteira, como ao carregar pela primeira vez.
  function girar(delta) {
    setRotacao((r) => {
      const nova = (((r + delta) % 360) + 360) % 360;
      const novoRotW = nova % 180 === 0 ? naturalW : naturalH;
      const novoRotH = nova % 180 === 0 ? naturalH : naturalW;
      setRecorte({ x: 0, y: 0, w: novoRotW, h: novoRotH });
      setLargura(String(novoRotW));
      return nova;
    });
  }

  function redefinirSelecao() {
    if (!rotW || !rotH) return;
    setRecorte({ x: 0, y: 0, w: rotW, h: rotH });
    setLargura(String(rotW));
  }

  function handleLarguraChange(e) {
    const bruto = e.target.value;
    if (bruto === "") {
      setLargura("");
      return;
    }
    const valor = Number(bruto);
    if (Number.isNaN(valor)) return;
    const maximo = recorte ? recorte.w : rotW;
    setLargura(String(Math.min(Math.max(valor, LARGURA_MINIMA_PX), maximo || LARGURA_MINIMA_PX)));
  }

  // ── Arrastar a seleção (mover) ou suas alças (redimensionar) ────────
  function iniciarArrasto(tipo, evento) {
    if (!recorte || !rotW || !rotH) return;
    evento.preventDefault();
    evento.stopPropagation();

    const ponteiroInicial = { x: evento.clientX, y: evento.clientY };
    const recorteInicial = { ...recorte };
    arrastoRef.current = { tipo, ponteiroInicial, recorteInicial };
    setArrastando(true);

    function mover(e) {
      const a = arrastoRef.current;
      if (!a) return;
      const dx = (e.clientX - a.ponteiroInicial.x) / escala;
      const dy = (e.clientY - a.ponteiroInicial.y) / escala;
      setRecorte(calcularNovoRecorte(a.tipo, a.recorteInicial, dx, dy, rotW, rotH, RECORTE_MINIMO_PX));
    }

    function finalizar() {
      window.removeEventListener("pointermove", mover);
      window.removeEventListener("pointerup", finalizar);
      arrastoRef.current = null;
      setArrastando(false);
      // Depois de redimensionar a seleção, a largura de saída volta a
      // acompanhar o tamanho cheio do recorte — evita manter um valor de
      // downscale que já não faz mais sentido pra área nova.
      setRecorte((atual) => {
        if (atual) setLargura(String(Math.round(atual.w)));
        return atual;
      });
    }

    window.addEventListener("pointermove", mover);
    window.addEventListener("pointerup", finalizar);
  }

  async function handleAplicar() {
    const larguraNum = Number(largura);
    if (!imgElRef.current || !recorte || !larguraNum || !altura) return;
    setProcessando(true);
    try {
      // 1) desenha a imagem inteira já girada, em resolução original.
      const canvasGirado = document.createElement("canvas");
      desenharNoCanvas(canvasGirado, imgElRef.current, rotacao, naturalW, naturalH, rotW, rotH);

      // 2) recorta só a área selecionada e redimensiona para a largura de
      // saída escolhida, sem distorcer (a altura é sempre proporcional).
      const canvasFinal = document.createElement("canvas");
      canvasFinal.width = larguraNum;
      canvasFinal.height = altura;
      const ctx = canvasFinal.getContext("2d");
      ctx.drawImage(
        canvasGirado,
        recorte.x,
        recorte.y,
        recorte.w,
        recorte.h,
        0,
        0,
        larguraNum,
        altura
      );

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

  const semAlteracao =
    rotacao === 0 &&
    !!recorte &&
    recorte.x === 0 &&
    recorte.y === 0 &&
    recorte.w === naturalW &&
    recorte.h === naturalH &&
    Number(largura) === naturalW;

  // Posição/tamanho da seleção já convertidos para pixels de tela.
  const selecaoTela = recorte
    ? {
        left: recorte.x * escala,
        top: recorte.y * escala,
        width: recorte.w * escala,
        height: recorte.h * escala,
      }
    : null;

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
              <div
                className="cover-editor-stage"
                style={{ width: palcoW, height: palcoH }}
              >
                <img
                  src={dataUrl}
                  alt=""
                  draggable={false}
                  className="cover-editor-stage-img"
                  style={{
                    width: imgTelaW,
                    height: imgTelaH,
                    transform: `translate(-50%, -50%) rotate(${rotacao}deg)`,
                  }}
                />

                {selecaoTela && (
                  <>
                    {/* Máscara escura fora da seleção, em 4 tiras */}
                    <div
                      className="cover-editor-mask"
                      style={{ left: 0, top: 0, right: 0, height: selecaoTela.top }}
                    />
                    <div
                      className="cover-editor-mask"
                      style={{
                        left: 0,
                        top: selecaoTela.top + selecaoTela.height,
                        right: 0,
                        bottom: 0,
                      }}
                    />
                    <div
                      className="cover-editor-mask"
                      style={{
                        left: 0,
                        top: selecaoTela.top,
                        width: selecaoTela.left,
                        height: selecaoTela.height,
                      }}
                    />
                    <div
                      className="cover-editor-mask"
                      style={{
                        left: selecaoTela.left + selecaoTela.width,
                        top: selecaoTela.top,
                        right: 0,
                        height: selecaoTela.height,
                      }}
                    />

                    <div
                      className={`cover-editor-selection${arrastando ? " is-dragging" : ""}`}
                      style={{
                        left: selecaoTela.left,
                        top: selecaoTela.top,
                        width: selecaoTela.width,
                        height: selecaoTela.height,
                      }}
                      onPointerDown={(e) => iniciarArrasto("mover", e)}
                    >
                      <div className="cover-editor-grid-line v" style={{ left: "33.333%" }} />
                      <div className="cover-editor-grid-line v" style={{ left: "66.666%" }} />
                      <div className="cover-editor-grid-line h" style={{ top: "33.333%" }} />
                      <div className="cover-editor-grid-line h" style={{ top: "66.666%" }} />

                      {TIPOS_ALCA.map((tipo) => (
                        <div
                          key={tipo}
                          className={`cover-editor-handle handle-${tipo}`}
                          onPointerDown={(e) => iniciarArrasto(tipo, e)}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
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
                  <button
                    type="button"
                    className="cover-editor-reset-button"
                    onClick={redefinirSelecao}
                    title="Selecionar a imagem inteira novamente"
                  >
                    <HiOutlineArrowsPointingOut /> Redefinir seleção
                  </button>
                </div>
                <span className="cover-editor-dimensoes-hint">
                  Arraste o centro da seleção para mover, ou as bordas/cantos para redimensionar.
                </span>
              </div>

              <div className="cover-editor-control-group">
                <label className="cover-editor-control-label" htmlFor="cover-editor-largura">
                  Largura de saída (px)
                </label>
                <input
                  id="cover-editor-largura"
                  type="number"
                  min={LARGURA_MINIMA_PX}
                  max={recorte ? recorte.w : rotW}
                  value={largura}
                  onChange={handleLarguraChange}
                />
                <span className="cover-editor-dimensoes-hint">
                  Resultado: {Number(largura) || 0} × {altura || 0} px
                  {" "}(seleção atual: {recorte ? Math.round(recorte.w) : 0} × {recorte ? Math.round(recorte.h) : 0} px)
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
            disabled={carregando || !!erro || processando || !largura || !recorte}
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

// Calcula a nova seleção de recorte a partir do tipo de arrasto ("mover" ou
// um dos 8 pontos cardeais das alças), do estado da seleção no início do
// arrasto e do deslocamento do ponteiro (já convertido para pixels da
// imagem original). Sempre mantém a seleção dentro de [0,rw] × [0,rh] e
// nunca deixa w/h ficarem menores que o mínimo.
function calcularNovoRecorte(tipo, base, dx, dy, rw, rh, minimo) {
  if (tipo === "mover") {
    return {
      x: clamp(base.x + dx, 0, Math.max(0, rw - base.w)),
      y: clamp(base.y + dy, 0, Math.max(0, rh - base.h)),
      w: base.w,
      h: base.h,
    };
  }

  const x2base = base.x + base.w;
  const y2base = base.y + base.h;
  let x1 = base.x;
  let y1 = base.y;
  let x2 = x2base;
  let y2 = y2base;

  if (tipo.includes("w")) x1 = clamp(base.x + dx, 0, x2base - minimo);
  if (tipo.includes("e")) x2 = clamp(x2base + dx, x1 + minimo, rw);
  if (tipo.includes("n")) y1 = clamp(base.y + dy, 0, y2base - minimo);
  if (tipo.includes("s")) y2 = clamp(y2base + dy, y1 + minimo, rh);

  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
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
