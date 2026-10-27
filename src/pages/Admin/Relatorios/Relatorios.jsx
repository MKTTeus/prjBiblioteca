import "../../../components/AdminPageLayout/AdminPageLayout.css";
import { Outlet, useLocation } from "react-router-dom";
import { BookOpen, ClockAlert, LibraryBig, ClipboardList } from "lucide-react";
import "./Relatorios.css";
import "./RelatoriosRedesign.css";

const SECOES = {
  emprestimos: { titulo: "Relatório de Empréstimos", subtitulo: "Histórico, rankings e movimentação dos empréstimos.", Icon: BookOpen },
  atrasos: { titulo: "Usuários em Atraso", subtitulo: "Acompanhe pendências atuais e ocorrências de atrasos.", Icon: ClockAlert },
  acervo: { titulo: "Acervo por Grupo", subtitulo: "Explore títulos e exemplares por gênero, autor, editora ou ano.", Icon: LibraryBig },
  consultas: { titulo: "Consultas e Controle", subtitulo: "Relatórios especializados de acervo, leitores e circulação.", Icon: ClipboardList },
};

export default function Relatorios() {
  const { pathname } = useLocation();
  const ultimoTrecho = pathname.split("/").filter(Boolean).pop();
  const secao = SECOES[ultimoTrecho] || SECOES.emprestimos;
  const Icon = secao.Icon;

  return (
    <div className="rel-page page-shell admin-standard-page rel-redesign">
      <header className="rel-header admin-standard-header">
        <div>
          <span className="rel-header-eyebrow"><Icon size={16} aria-hidden="true" /> Biblioteca / Relatórios</span>
          <h1>{secao.titulo}</h1>
          <p>{secao.subtitulo}</p>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
