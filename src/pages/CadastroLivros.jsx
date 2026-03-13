import React, { useEffect, useState } from "react";
import { getBooks, deleteBook } from "../services/api";
import BookList from "../components/BookList/BookList";
import BookFormModal from "../components/BookForm/BookFormModal";
import { useAuth } from "../contexts/AuthContext";

import "../styles/cadastroLivros.css";

export default function CadastroLivros() {

  const { user } = useAuth();
  const isAdmin = user?.tipo === "admin";

  const [books,setBooks] = useState([]);
  const [loading,setLoading] = useState(true);

  const [modalOpen,setModalOpen] = useState(false);
  const [currentBook,setCurrentBook] = useState(null);

  async function loadBooks(){

    try{

      const data = await getBooks();
      setBooks(data || []);

    }catch(err){

      console.error(err);
      alert("Erro ao carregar livros");

    }

    setLoading(false);
  }

  useEffect(()=>{
    loadBooks();
  },[])

  function handleAdd(){

    setCurrentBook(null);
    setModalOpen(true);

  }

  function handleEdit(book){

    setCurrentBook(book);
    setModalOpen(true);

  }

  async function handleDelete(book){

    if(!window.confirm(`Excluir "${book.livTitulo}"?`)) return

    try{

      await deleteBook(book.idLivro);
      loadBooks();

    }catch(err){

      console.error(err);
      alert("Erro ao excluir");

    }

  }

  function handleSaved(){

    loadBooks();
    setModalOpen(false);

  }

  return(

<div className="cadastro-container">

<div className="cadastro-header">

<div className="header-left">
<h2>Biblioteca</h2>
<p>Gerenciamento de livros</p>
</div>

{isAdmin &&(

<button
className="btn-novo-livro"
onClick={handleAdd}
>
+ Novo Livro
</button>

)}

</div>

{loading ? (

<p>Carregando...</p>

) : (

<BookList
books={books}
onEditBook={handleEdit}
onDeleteBook={handleDelete}
isAdmin={isAdmin}
/>

)}

{modalOpen &&(

<BookFormModal
bookToEdit={currentBook}
onClose={()=>setModalOpen(false)}
onBookSaved={handleSaved}
/>

)}

</div>

  )
}