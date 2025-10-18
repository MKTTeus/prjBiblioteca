import React from "react";
import { FiEdit2, FiTrash2 } from "react-icons/fi";

function BookList({ books, onDeleteBook, onEditBook }) {
  return (
    <div className="table-container">
      <h3>Lista de Livros</h3>
      <table>
        <thead>
          <tr>
            <th>Título</th>
            <th>Autor</th>
            <th>Tombo</th>
            <th>Categoria</th>
            <th>Gênero</th>
            <th>Localização</th>
            <th>Exemplares</th>
            <th>Status</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {books.length > 0 ? (
            books.map((book, i) => (
              <tr key={i}>
                <td><strong>{book.titulo}</strong></td>
                <td>{book.autor}</td>
                <td>{book.tombo}</td>
                <td>{book.categoria}</td>
                <td>{book.genero}</td>
                <td>{book.localizacao}</td>
                <td>{book.exemplares}</td>
                <td>
                  <span
                    className={`status ${
                      book.status === "Disponível" ? "disponivel" : "emprestado"
                    }`}
                  >
                    {book.status}
                  </span>
                </td>
                <td>
                  <div className="acoes">
                    <FiEdit2
                      className="btn-editar"
                      title="Editar livro"
                      onClick={() => onEditBook(book, i)}
                    />
                    <FiTrash2
                      className="btn-excluir"
                      title="Excluir livro"
                      onClick={() => onDeleteBook(i)}
                    />
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="9" style={{ textAlign: "center", padding: "20px" }}>
                Nenhum livro cadastrado ainda.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default BookList;
