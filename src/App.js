<<<<<<< HEAD
// src/App.js
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
=======
import React, { useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
>>>>>>> 2ca1edd (adição do backend)
import Sidebar from "./components/Sidebar/Sidebar";
import Header from "./components/Header/Header";
import Dashboard from "./pages/Dashboard";
import Biblioteca from "./pages/Biblioteca";
import Livros from "./pages/CadastroLivros";
import Alunos from "./pages/Alunos";
import Emprestimos from "./pages/Emprestimos";
import Configuracoes from "./pages/Configuracoes";
<<<<<<< HEAD
import "./App.css";

function App() {
  return (
    <Router basename="/prjBiblioteca">
      <div className="app">
        <Sidebar />
        <div className="main-content">
          <Header />
          <div className="page-content">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/biblioteca" element={<Biblioteca />} />
              <Route path="/livros" element={<Livros />} />
              <Route path="/alunos" element={<Alunos />} />
              <Route path="/emprestimos" element={<Emprestimos />} />
              <Route path="/configuracoes" element={<Configuracoes />} />
            </Routes>
          </div>
        </div>
      </div>
    </Router>
=======
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import "./App.css";

function App() {
  const location = useLocation();
  const hideLayoutPages = ["/login", "/signup"];
  const isLoginOrSignup = hideLayoutPages.includes(location.pathname);

  // Controla scroll do body conforme a página
  useEffect(() => {
    if (isLoginOrSignup) {
      document.body.classList.add("login-page-active");
    } else {
      document.body.classList.remove("login-page-active");
    }
  }, [isLoginOrSignup]);

  return (
    <div className="app">
      {/* Sidebar aparece somente em páginas protegidas */}
      {!isLoginOrSignup && <Sidebar />}

      <div className="main-content">
        {/* Header aparece somente em páginas protegidas */}
        {!isLoginOrSignup && <Header />}

        <div className="page-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/biblioteca" element={<Biblioteca />} />
            <Route path="/livros" element={<Livros />} />
            <Route path="/alunos" element={<Alunos />} />
            <Route path="/emprestimos" element={<Emprestimos />} />
            <Route path="/configuracoes" element={<Configuracoes />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
          </Routes>
        </div>
      </div>
    </div>
>>>>>>> 2ca1edd (adição do backend)
  );
}

export default App;
