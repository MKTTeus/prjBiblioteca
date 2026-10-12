import { useEffect, useRef, useState } from 'react';
import { FiDownload, FiFileText, FiLoader, FiSearch } from 'react-icons/fi';
import { getRelatorioGestao } from '../../../services/api';
import { exportarExcel, exportarPDF } from '../../../utils/exportarArquivo';
import { SERIES } from '../../../utils/series';
import BuscaUsuarioInput from './BuscaUsuarioInput';
import { CONSULTAS, filtrosIniciais, valorCelula } from './consultas';

function Campo({ label, children }) {
  return <label className="rel-filtro-campo"><span>{label}</span>{children}</label>;
}

function mensagemErro(erro, fallback) {
  const detalhe = erro.data?.detail;
  if (typeof detalhe === 'string') return detalhe;
  if (Array.isArray(detalhe)) return 'Confira os filtros informados e tente novamente.';
  return fallback;
}

export default function RelatorioGestao() {
  const [tipo, setTipo] = useState('livros');
  return <div>
    <div className="rel-consultas-grid" aria-label="Consultas de controle">
      {CONSULTAS.map(c => <button key={c.id} type="button" aria-pressed={tipo === c.id}
        className={`rel-consulta-card ${tipo === c.id ? 'rel-consulta-card-active' : ''}`} onClick={() => setTipo(c.id)}>
        <span>{c.grupo}</span><strong>{c.titulo}</strong><small>{c.descricao}</small>
      </button>)}
    </div>
    <Consulta key={tipo} config={CONSULTAS.find(c => c.id === tipo)} />
  </div>;
}

