import React from "react";
import "./BookInfoModal.css";

export default function BookInfoModal({ book, onClose }) {

  if (!book) return null;

  const tombos = book.exemplares || [];

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
            <div className="tombos-grid">
              {tombos.map((t) => (
                <div key={t.idExemplar} className="tombo-card">
                  {t.tomboCodigo}
                </div>
              ))}
            </div>
          )}

        </div>

      </div>

    </div>
  );
}