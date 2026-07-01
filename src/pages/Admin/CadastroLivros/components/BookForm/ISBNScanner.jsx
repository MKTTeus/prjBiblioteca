import React, { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, NotFoundException } from "@zxing/library";
import "./ISBNScanner.css";

export default function ISBNScanner({ onDetected, onClose }) {
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const [erro, setErro] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [cameraIdx, setCameraIdx] = useState(0);

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    reader
      .listVideoInputDevices()
      .then((devices) => {
        if (!devices.length) {
          setErro("Nenhuma câmera encontrada.");
          return;
        }
        // Prefere câmera traseira
        const sorted = [...devices].sort((a, b) => {
          const aBack = /back|rear|traseira|environment/i.test(a.label);
          const bBack = /back|rear|traseira|environment/i.test(b.label);
          return bBack - aBack;
        });
        setCameras(sorted);
      })
      .catch(() => setErro("Permissão de câmera negada."));

    return () => {
      reader.reset();
    };
  }, []);

  useEffect(() => {
    if (!cameras.length || !videoRef.current) return;

    const reader = readerRef.current;
    reader.reset();

    const deviceId = cameras[cameraIdx]?.deviceId;

    reader
      .decodeFromVideoDevice(deviceId, videoRef.current, (result, err) => {
        if (result) {
          const text = result.getText();
          // Filtra apenas EAN-13 / ISBN-13 / ISBN-10
          if (/^(978|979|97[0-9])\d{10}$|^\d{9}[\dX]$/.test(text)) {
            onDetected(text);
          }
        }
        if (err && !(err instanceof NotFoundException)) {
          console.warn("Scanner:", err);
        }
      })
      .catch(() => setErro("Não foi possível acessar a câmera."));
  }, [cameras, cameraIdx, onDetected]);

  return (
    <div className="isbn-scanner-overlay" onClick={onClose}>
      <div className="isbn-scanner-box" onClick={(e) => e.stopPropagation()}>
        <div className="isbn-scanner-header">
          <span>Aponte para o código de barras do livro</span>
          <button className="isbn-scanner-close" onClick={onClose} aria-label="Fechar">✕</button>
        </div>

        {erro ? (
          <div className="isbn-scanner-error">{erro}</div>
        ) : (
          <div className="isbn-scanner-viewport">
            <video ref={videoRef} className="isbn-scanner-video" />
            <div className="isbn-scanner-reticle">
              <span /><span /><span /><span />
            </div>
          </div>
        )}

        {cameras.length > 1 && (
          <button
            className="isbn-scanner-switch"
            onClick={() => setCameraIdx((i) => (i + 1) % cameras.length)}
          >
            Trocar câmera
          </button>
        )}

        <p className="isbn-scanner-hint">Ou feche e digite o ISBN manualmente</p>
      </div>
    </div>
  );
}