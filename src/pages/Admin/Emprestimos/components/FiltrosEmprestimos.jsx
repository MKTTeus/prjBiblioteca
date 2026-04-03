import { CiSearch } from "react-icons/ci";

export default function FiltrosEmprestimos({
  busca,
  onBuscaChange,
  filtroStatus,
  opcoesFiltro,
  onFiltroStatusChange,
}) {
  return (
    <div className="emp-filtros">
      <div className="emp-search">
        <CiSearch />
        <input
          placeholder="Buscar por ID, nome do usuário, RA, CPF, livro ou tombo..."
          value={busca}
          onChange={(event) => onBuscaChange(event.target.value)}
        />
      </div>

      <div className="emp-filter-tabs" role="tablist" aria-label="Filtrar empréstimos por status">
        {opcoesFiltro.map((opcao) => (
          <button
            key={opcao.valor}
            type="button"
            role="tab"
            aria-selected={filtroStatus === opcao.valor}
            className={`emp-filter-tab ${filtroStatus === opcao.valor ? "is-active" : ""}`}
            onClick={() => onFiltroStatusChange(opcao.valor)}
          >
            {opcao.label}
          </button>
        ))}
      </div>
    </div>
  );
}
