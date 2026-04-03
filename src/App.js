import React from "react";
import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import Sidebar from "./components/Sidebar/Sidebar";
import Header from "./components/Header/Header";

import Dashboard from "./pages/Admin/Dashboard/Dashboard";
import Livros from "./pages/Admin/CadastroLivros/CadastroLivros";
import Aluno from "./pages/Admin/CadastroAlunos/Aluno";
import Comunidade from "./pages/Admin/CadastroComunidade/Comunidade";
import Emprestimos from "./pages/Admin/Emprestimos/Emprestimos";
import Admin from "./pages/Admin/CadastroAdmins/Admin";
import Login from "./pages/Login";
import Biblioteca from "./pages/Admin/Biblioteca/Biblioteca";
import Signup from "./pages/Signup";
import ProtectedRoute from "./components/ProtectedRoute";
import Configuracoes from "./pages/Admin/Configuracoes/Configuracoes";
import Geral from "./pages/Admin/Configuracoes/components/Geral/Geral";
import Notificacoes from "./pages/Admin/Configuracoes/components/Notificacoes/Notificacoes";
import Seguranca from "./pages/Admin/Configuracoes/components/Seguranca/Seguranca";
import Sistema from "./pages/Admin/Configuracoes/components/Sistema/Sistema";
import Email from "./pages/Admin/Configuracoes/components/Email/Email";
import Avancado from "./pages/Admin/Configuracoes/components/Avancado/Avancado";

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
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/livros" element={<ProtectedRoute><Livros /></ProtectedRoute>} />
            <Route path="/alunos" element={<ProtectedRoute adminOnly={true}><Aluno /></ProtectedRoute>} />
            <Route path="/comunidade" element={<ProtectedRoute adminOnly={true} ><Comunidade /></ProtectedRoute>} />
            <Route path="/emprestimos" element={<ProtectedRoute adminOnly={true}><Emprestimos /></ProtectedRoute>} />
            <Route path="/admins" element={<ProtectedRoute adminOnly={true}><Admin /></ProtectedRoute>} />
            <Route path="/Biblioteca" element={<ProtectedRoute><Biblioteca /></ProtectedRoute>} />


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
