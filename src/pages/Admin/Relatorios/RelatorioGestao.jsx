import Skeleton from "../../../components/Skeleton/Skeleton";
import { useEffect, useId, useRef, useState } from 'react';
import { FiBookOpen, FiUsers, FiRepeat, FiSliders, FiChevronDown, FiDownload, FiFileText, FiLoader, FiSearch } from 'react-icons/fi';
import { getRelatorioGestao } from '../../../services/api';
import { exportarExcel, exportarPDF } from '../../../utils/exportarArquivo';
import { SERIES } from '../../../utils/series';
import BuscaUsuarioInput from './BuscaUsuarioInput';
import { CONSULTAS, GRUPOS_CONSULTAS, filtrosIniciais, valorCelula } from './consultas';

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
  const [grupo, setGrupo] = useState('Acervo');
  const [selecoes, setSelecoes] = useState(() => Object.fromEntries(
    GRUPOS_CONSULTAS.map(g => [g.nome, CONSULTAS.find(c => c.grupo === g.nome).id])
  ));
  const id = useId();
  const tipo = selecoes[grupo];
  const config = CONSULTAS.find(c => c.id === tipo);
  const opcoes = CONSULTAS.filter(c => c.grupo === grupo);
  const icones = { Acervo:FiBookOpen, Leitores:FiUsers, Circulação:FiRepeat };

  return <div className="rel-gestao">
    <section className="rel-consulta-navegacao" aria-label="Escolha do relatório">
      <div className="rel-navegacao-heading">
        <h2>Escolha o relatório</h2>
        <p>{GRUPOS_CONSULTAS.find(g => g.nome === grupo).descricao}</p>
      </div>
      <div className="rel-grupos" role="group" aria-label="Grupos de relatórios">
        {GRUPOS_CONSULTAS.map(g => {
          const Icone = icones[g.nome];
          return <button key={g.nome} type="button" aria-pressed={grupo === g.nome}
            aria-controls={`${id}-selecao`} onClick={() => setGrupo(g.nome)}>
            <Icone aria-hidden="true" /><span>{g.nome}</span>
            <span className="rel-grupo-contagem" aria-hidden="true">{CONSULTAS.filter(c => c.grupo === g.nome).length}</span>
          </button>;
        })}
      </div>
      <div id={`${id}-selecao`} className="rel-selecao-consulta">
        <label className="rel-filtro-campo" htmlFor={`${id}-relatorio`}>
          <span>Relatório de {grupo.toLocaleLowerCase('pt-BR')}</span>
          <select id={`${id}-relatorio`} value={tipo} aria-describedby={`${id}-descricao`}
            onChange={e => setSelecoes(s => ({...s,[grupo]:e.target.value}))}>
            {opcoes.map(c => <option key={c.id} value={c.id}>{c.titulo}</option>)}
          </select>
        </label>
        <p id={`${id}-descricao`}>{config.descricao}</p>
      </div>
    </section>
    <Consulta key={tipo} config={config} />
  </div>;
}

