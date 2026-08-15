import React from "react";
import AppShell from "../../components/AppShell/AppShell";
import { useAuth } from "../../contexts/AuthContext";
import "./PainelProfessor.css";

// Área restrita do professor. Nesta fase é apenas um painel inicial:
// o professor já tem login e permissões isolados do painel
// administrativo, mas o fluxo de empréstimo (para si/turma, carrinho de
// livros, etc.) ainda será implementado em uma fase seguinte.
export default function PainelProfessor() {
  const { user } = useAuth();

  return (
    <AppShell sidebarType="professor" activePage="dashboard">
      <div className="painel-professor">
        <h1>Olá, {user?.nome || "professor(a)"}!</h1>
        <p className="painel-professor-subtitulo">
          Esta é a sua área na Biblioteca.
        </p>

        <div className="painel-professor-card">
          <h2>Empréstimos</h2>
          <p>
            A funcionalidade de empréstimo para você e para suas turmas
            está em desenvolvimento e ficará disponível em breve por aqui.
          </p>
        </div>
      </div>
    </AppShell>
  );
}