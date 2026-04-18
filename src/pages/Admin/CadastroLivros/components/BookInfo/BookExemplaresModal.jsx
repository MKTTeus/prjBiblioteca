import React, { useState, useEffect } from "react";
import "./BookInfoModal.css";
import { updateExemplar } from "../../../../../services/api";

export default function BookExemplaresModal({ book, onClose, onSaved }) {
  const [exemplares, setExemplares] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    if (book?.exemplares) {
      setExemplares(
        book.exemplares.map((ex) => ({
          ...ex,
          exeLivISBN: ex.exeLivISBN || book.livISBN || "",
          exeLivDescricao: ex.exeLivDescricao || ""
        }))
      );
    }
  }, [book]);

  const handleChange = (id, field, value) => {
    setExemplares((old) =>
      old.map((ex) => (ex.idExemplar === id ? { ...ex, [field]: value } : ex))
    );
  };

  const handleSaveOne = async (exemplar) => {
    try {
      setErro(null);
      await updateExemplar(exemplar.idExemplar, {
        exeLivStatus: exemplar.exeLivStatus,
        exeLivDescricao: exemplar.exeLivDescricao
      });
    } catch (err) {
      console.error(err);
      setErro(`Erro ao salvar tombo ${exemplar.exeLivTombo}`);
      throw err;
    }
  };

  const handleSaveAll = async () => {
    try {
      setSalvando(true);
      setErro(null);
      for (const exemplar of exemplares) {
        await handleSaveOne(exemplar);
      }
      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      // Erro já setado
    } finally {
      setSalvando(false);
    }
  };

  if (!book) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <h2>Editar Exemplares - {book.livTitulo}</h2>
          <button onClick={onClose}>✕</button>
        </div>

        <div className="modal-content">
          {exemplares.map((ex) => (
            <div key={ex.idExemplar} className="tombo-card" style={{ textAlign: "left" }}>
              <div className="tombo-code">{ex.exeLivTombo || "-"}</div>

              <label>
                Status:
                <select
                  value={ex.exeLivStatus || "Disponível"}
                  onChange={(e) => handleChange(ex.idExemplar, "exeLivStatus", e.target.value)}
                >
                  <option value="Disponível">Disponível</option>
                  <option value="Emprestado">Emprestado</option>
                  <option value="Indisponível">Indisponível</option>
                  <option value="Tombo Fixo">Tombo Fixo</option>
                  <option value="Reservado">Reservado</option>
                </select>
              </label>


              <label>
                Descrição:
                <input
                  type="text"
                  value={ex.exeLivDescricao || ""}
                  onChange={(e) => handleChange(ex.idExemplar, "exeLivDescricao", e.target.value)}
                />
              </label>
            </div>
          ))}

          {erro && <p className="erro-text">{erro}</p>}

          <div className="modal-actions">
            <button onClick={handleSaveAll} disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar todos"}
            </button>
            <button onClick={onClose}>Cancelar</button>
          </div>
        </div>
      </div>
    </div>
  );
}
