import React, { useState } from "react";
import "./BookForm.css";

const BookForm = ({ onAddBook }) => {
  const [form, setForm] = useState({
    titulo: "",
    autor: "",
    tombo: "",
    categoria: "",
    genero: "",
    localizacao: "",
    exemplares: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (Object.values(form).some((v) => v.trim() === "")) {
      alert("Preencha todos os campos!");
      return;
    }

    onAddBook(form);
    setForm({
      titulo: "",
      autor: "",
      tombo: "",
      categoria: "",
      genero: "",
      localizacao: "",
      exemplares: "",
    });
  };

  return (
    <form className="book-form" onSubmit={handleSubmit}>
      <div className="form-grid">
        <input
          type="text"
          name="titulo"
          placeholder="Título"
          value={form.titulo}
          onChange={handleChange}
        />
        <input
          type="text"
          name="autor"
          placeholder="Autor"
          value={form.autor}
          onChange={handleChange}
        />
        <input
          type="text"
          name="tombo"
          placeholder="Tombo"
          value={form.tombo}
          onChange={handleChange}
        />
        <input
          type="text"
          name="categoria"
          placeholder="Categoria"
          value={form.categoria}
          onChange={handleChange}
        />
        <input
          type="text"
          name="genero"
          placeholder="Gênero"
          value={form.genero}
          onChange={handleChange}
        />
        <input
          type="text"
          name="localizacao"
          placeholder="Localização"
          value={form.localizacao}
          onChange={handleChange}
        />
        <input
          type="text"
          name="exemplares"
          placeholder="Exemplares (ex: 3/5)"
          value={form.exemplares}
          onChange={handleChange}
        />
      </div>

      <button type="submit" className="btn-add">
        Salvar Livro
      </button>
    </form>
  );
};

export default BookForm;