export function Consulta({ config }) {
  const inicial = filtrosIniciais(config);
  const [filtros, setFiltros] = useState(inicial);
  const [aplicados, setAplicados] = useState(inicial);
  const [usuario, setUsuario] = useState(null);
  const [usuarioAplicado, setUsuarioAplicado] = useState(null);
  const [avancadosAbertos, setAvancadosAbertos] = useState(false);
  const idAvancados = useId();
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [exportando, setExportando] = useState(false);
  const [erro, setErro] = useState('');
  const requisicao = useRef(0);
  const exportacao = useRef(0);
  const editado = JSON.stringify(filtros) !== JSON.stringify(aplicados);
  const tamanho = 50;

  async function buscar(atuais, pagina = 1, pessoa = usuario) {
    const id = ++requisicao.current;
    setCarregando(true); setErro('');
    try {
      const resultado = await getRelatorioGestao(config.id, {...atuais, pagina, tamanhoPagina:tamanho});
      if (id !== requisicao.current) return;
      setDados(resultado); setAplicados(atuais);
      setUsuarioAplicado(atuais.idUsuario || atuais.idAdminProfessor ? pessoa : null);
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
  if (usuarioAplicado) detalhes.push(`Leitor: ${usuarioAplicado.usuNome}`);
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

  const camposAdicionais = [
    ...(config.publico ? ['serie','turma','anoLetivo','finalidade', ...(config.id === 'leitores' ? [] : ['tipoUsuario'])] : []),
    ...(config.atividade ? ['atividade'] : []), ...(config.participacao ? ['participacao'] : []), 'ordenarPor','ordem',
  ];
  const adicionaisAtivos = camposAdicionais.filter(c => filtros[c] !== inicial[c]).length;
  const filtroStatus = <Campo label="Situação do exemplar"><select value={filtros.status} onChange={e => alterar('status',e.target.value)}><option value="">Todas</option>{statusOptions.map(s => <option key={s} value={s}>{s}</option>)}</select></Campo>;
  const filtroTipo = <Campo label="Tipo de leitor"><select value={filtros.tipoUsuario} onChange={e => alterar('tipoUsuario',e.target.value)}>
    <option value="todos">Todos</option><option>Aluno</option><option>Professor</option><option>Comunidade</option>
  </select></Campo>;

  return <section className="rel-gestao-consulta" aria-label={config.titulo} aria-busy={carregando}>
    <form className="rel-filtros-consulta" onSubmit={aplicar} aria-label={`Filtros de ${config.titulo}`}>
      <h3>Filtrar resultados</h3>
      {config.participacao && <div className="rel-atalhos" role="group" aria-label="Consultas rápidas">
        <span className="rel-atalhos-label">Exibir</span>
        <button type="button" disabled={carregando || exportando} aria-pressed={filtros.ordenarPor === 'emprestimos' && filtros.ordem === 'desc' && filtros.participacao === 'todos'} onClick={() => atalho({ordenarPor:'emprestimos', ordem:'desc', participacao:'todos'})}>Mais empréstimos</button>
        <button type="button" disabled={carregando || exportando} aria-pressed={filtros.ordenarPor === 'emprestimos' && filtros.ordem === 'asc' && filtros.participacao === 'todos'} onClick={() => atalho({ordenarPor:'emprestimos', ordem:'asc', participacao:'todos'})}>Menos empréstimos</button>
        <button type="button" disabled={carregando || exportando} aria-pressed={filtros.participacao === 'sem'} onClick={() => atalho({ordenarPor:'emprestimos', ordem:'asc', participacao:'sem'})}>Sem empréstimos</button>
      </div>}
      <div className="rel-filtros-principais">
      <Campo label="Busca"><input type="search" placeholder={config.id==='autores' ? 'Nome do autor…' : config.id==='leitores' ? 'Nome do leitor ou RA…' : ['livros','inventario','cadastro'].includes(config.id) ? 'Título, autor, ISBN ou tombo…' : config.id==='turmas' ? 'Turma ou série…' : 'Nome do leitor, livro, ISBN ou tombo…'} value={filtros.q} onChange={e => alterar('q',e.target.value)} /></Campo>
      {config.periodo && <>
        <Campo label="De"><input type="date" value={filtros.dataInicio} onChange={e => alterar('dataInicio',e.target.value)} /></Campo>
        <Campo label="Até"><input type="date" value={filtros.dataFim} onChange={e => alterar('dataFim',e.target.value)} /></Campo>
      </>}
      {config.id === 'leitores' && filtroTipo}
      {config.status && filtroStatus}
      {config.pessoa && <div className="rel-filtro-campo rel-filtro-pessoa"><span>Leitor específico</span><BuscaUsuarioInput usuarioSelecionado={usuario} onSelecionar={selecionar} onLimpar={() => {setUsuario(null); setFiltros(f => ({...f,idUsuario:'',idAdminProfessor:''}));}} /></div>}
      </div>
      <button type="button" className="rel-avancados-toggle" aria-expanded={avancadosAbertos} aria-controls={idAvancados} onClick={() => setAvancadosAbertos(a => !a)}>
        <FiSliders aria-hidden="true" /> Filtros adicionais
        {adicionaisAtivos > 0 && <span className="rel-filtros-contagem">{adicionaisAtivos} {adicionaisAtivos === 1 ? 'ativo' : 'ativos'}</span>}
        <FiChevronDown className={avancadosAbertos ? 'rel-chevron-aberto' : ''} aria-hidden="true" />
      </button>
      <div id={idAvancados} className="rel-filtros-adicionais" hidden={!avancadosAbertos}>
      {config.publico && <>
        {config.id !== 'leitores' && filtroTipo}
        <Campo label="Série"><select value={filtros.serie} onChange={e => alterar('serie',e.target.value)}><option value="">Todas</option>{SERIES.map(s => <option key={s}>{s}</option>)}</select></Campo>
        <Campo label="Turma"><input value={filtros.turma} placeholder="Ex.: A" onChange={e => alterar('turma',e.target.value)} /></Campo>
        <Campo label="Ano letivo do empréstimo"><input type="number" min="1900" max="9999" placeholder="Todos" value={filtros.anoLetivo} onChange={e => alterar('anoLetivo',e.target.value)} /></Campo>
        <Campo label="Finalidade"><select value={filtros.finalidade} onChange={e => alterar('finalidade',e.target.value)}><option value="">Todas</option><option value="PESSOAL">Pessoal (professor)</option><option value="TURMA">Para turma (professor)</option></select></Campo>
      </>}
      {config.atividade && <Campo label="Situação do cadastro"><select value={filtros.atividade} onChange={e => alterar('atividade',e.target.value)}><option value="todos">Todos</option><option value="ativos">Ativos</option><option value="inativos">Inativos</option>{config.id==='leitores' && <option value="formados">Formados</option>}</select></Campo>}
      {config.participacao && <Campo label="Participação"><select value={filtros.participacao} onChange={e => alterar('participacao',e.target.value)}><option value="todos">Todos</option><option value="com">Com empréstimos</option><option value="sem">Sem empréstimos</option></select></Campo>}
      <Campo label="Ordenar por"><select value={filtros.ordenarPor} onChange={e => alterar('ordenarPor',e.target.value)}>{config.ordenacoes.map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></Campo>
      <Campo label="Ordem"><select value={filtros.ordem} onChange={e => alterar('ordem',e.target.value)}><option value="desc">Decrescente</option><option value="asc">Crescente</option></select></Campo>
      </div>
      <div className="rel-filtros-acoes">
        <span className="rel-nota" role="status">{editado ? 'Há filtros alterados. Consulte para atualizar os resultados.' : 'Resultados correspondem aos filtros aplicados.'}</span>
        <div>
          <button className="rel-btn-limpar" type="button" disabled={carregando || exportando} onClick={limpar}>Limpar filtros</button>
          <button className="rel-btn-filtrar" disabled={carregando || exportando}>{carregando ? <FiLoader className="rel-spinner" /> : <><FiSearch aria-hidden="true" /> Consultar</>}</button>
        </div>
      </div>
    </form>
    {erro && <div className="rel-erro" role="alert">{erro}</div>}
    <div className="rel-resultados-heading">
      <div><h3>Resultados</h3><p>{config.titulo}</p></div>
      <div className="rel-export-actions" role="group" aria-label="Exportar todos os resultados filtrados">
        <button type="button" className="rel-btn-export" disabled={indisponivel} onClick={() => exportar('xlsx')}><FiDownload aria-hidden="true" /> {exportando ? 'Exportando…' : 'Excel completo'}</button>
        <button type="button" className="rel-btn-export" disabled={indisponivel} onClick={() => exportar('pdf')}><FiFileText aria-hidden="true" /> PDF completo</button>
      </div>
    </div>
    {carregando && <Skeleton variant="reports" rows={5} />}
    {!carregando && dados && <>
      <dl className="rel-resumo" aria-label="Resumo dos resultados">
        {Object.entries(totais).map(([k,v]) => <div key={k}><dt>{{registros:'Registros',emprestimos:'Exemplares emprestados',exemplares:'Exemplares no cadastro',ativos:'Em posse',atrasados:'Em atraso',renovacoes:'Renovações acumuladas'}[k] || k}</dt><dd>{v.toLocaleString('pt-BR')}</dd></div>)}
      </dl>
      <div className="rel-contexto-resultados">
        <p><strong>Filtros aplicados:</strong> {detalhes.join(' · ') || 'Todos os registros'}</p>
        <p>Atualizado em {new Date(dados.geradoEm).toLocaleString('pt-BR')}</p>
      </div>
      {dados.notas.length > 0 && <details className="rel-metodologia"><summary>Como interpretar este relatório</summary><div>{dados.notas.map(n => <p key={n}>{n}</p>)}</div></details>}
    </>}
    <div className="rel-table-box" role="region" aria-label="Tabela de resultados" tabIndex={0}>
      <table><caption className="rel-sr-only">{config.titulo}</caption><thead><tr>{config.colunas.map(c => <th key={c.chave} scope="col">{c.label}</th>)}</tr></thead>
        <tbody>{carregando ? <tr><td colSpan={config.colunas.length} className="rel-empty"><Skeleton variant="table" /></td></tr>
          : !dados?.itens.length ? <tr><td colSpan={config.colunas.length} className="rel-empty">Nenhum registro para os filtros informados.</td></tr>
            : dados.itens.map((item,index) => <tr key={`${item.idExemplar || item.chave || item.idLivro || item.idAutor || ''}-${index}`}>{config.colunas.map(c => <td key={c.chave}>{valorCelula(item,c)}</td>)}</tr>)}</tbody>
      </table>
    </div>
    {dados && <nav className="rel-paginacao" aria-label="Paginação do relatório">
      <span>{dados.total} registros · Página {dados.pagina} de {paginas}</span>
      <button type="button" disabled={carregando || exportando || dados.pagina<=1} onClick={() => buscar(aplicados,dados.pagina-1,usuarioAplicado)}>Anterior</button>
      <button type="button" disabled={carregando || exportando || dados.pagina>=paginas} onClick={() => buscar(aplicados,dados.pagina+1,usuarioAplicado)}>Próxima</button>
    </nav>}
    <p className="rel-export-hint">Excel e PDF incluem todos os registros dos filtros aplicados, inclusive os de outras páginas.</p>
  </section>;
}