export function Consulta({ config }) {
  const inicial = filtrosIniciais(config);
  const [filtros, setFiltros] = useState(inicial);
  const [aplicados, setAplicados] = useState(inicial);
  const [usuario, setUsuario] = useState(null);
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [exportando, setExportando] = useState(false);
  const [erro, setErro] = useState('');
  const requisicao = useRef(0);
  const exportacao = useRef(0);
  const editado = JSON.stringify(filtros) !== JSON.stringify(aplicados);
  const tamanho = 50;

  async function buscar(atuais, pagina = 1) {
    const id = ++requisicao.current;
    setCarregando(true); setErro('');
    try {
      const resultado = await getRelatorioGestao(config.id, {...atuais, pagina, tamanhoPagina:tamanho});
      if (id !== requisicao.current) return;
      setDados(resultado); setAplicados(atuais);
    } catch (e) {
      if (id === requisicao.current) { setDados(null); setErro(mensagemErro(e,'Não foi possível consultar o relatório. Tente novamente.')); }
    } finally { if (id === requisicao.current) setCarregando(false); }
  }

  useEffect(() => {
    buscar(inicial);
    return () => { requisicao.current += 1; exportacao.current += 1; };
    // Cada consulta é remontada ao selecionar outro relatório.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function alterar(campo, valor) { setFiltros(f => ({...f, [campo]:valor})); }
  function selecionar(pessoa) {
    setUsuario(pessoa);
    setFiltros(f => ({...f, idUsuario:pessoa.idUsuario || '', idAdminProfessor:pessoa.idAdminProfessor || '',
      tipoUsuario:'todos', serie:'', turma:'', atividade:'todos', dataInicio:'', dataFim:''}));
  }
  function limpar() { setUsuario(null); setFiltros(inicial); buscar(inicial); }
  function aplicar(e) {
    e.preventDefault();
    if (filtros.dataInicio && filtros.dataFim && filtros.dataInicio > filtros.dataFim) {
      setErro('A data inicial deve ser anterior ou igual à data final.'); return;
    }
    buscar(filtros);
  }
  function atalho(valores) {
    const novos = {...filtros, ...valores};
    setFiltros(novos); buscar(novos);
  }
  const detalhesFiltros = Object.entries(aplicados).filter(([k,v]) => v !== '' && v !== 'todos' && !['ordenarPor','ordem','idUsuario','idAdminProfessor'].includes(k));
  const nomesFiltros = { dataInicio:'De', dataFim:'Até', q:'Busca', tipoUsuario:'Tipo de leitor', atividade:'Cadastro', serie:'Série', turma:'Turma', anoLetivo:'Ano letivo', finalidade:'Finalidade', status:'Situação', participacao:'Participação' };
  const detalhes = detalhesFiltros.map(([k,v]) => `${nomesFiltros[k] || k}: ${v}`);
  if (usuario) detalhes.push(`Leitor: ${usuario.usuNome}`);
  if (config.periodo && !aplicados.dataInicio && !aplicados.dataFim) detalhes.unshift('Todo o período');

  async function exportar(formato) {
    const id = ++exportacao.current;
    setExportando(true); setErro('');
    try {
      const completo = await getRelatorioGestao(config.id, {...aplicados, exportar:true});
      if (id !== exportacao.current) return;
      const opcoes = { titulo:config.titulo, subtitulo:detalhes.join(' · '),
        nomeAba:config.titulo, colunas:config.colunas.map(c => c.label),
        linhas:completo.itens.map(i => config.colunas.map(c => valorCelula(i,c))),
        detalhes:[...detalhes, ...completo.notas, `Registros: ${completo.total}`],
        nomeArquivo:`relatorio-${config.id}-${new Date().toISOString().slice(0,10)}` };
      if (formato === 'pdf') exportarPDF({...opcoes, subtitulo:[opcoes.subtitulo, ...completo.notas].filter(Boolean).join('\n')});
      else await exportarExcel(opcoes);
    } catch (e) { if (id === exportacao.current) setErro(mensagemErro(e,'Não foi possível exportar o relatório. Tente novamente.')); }
    finally { if (id === exportacao.current) setExportando(false); }
  }
  const indisponivel = carregando || exportando || editado || !dados?.total;
  const totais = dados?.resumo || {};
  const paginas = Math.max(1, Math.ceil((dados?.total || 0)/tamanho));
  const statusOptions = config.id === 'inventario' ? ['Disponível','Emprestado','Reservado','Indisponível','Tombo Fixo','Desativado']
    : config.id === 'solicitacoes' ? ['Pendente','Aprovado','Expirado','Negado','Ativo','Devolvido'] : ['ativo','atrasado','devolvido'];

  return <section className="rel-tab-content" aria-label={config.titulo} aria-busy={carregando}>
    <div className="rel-subheader">
      <div><h2>{config.titulo}</h2><p>{config.descricao}</p></div>
      <div className="rel-export-actions">
        <button type="button" className="rel-btn-export" disabled={indisponivel} onClick={() => exportar('xlsx')}><FiDownload /> {exportando ? 'Exportando…' : 'Excel completo'}</button>
        <button type="button" className="rel-btn-export" disabled={indisponivel} onClick={() => exportar('pdf')}><FiFileText /> PDF completo</button>
      </div>
    </div>
    {config.participacao && <div className="rel-atalhos" aria-label="Consultas rápidas">
      <button type="button" disabled={carregando} onClick={() => atalho({ordenarPor:'emprestimos', ordem:'desc', participacao:'todos'})}>Mais empréstimos</button>
      <button type="button" disabled={carregando} onClick={() => atalho({ordenarPor:'emprestimos', ordem:'asc', participacao:'todos'})}>Menos empréstimos</button>
      <button type="button" disabled={carregando} onClick={() => atalho({ordenarPor:'emprestimos', ordem:'asc', participacao:'sem'})}>Sem empréstimos</button>
    </div>}
    <form className="rel-filtros" onSubmit={aplicar}>
      <Campo label="Busca"><input type="search" placeholder={config.id==='autores' ? 'Nome do autor…' : config.id==='leitores' ? 'Nome do leitor ou RA…' : ['livros','inventario','cadastro'].includes(config.id) ? 'Título, autor, ISBN ou tombo…' : config.id==='turmas' ? 'Turma ou série…' : 'Nome do leitor, livro, ISBN ou tombo…'} value={filtros.q} onChange={e => alterar('q',e.target.value)} /></Campo>
      {config.periodo && <>
        <Campo label="De"><input type="date" value={filtros.dataInicio} onChange={e => alterar('dataInicio',e.target.value)} /></Campo>
        <Campo label="Até"><input type="date" value={filtros.dataFim} onChange={e => alterar('dataFim',e.target.value)} /></Campo>
      </>}
      {config.publico && <>
        <Campo label="Tipo de leitor"><select value={filtros.tipoUsuario} onChange={e => alterar('tipoUsuario',e.target.value)}>
          <option value="todos">Todos</option><option>Aluno</option><option>Professor</option><option>Comunidade</option>
        </select></Campo>
        <Campo label="Série"><select value={filtros.serie} onChange={e => alterar('serie',e.target.value)}><option value="">Todas</option>{SERIES.map(s => <option key={s}>{s}</option>)}</select></Campo>
        <Campo label="Turma"><input value={filtros.turma} placeholder="Ex.: A" onChange={e => alterar('turma',e.target.value)} /></Campo>
        <Campo label="Ano letivo do empréstimo"><input type="number" min="1900" max="9999" placeholder="Todos" value={filtros.anoLetivo} onChange={e => alterar('anoLetivo',e.target.value)} /></Campo>
        <Campo label="Finalidade"><select value={filtros.finalidade} onChange={e => alterar('finalidade',e.target.value)}><option value="">Todas</option><option value="PESSOAL">Pessoal (professor)</option><option value="TURMA">Para turma (professor)</option></select></Campo>
      </>}
      {config.pessoa && <div className="rel-filtro-campo"><span>Leitor específico</span><BuscaUsuarioInput usuarioSelecionado={usuario} onSelecionar={selecionar} onLimpar={() => {setUsuario(null); setFiltros(f => ({...f,idUsuario:'',idAdminProfessor:''}));}} /></div>}
      {config.atividade && <Campo label="Situação do cadastro"><select value={filtros.atividade} onChange={e => alterar('atividade',e.target.value)}><option value="todos">Todos</option><option value="ativos">Ativos</option><option value="inativos">Inativos</option>{config.id==='leitores' && <option value="formados">Formados</option>}</select></Campo>}
      {config.status && <Campo label="Situação do exemplar"><select value={filtros.status} onChange={e => alterar('status',e.target.value)}><option value="">Todas</option>{statusOptions.map(s => <option key={s} value={s}>{s}</option>)}</select></Campo>}
      {config.participacao && <Campo label="Participação"><select value={filtros.participacao} onChange={e => alterar('participacao',e.target.value)}><option value="todos">Todos</option><option value="com">Com empréstimos</option><option value="sem">Sem empréstimos</option></select></Campo>}
      <Campo label="Ordenar por"><select value={filtros.ordenarPor} onChange={e => alterar('ordenarPor',e.target.value)}>{config.ordenacoes.map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></Campo>
      <Campo label="Ordem"><select value={filtros.ordem} onChange={e => alterar('ordem',e.target.value)}><option value="desc">Decrescente</option><option value="asc">Crescente</option></select></Campo>
      <button className="rel-btn-filtrar" disabled={carregando || exportando}>{carregando ? <FiLoader className="rel-spinner" /> : <><FiSearch /> Consultar</>}</button>
      <button className="rel-btn-export" type="button" disabled={carregando || exportando} onClick={limpar}>Limpar filtros</button>
    </form>
    {editado && <p className="rel-nota" role="status">Filtros alterados. Clique em Consultar para atualizar os resultados e liberar a exportação.</p>}
    {erro && <div className="rel-erro" role="alert">{erro}</div>}
    {!carregando && dados && <>
      <div className="rel-resumo" aria-label="Resumo dos resultados">
        {Object.entries(totais).map(([k,v]) => <div key={k}><strong>{v.toLocaleString('pt-BR')}</strong><span>{{registros:'Registros',emprestimos:'Exemplares emprestados',exemplares:'Exemplares no cadastro',ativos:'Em posse',atrasados:'Em atraso',renovacoes:'Renovações acumuladas'}[k] || k}</span></div>)}
      </div>
      <div className="rel-notas">{dados.notas.map(n => <p key={n}>{n}</p>)}</div>
      <p className="rel-nota">Filtros aplicados: {detalhes.join(' · ') || 'Todos os registros'} · Atualizado em {new Date(dados.geradoEm).toLocaleString('pt-BR')}</p>
    </>}
    <div className="rel-table-box">
      <table><caption className="rel-sr-only">{config.titulo}</caption><thead><tr>{config.colunas.map(c => <th key={c.chave} scope="col">{c.label}</th>)}</tr></thead>
        <tbody>{carregando ? <tr><td colSpan={config.colunas.length} className="rel-empty">Carregando…</td></tr>
          : !dados?.itens.length ? <tr><td colSpan={config.colunas.length} className="rel-empty">Nenhum registro para os filtros informados.</td></tr>
            : dados.itens.map((item,index) => <tr key={`${item.idExemplar || item.chave || item.idLivro || item.idAutor || ''}-${index}`}>{config.colunas.map(c => <td key={c.chave}>{valorCelula(item,c)}</td>)}</tr>)}</tbody>
      </table>
    </div>
    {dados && <nav className="rel-paginacao" aria-label="Paginação do relatório">
      <span>{dados.total} registros · Página {dados.pagina} de {paginas} · Exportações incluem todos os resultados filtrados</span>
      <button type="button" disabled={carregando || exportando || dados.pagina<=1} onClick={() => buscar(aplicados,dados.pagina-1)}>Anterior</button>
      <button type="button" disabled={carregando || exportando || dados.pagina>=paginas} onClick={() => buscar(aplicados,dados.pagina+1)}>Próxima</button>
    </nav>}
  </section>;
}
