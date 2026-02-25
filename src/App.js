import React from "react";
import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import Sidebar from "./components/Sidebar/Sidebar";
import Header from "./components/Header/Header";

import Dashboard from "./pages/Dashboard";
import Livros from "./pages/CadastroLivros";
import Alunos from "./pages/Alunos";
import Comunidade from "./pages/Comunidade";
import Emprestimos from "./pages/Emprestimos";
import Admins from "./pages/Admins";
import Login from "./pages/Login";
import Signup from "./pages/Signup";

import Configuracoes from "./pages/Configuracoes/Configuracoes";
import Geral from "./pages/Configuracoes/components/Geral/Geral";
import Notificacoes from "./pages/Configuracoes/components/Notificacoes/Notificacoes";
import Seguranca from "./pages/Configuracoes/components/Seguranca/Seguranca";
import Sistema from "./pages/Configuracoes/components/Sistema/Sistema";
import Email from "./pages/Configuracoes/components/Email/Email";
import Avancado from "./pages/Configuracoes/components/Avancado/Avancado";

function App() {
  const location = useLocation();


  
  const isAuthPage =
    location.pathname === "/login" ||
    location.pathname === "/signup";

  if (isAuthPage) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
      </Routes>
    );
  }

  return (
    <div className="app-container">
      <Sidebar />
      <div className="content-area">
        <Header />
        <div className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/livros" element={<Livros />} />
            <Route path="/alunos" element={<Alunos />} />
            <Route path="/comunidade" element={<Comunidade />} />
            <Route path="/emprestimos" element={<Emprestimos />} />
            <Route path="/admins" element={<Admins />} />

            {/* CONFIGURAÇÕES COMO ROTA PAI */}
            <Route path="/configuracoes" element={<Configuracoes />}>
              <Route index element={<Navigate to="geral" replace />} />
              <Route path="geral" element={<Geral />} />
              <Route path="notificacoes" element={<Notificacoes />} />
              <Route path="seguranca" element={<Seguranca />} />
              <Route path="sistema" element={<Sistema />} />
              <Route path="email" element={<Email />} />
              <Route path="avancado" element={<Avancado />} />
            </Route>

          </Routes>
        </div>
      </div>
    </div>
  );
}

export default App;