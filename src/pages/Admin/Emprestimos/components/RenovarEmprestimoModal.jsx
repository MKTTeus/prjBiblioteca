import { useEffect, useState } from "react";
import { HiOutlineX } from "react-icons/hi";
import { FiRepeat } from "react-icons/fi";
import LoadingButton from "../../../../components/LoadingButton/LoadingButton";
import { dataMinimaRenovacao, dataSugeridaRenovacao, formatarData } from "../utils";

export default function RenovarEmprestimoModal({
  aberto,
  emprestimo,
  usuario,
  onFechar,
  onConfirmar,
  renovando = false,
}) {
  const dataMinima = dataMinimaRenovacao();
  const [novaData, setNovaData] = useState("");

  useEffect(() => {
    if (aberto && emprestimo) {
      setNovaData(dataSugeridaRenovacao(emprestimo));
    }
  }, [aberto, emprestimo]);

  if (!aberto || !emprestimo) return null;

  const dataInvalida = !novaData || novaData < dataMinima;

  function handleConfirmar() {
    if (dataInvalida || renovando) return;
    onConfirmar(novaData);
  }

  return (
    <div className="emp-modal-overlay" onClick={renovando ? undefined : onFechar}>
      <div className="emp-modal" onClick={(event) => event.stopPropagation()}>
        <div className="emp-modal-topbar">
          <h2>
            <FiRepeat style={{ marginRight: 8, verticalAlign: "-2px" }} />
            Renovar Empréstimo
          </h2>
          <button className="emp-modal-close" onClick={onFechar} aria-label="Fechar" disabled={renovando}>
            <HiOutlineX />
          </button>
        </div>

        <div className="emp-modal-content">
          <div className="emp-user-chip">
            <div className="emp-chip-info">
              <strong>{emprestimo.titulo || emprestimo.empLiv_Titulo || "Livro"}</strong>
              <span className="emp-chip-badge">
                {usuario?.nome || "Usuário"} · Vencimento atual: {formatarData(emprestimo.empLiv_DataPrevistaDevolucao)}
              </span>
            </div>
          </div>

          <section className="emp-step-card">
            <div className="emp-step-header">
              <div>
                <h3>Nova data de devolução</h3>
              </div>
            </div>

            <div style={{ padding: "18px 20px" }}>
              <input
                type="date"
                className="emp-renovar-input"
                min={dataMinima}
                value={novaData}
                onChange={(event) => setNovaData(event.target.value)}
              />
              {dataInvalida && (
                <p className="emp-renovar-erro">Selecione uma data válida, posterior a hoje.</p>
              )}
            </div>
          </section>
        </div>

        <div className="emp-modal-actions">
          <button onClick={onFechar} disabled={renovando}>
            Cancelar
          </button>
          <LoadingButton
            isLoading={renovando}
            loadingText="Renovando..."
            className="emp-confirmar"
            onClick={handleConfirmar}
            disabled={dataInvalida || renovando}
          >
            Confirmar Renovação
          </LoadingButton>
        </div>
      </div>
    </div>
  );
}