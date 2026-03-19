import React, { useEffect, useState } from "react";
import { getCategorias, getGeneros } from "../../services/api";
import "./BookList.css";

const BookList = (props) => {
  const { books = [], onEditBook, onDeleteBook, isAdmin = false } = props;

  const [categorias, setCategorias] = useState([]);
  const [generos, setGeneros] = useState([]);
  const [loadingMeta, setLoadingMeta] = useState(true);

  useEffect(() => {

    const loadMeta = async () => {

      try {

        const [cats, gens] = await Promise.all([
          getCategorias(),
          getGeneros()
        ]);

        setCategorias(Array.isArray(cats) ? cats : []);
        setGeneros(Array.isArray(gens) ? gens : []);

      } catch (err) {

        console.error("Erro ao carregar categorias/gêneros:", err);

      } finally {

        setLoadingMeta(false);

      }

    };

    loadMeta();

  }, []);

  const getCategoriaNome = (id) => {

    const cat = categorias.find(
      (c) => String(c.idCategoria) === String(id)
    );

    return cat ? cat.catNome : "-";
  };

  const getGeneroNome = (id) => {

    const gen = generos.find(
      (g) => String(g.idGenero) === String(id)
    );

    return gen ? gen.genNome : "-";
  };

  const safeBooks = Array.isArray(books) ? books : [];

  return (
    <div className="booklist-container">

      {loadingMeta ? (

        <p>Carregando categorias e gêneros...</p>

      ) : (

        <div className="book-grid">

          {safeBooks.length === 0 && (
            <p>Nenhum livro cadastrado.</p>
          )}

          {safeBooks.map((book, idx) => {

            if (!book) return null;

            const key = book?.idLivro ?? book?.id ?? `book-${idx}`;

            const titulo =
              book?.livTitulo ??
              book?.titulo ??
              "Sem título";

            const autor =
              book?.livAutor ??
              book?.autor ??
              "Autor desconhecido";

            const capa =
              book?.livCapaURL ||
              "/placeholder.png";

            return (

              <div className="book-card" key={key}>

                <img
                  src={capa}
                  alt={titulo}
                  onError={(e)=>{
                    e.target.src="/placeholder.png"
                  }}
                />

                <h3>{titulo}</h3>

                <p>{autor}</p>

                <p>
                  <strong>Categoria:</strong>{" "}
                  {getCategoriaNome(book?.idCategoria)}
                </p>

                <p>
                  <strong>Gênero:</strong>{" "}
                  {getGeneroNome(book?.idGenero)}
                </p>

                <div className="card-actions">

                  {isAdmin && (

                    <button
                      className="btn-edit"
                      onClick={() => onEditBook && onEditBook(book)}
                    >
                      Editar
                    </button>

                  )}

                  {isAdmin && props.onEditTombos && (
                    <button
                      className="btn-edit"
                      onClick={() => props.onEditTombos(book)}
                    >
                      Editar Tombos
                    </button>
                  )}

                  {isAdmin && (

                    <button
                      className="btn-delete"
                      onClick={() => onDeleteBook && onDeleteBook(book)}
                    >
                      Deletar
                    </button>

                  )}

                </div>

              </div>

            );

          })}

        </div>

      )}

    </div>
  );
};

export default BookList;