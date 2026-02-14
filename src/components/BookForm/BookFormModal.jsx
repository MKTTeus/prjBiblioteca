import React, { useState, useEffect } from "react";
import "./BookFormModal.css";
import { createBook, uploadCover, getCategorias, getGeneros } from "../../services/api";

const BookFormModal = ({ onClose, onBookSaved }) => {
  const [form, setForm] = useState({
    titulo: "",
    autor: "",
    isbn: "",
    descricao: "",
    editora: "",
    ano: "",
    paginas: "",
    capaURL: "",
    idCategoria: "",
    idGenero: "",
    livLocalizacao: "",
    exemplares: 1,
  });

  const [categorias, setCategorias] = useState([]);
  const [generos, setGeneros] = useState([]);
  const [uploading, setUploading] = useState(false);

  // Buscar categorias e gêneros ao montar o componente
  useEffect(() => {
    const fetchData = async () => {
      try {
        const cats = await getCategorias();
        setCategorias(Array.isArray(cats) ? cats : []);
      } catch (err) {
        console.error("Erro ao carregar categorias:", err);
        alert("Erro ao carregar categorias. Confira se está logado.");
      }

      try {
        const gens = await getGeneros();
        setGeneros(Array.isArray(gens) ? gens : []);
      } catch (err) {
        console.error("Erro ao carregar gêneros:", err);
        alert("Erro ao carregar gêneros. Confira se está logado.");
      }
    };

    fetchData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleCoverUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadCover(file);
      setForm({ ...form, capaURL: res.url });
    } catch (err) {
      alert("Erro ao enviar capa: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.titulo || !form.autor || !form.idCategoria || !form.idGenero) {
      alert("Preencha título, autor, categoria e gênero!");
      return;
    }

    const exemplaresArray = Array.from({ length: parseInt(form.exemplares) }, (_, i) => ({
      exeLivTombo: `TOM${String(i + 1).padStart(3, "0")}`,
      exeLivLocalizacao: form.livLocalizacao,
      exeLivStatus: "Disponível",
    }));

    const payload = {
      livro: {
        livTitulo: form.titulo,
        livAutor: form.autor,
        livISBN: form.isbn,
        livDescricao: form.descricao,
        livEditora: form.editora,
        livAnoPublicacao: form.ano,
        livPaginas: parseInt(form.paginas) || 0,
        livCapaURL: form.capaURL,
        idCategoria: parseInt(form.idCategoria),
        idGenero: parseInt(form.idGenero),
      },
      exemplares: exemplaresArray,
      livLocalizacao: form.livLocalizacao,
    };

    try {
      const res = await createBook(payload);
      alert(res.message || "Livro salvo com sucesso!");
      // Passa o novo livro para o componente pai
      onBookSaved && onBookSaved(res.livro);
      onClose();
    } catch (err) {
      alert("Erro ao salvar livro: " + (err.message || JSON.stringify(err)));
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <h2>Adicionar Livro</h2>
          <button className="close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        <form className="modal-content" onSubmit={handleSubmit}>
          <label>Título</label>
          <input name="titulo" placeholder="Título" value={form.titulo} onChange={handleChange} />

          <label>Autor</label>
          <input name="autor" placeholder="Autor" value={form.autor} onChange={handleChange} />

          <label>ISBN</label>
          <input name="isbn" placeholder="ISBN" value={form.isbn} onChange={handleChange} />

          <label>Descrição</label>
          <textarea name="descricao" placeholder="Descrição" value={form.descricao} onChange={handleChange} />

          <label>Editora</label>
          <input name="editora" placeholder="Editora" value={form.editora} onChange={handleChange} />

          <label>Ano</label>
          <input name="ano" placeholder="Ano" value={form.ano} onChange={handleChange} />

          <label>Páginas</label>
          <input name="paginas" placeholder="Páginas" value={form.paginas} onChange={handleChange} />

          <label>Localização</label>
          <input name="livLocalizacao" placeholder="Localização do livro" value={form.livLocalizacao} onChange={handleChange} />

          <label>Categoria</label>
          <select name="idCategoria" value={form.idCategoria} onChange={handleChange}>
            <option value="">Selecione categoria</option>
            {categorias.map((cat) => (
              <option key={cat.idCategoria} value={cat.idCategoria}>
                {cat.catNome}
              </option>
            ))}
          </select>

          <label>Gênero</label>
          <select name="idGenero" value={form.idGenero} onChange={handleChange}>
            <option value="">Selecione gênero</option>
            {generos.map((gen) => (
              <option key={gen.idGenero} value={gen.idGenero}>
                {gen.genNome}
              </option>
            ))}
          </select>

          <div className="upload-area">
            <label className="upload-btn">
              {uploading ? "Enviando..." : "Selecionar Capa"}
              <input type="file" onChange={handleCoverUpload} />
            </label>
            {form.capaURL && <img src={form.capaURL} className="preview-img" alt="Capa" />}
          </div>

          <input
            type="number"
            name="exemplares"
            placeholder="Número de exemplares"
            value={form.exemplares}
            onChange={handleChange}
            min={1}
          />

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-save">
              Salvar Livro
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BookFormModal;
