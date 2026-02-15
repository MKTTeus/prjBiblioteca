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
  const hideLayout = location.pathname === "/login" || location.pathname === "/signup";

  return (
    <div className="app-container">
      {!hideLayout && <Sidebar />}
      {!hideLayout && <Header />}

      <div className={`main-content ${hideLayout ? "full" : ""}`}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/biblioteca" element={<Biblioteca />} />
          <Route path="/livros" element={<Livros />} />
          <Route path="/alunos" element={<Alunos />} />
          <Route path="/comunidade" element={<Comunidade />} />
          <Route path="/emprestimos" element={<Emprestimos />} />
          <Route path="/admins" element={<Admins />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
