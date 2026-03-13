import React, { useEffect, useState } from "react";
import {
  createBook,
  updateBook,
  addExemplares,
  uploadCover,
  getCategorias,
  getGeneros
} from "../../services/api";

import "./BookFormModal.css";

export default function BookFormModal({ onClose, onBookSaved, bookToEdit }) {

  const [categorias, setCategorias] = useState([]);
  const [generos, setGeneros] = useState([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    livTitulo: "",
    livAutor: "",
    livDescricao: "",
    livEditora: "",
    livAnoPublicacao: "",
    livPaginas: "",
    livCapaURL: "",
    idCategoria: 1,
    idGenero: 1,
    isbn: ""
  });

  const [quantidadeTombos, setQuantidadeTombos] = useState(1);
  const [prefixoTombo, setPrefixoTombo] = useState("T");

  // Novos estados para edição
  const [adicionarTombos, setAdicionarTombos] = useState(false);

  useEffect(() => {
    carregarDados();
  }, []);

  useEffect(() => {
    if (bookToEdit) {
      setForm({
        livTitulo: bookToEdit.livTitulo || "",
        livAutor: bookToEdit.livAutor || "",
        livDescricao: bookToEdit.livDescricao || "",
        livEditora: bookToEdit.livEditora || "",
        livAnoPublicacao: bookToEdit.livAnoPublicacao || "",
        livPaginas: bookToEdit.livPaginas || "",
        livCapaURL: bookToEdit.livCapaURL || "",
        idCategoria: bookToEdit.idCategoria || 1,
        idGenero: bookToEdit.idGenero || 1,
        isbn: ""
      });
      setAdicionarTombos(false); // padrão: não adicionar exemplares ao editar
    }
  }, [bookToEdit]);

  async function carregarDados() {
    const [cats, gens] = await Promise.all([getCategorias(), getGeneros()]);
    setCategorias(cats || []);
    setGeneros(gens || []);
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  async function handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const res = await uploadCover(file);
    setForm(prev => ({ ...prev, livCapaURL: res.url }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    setLoading(true);

    try {
      if (bookToEdit) {
        // Atualiza livro
        await updateBook(bookToEdit.idLivro, form);

        // Se marcar "Adicionar exemplares"
        if (adicionarTombos && quantidadeTombos > 0) {
          await addExemplares(bookToEdit.idLivro, quantidadeTombos, prefixoTombo);
        }

      } else {
        // Criar livro novo – tombos obrigatórios
        if (quantidadeTombos < 1) {
          alert("Adicione pelo menos 1 tombo");
          setLoading(false);
          return;
        }

        const payload = {
          livro: form,
          quantidade_exemplares: quantidadeTombos,
          prefixo_tombo: prefixoTombo
        };

        await createBook(payload);
      }

      onBookSaved();
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar");
    }

    setLoading(false);
  }

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <h2>{bookToEdit ? "Editar Livro" : "Novo Livro"}</h2>
          <button onClick={onClose}>✕</button>
        </div>

        <form className="modal-content" onSubmit={handleSubmit}>

          <input name="livTitulo" value={form.livTitulo} onChange={handleChange} placeholder="Título" required />
          <input name="livAutor" value={form.livAutor} onChange={handleChange} placeholder="Autor" />
          <textarea name="livDescricao" value={form.livDescricao} onChange={handleChange} placeholder="Descrição" />
          <input name="livEditora" value={form.livEditora} onChange={handleChange} placeholder="Editora" />
          <input name="livAnoPublicacao" value={form.livAnoPublicacao} onChange={handleChange} placeholder="Ano" />
          <input name="livPaginas" value={form.livPaginas} onChange={handleChange} placeholder="Páginas" />

          <div className="upload-area">
            <label>Upload capa</label>
            <input type="file" onChange={handleUpload} />
            {form.livCapaURL && <img src={form.livCapaURL} alt="capa" className="preview-img" />}
          </div>

          <select name="idCategoria" value={form.idCategoria} onChange={handleChange}>
            {categorias.map(cat => <option key={cat.idCategoria} value={cat.idCategoria}>{cat.catNome}</option>)}
          </select>

          <select name="idGenero" value={form.idGenero} onChange={handleChange}>
            {generos.map(gen => <option key={gen.idGenero} value={gen.idGenero}>{gen.genNome}</option>)}
          </select>

          {/* NOVO: checkbox para adicionar tombos ao editar */}
          {bookToEdit && (
            <div className="tombos-config">
              <label>
                <input
                  type="checkbox"
                  checked={adicionarTombos}
                  onChange={(e) => setAdicionarTombos(e.target.checked)}
                />
                Adicionar exemplares
              </label>

              {adicionarTombos && (
                <>
                  <input
                    type="text"
                    value={prefixoTombo}
                    onChange={(e) => setPrefixoTombo(e.target.value)}
                    placeholder="Prefixo"
                  />
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={quantidadeTombos}
                    onChange={(e) => setQuantidadeTombos(Number(e.target.value))}
                    placeholder="Quantidade"
                  />
                  <p>
                    Serão criados automaticamente: <b>{prefixoTombo}0001 até {prefixoTombo}{String(quantidadeTombos).padStart(4, "0")}</b>
                  </p>
                </>
              )}
            </div>
          )}

          {/* Criação de livro – tombos obrigatórios */}
          {!bookToEdit && (
            <div className="tombos-config">
              <h3>Gerar Tombos</h3>
              <input placeholder="Prefixo" value={prefixoTombo} onChange={(e) => setPrefixoTombo(e.target.value)} />
              <input type="number" min="1" max="500" value={quantidadeTombos} onChange={(e) => setQuantidadeTombos(Number(e.target.value))} placeholder="Quantidade" />
              <p>
                Serão criados automaticamente: <b>{prefixoTombo}0001 até {prefixoTombo}{String(quantidadeTombos).padStart(4, "0")}</b>
              </p>
            </div>
          )}

          <div className="modal-actions">
            <button type="submit" className="btn-save">{loading ? "Salvando..." : "Salvar"}</button>
            <button type="button" className="btn-cancel" onClick={onClose}>Cancelar</button>
          </div>

        </form>
      </div>
    </div>
  );
}