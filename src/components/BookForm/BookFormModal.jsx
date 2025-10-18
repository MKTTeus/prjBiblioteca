import React, { useState, useEffect } from "react";
import "./BookForm.css";
import { FiUpload } from "react-icons/fi";

const BookFormModal = ({ onClose, onAddBook, existingBook }) => {
  const [form, setForm] = useState({
    titulo: "",
    autor: "",
    isbn: "",
    tombo: "",
    edicao: "",
    categoria: "",
    genero: "",
    descricao: "",
    capa: "",
    editora: "",
    ano: "",
    paginas: "",
    exemplaresTotal: "",
    disponiveis: "",
    status: "Disponível",
    localizacao: "",
  });

  useEffect(() => {
    if (existingBook) setForm(existingBook);
  }, [existingBook]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.titulo || !form.autor || !form.categoria) {
      alert("Preencha os campos obrigatórios!");
      return;
    }
    onAddBook(form);
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2>{existingBook ? "Editar Livro" : "Cadastrar Novo Livro"}</h2>
          <p>
            {existingBook
              ? "Atualize as informações do livro selecionado."
              : "Preencha os dados para cadastrar um novo livro no acervo."}
          </p>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <h3>Informações Básicas</h3>
          <div className="form-grid">
            <input name="titulo" placeholder="Título *" value={form.titulo} onChange={handleChange} />
            <input name="autor" placeholder="Autor *" value={form.autor} onChange={handleChange} />
            <input name="isbn" placeholder="ISBN" value={form.isbn} onChange={handleChange} />
            <input name="tombo" placeholder="Tombo *" value={form.tombo} onChange={handleChange} />
            <input name="edicao" placeholder="Edição" value={form.edicao} onChange={handleChange} />
            <select name="categoria" value={form.categoria} onChange={handleChange}>
              <option value="">Selecione uma categoria *</option>
              <option>Literatura Brasileira</option>
              <option>Ficção</option>
              <option>Didático</option>
              <option>Biografia</option>
            </select>
            <select name="genero" value={form.genero} onChange={handleChange}>
              <option value="">Selecione um gênero</option>
              <option>Romance</option>
              <option>Aventura</option>
              <option>Suspense</option>
              <option>Drama</option>
            </select>
            <textarea
              name="descricao"
              placeholder="Breve descrição sobre o livro..."
              value={form.descricao}
              onChange={handleChange}
            />
          </div>

          <h3>Capa do Livro</h3>
          <div className="upload-section">
            <label className="upload-btn">
              <FiUpload size={18} /> Upload de Imagem
              <input type="file" style={{ display: "none" }} />
            </label>
            <span>ou</span>
            <input
              name="capa"
              placeholder="https://exemplo.com/capa.jpg"
              value={form.capa}
              onChange={handleChange}
            />
          </div>

          <h3>Informações de Publicação</h3>
          <div className="form-grid">
            <input name="editora" placeholder="Editora" value={form.editora} onChange={handleChange} />
            <input name="ano" placeholder="Ano de Publicação" value={form.ano} onChange={handleChange} />
            <input name="paginas" placeholder="Páginas" value={form.paginas} onChange={handleChange} />
          </div>

          <h3>Controle de Acervo</h3>
          <div className="form-grid">
            <input
              name="exemplaresTotal"
              placeholder="Exemplares Total *"
              value={form.exemplaresTotal}
              onChange={handleChange}
            />
            <input
              name="disponiveis"
              placeholder="Disponíveis *"
              value={form.disponiveis}
              onChange={handleChange}
            />
            <select name="status" value={form.status} onChange={handleChange}>
              <option>Disponível</option>
              <option>Emprestado</option>
              <option>Reservado</option>
            </select>
            <input
              name="localizacao"
              placeholder="Localização *"
              value={form.localizacao}
              onChange={handleChange}
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-save">
              {existingBook ? "Salvar Alterações" : "Cadastrar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BookFormModal;
