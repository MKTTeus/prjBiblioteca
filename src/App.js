import React from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import Sidebar from "./components/Sidebar/Sidebar";
import Header from "./components/Header/Header";

import Dashboard from "./pages/Dashboard";
import Biblioteca from "./pages/Biblioteca";
import Livros from "./pages/CadastroLivros";
import Alunos from "./pages/Alunos";
import Comunidade from "./pages/Comunidade";
import Emprestimos from "./pages/Emprestimos";
import Admins from "./pages/Admins";
import Login from "./pages/Login";
import Signup from "./pages/Signup";

function App() {
  const location = useLocation();

  const isAuthPage =
    location.pathname === "/login" ||
    location.pathname === "/signup";

  // Se for login ou signup → NÃO renderiza layout nenhum
  if (isAuthPage) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
      </Routes>
    );
  }

  // Layout normal do sistema
  return (
    <div className="app-container">
      <Sidebar />
      <div className="content-area">
        <Header />
        <div className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/biblioteca" element={<Biblioteca />} />
            <Route path="/livros" element={<Livros />} />
            <Route path="/alunos" element={<Alunos />} />
            <Route path="/comunidade" element={<Comunidade />} />
            <Route path="/emprestimos" element={<Emprestimos />} />
            <Route path="/admins" element={<Admins />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

export default App;
