/**
 * Gráfico de barras empilhadas (ativos/atrasados/devolvidos) dos
 * empréstimos por mês, em CSS puro — sem dependência de lib de gráficos.
 */
export default function GraficoEmprestimosMensal({ meses, mesPico }) {
  const maiorTotal = Math.max(1, ...meses.map((m) => m.total));

  return (
    <div className="rel-grafico-mensal">
      <div className="rel-grafico-mensal-barras">
        {meses.map((m) => {
          const alturaTotal = (m.total / maiorTotal) * 100;
          const isPico = mesPico && mesPico.mes === m.mes;
          return (
            <div key={m.mes} className="rel-grafico-mensal-coluna">
              <div className="rel-grafico-mensal-valor">{m.total > 0 ? m.total : ""}</div>
              <div
                className={`rel-grafico-mensal-barra-wrap ${isPico ? "rel-grafico-mensal-pico" : ""}`}
                title={`${m.label}: ${m.total} empréstimo(s) — ${m.ativos} ativo(s), ${m.atrasados} atrasado(s), ${m.devolvidos} devolvido(s)`}
              >
                {m.total > 0 ? (
                  <div className="rel-grafico-mensal-barra" style={{ height: `${Math.max(alturaTotal, 3)}%` }}>
                    {m.devolvidos > 0 && (
                      <div
                        className="rel-grafico-mensal-seg rel-grafico-mensal-seg-devolvido"
                        style={{ height: `${(m.devolvidos / m.total) * 100}%` }}
                      />
                    )}
                    {m.ativos > 0 && (
                      <div
                        className="rel-grafico-mensal-seg rel-grafico-mensal-seg-ativo"
                        style={{ height: `${(m.ativos / m.total) * 100}%` }}
                      />
                    )}
                    {m.atrasados > 0 && (
                      <div
                        className="rel-grafico-mensal-seg rel-grafico-mensal-seg-atrasado"
                        style={{ height: `${(m.atrasados / m.total) * 100}%` }}
                      />
                    )}
                  </div>
                ) : (
                  <div className="rel-grafico-mensal-barra rel-grafico-mensal-barra-vazia" />
                )}
              </div>
              <div className="rel-grafico-mensal-label">{m.label}</div>
            </div>
          );
        })}
      </div>

      <div className="rel-grafico-mensal-legenda">
        <span><i className="rel-legenda-dot rel-legenda-ativo" /> Ativos</span>
        <span><i className="rel-legenda-dot rel-legenda-atrasado" /> Atrasados</span>
        <span><i className="rel-legenda-dot rel-legenda-devolvido" /> Devolvidos</span>
      </div>
    </div>
  );
}