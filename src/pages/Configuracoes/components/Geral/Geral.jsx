import "./Geral.css";

export default function Geral() {
  return (
    <div className="card">
      <div className="geral-header">
        <h3>⚙ Configurações Gerais</h3>
      </div>

      <div className="form-grid">
        <div className="form-group full">
          <label>Nome da Biblioteca</label>
          <input
            type="text"
            defaultValue="Biblioteca - Escola 9 de Julho de Taquaritinga"
          />
        </div>

        <div className="form-group">
          <label>Dias Máximos de Empréstimo</label>
          <input type="number" defaultValue="14" />
        </div>

        <div className="form-group">
          <label>Máximo de Renovações</label>
          <input type="number" defaultValue="2" />
        </div>

        <div className="form-group full">
          <label>Livros por Aluno</label>
          <input type="number" defaultValue="3" />
        </div>
      </div>

      <div className="card-actions">
        <button className="btn-secondary">Restaurar Padrão</button>
        <button className="btn-primary">Salvar Configurações</button>
      </div>
    </div>
  );
}