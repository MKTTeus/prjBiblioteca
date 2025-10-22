// src/App.js
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar/Sidebar";
import Header from "./components/Header/Header";
import Dashboard from "./pages/Dashboard";
import Biblioteca from "./pages/Biblioteca";
import Livros from "./pages/CadastroLivros";
import Alunos from "./pages/Alunos";
import Emprestimos from "./pages/Emprestimos";
import Configuracoes from "./pages/Configuracoes";
import "./App.css";

function App() {
  return (
    <Router>
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
  );
}

export default App;
