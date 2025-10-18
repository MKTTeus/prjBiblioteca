import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar/Sidebar";
import Header from "./components/Header/Header";
import Dashboard from "./pages/Dashboard";
import CadastroLivros from "./pages/CadastroLivros";
import Alunos from "./pages/Alunos";
import Configuracoes from "./pages/Configuracoes";
import "./styles/global.css";

function App() {
  return (
    <Router>
      <div className="app-container">
        <Sidebar />
        <div className="main-content">
          <Header />
          <div className="page-content">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/biblioteca" element={<CadastroLivros />} />
              <Route path="/alunos" element={<Alunos />} />
              <Route path="/configuracoes" element={<Configuracoes />} />
            </Routes>
          </div>
        </div>
      </div>
    </Router>
  );
}

export default App;
