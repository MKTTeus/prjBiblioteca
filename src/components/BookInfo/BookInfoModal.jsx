import React from "react";
import "./BookInfoModal.css";

export default function BookInfoModal({ book, onClose }) {

  if (!book) return null;

  const tombos = book.exemplares || [];
  const tombosDisponiveis = tombos.filter((t) => (t.exeLivStatus || "").toLowerCase() === "disponível");

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
              src={book.livCapaURL || "https://via.placeholder.com/150x220"}
              alt={book.livTitulo}
            />
          </div>

          <div className="info-dados">

            <h3>{book.livTitulo}</h3>
            <p><b>Autor:</b> {book.livAutor}</p>
            <p><b>Editora:</b> {book.livEditora}</p>
            <p><b>Ano:</b> {book.livAnoPublicacao}</p>
            <p><b>Páginas:</b> {book.livPaginas}</p>

            {book.categoria && (
              <p><b>Categoria:</b> {book.categoria.catNome}</p>
            )}

            {book.genero && (
              <p><b>Gênero:</b> {book.genero.genNome}</p>
            )}

            <div className="info-descricao">
              <h4>Descrição</h4>
              <p>{book.livDescricao || "Sem descrição"}</p>
            </div>

          </div>

        </div>

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