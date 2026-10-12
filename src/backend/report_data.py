"""Consultas administrativas: dados mínimos, leitura paginada e contagem por exemplar."""
from collections import Counter, defaultdict
from unicodedata import normalize, combining

from core import consultar_completo, executar_em_paralelo
from database import supabase


def texto(value):
    return ''.join(c for c in normalize('NFD', str(value or '').casefold()) if not combining(c))


def carregar(tabelas):
    """Só as tabelas usadas pela consulta; nenhuma senha ou token é selecionado."""
    def ler(tabela, campos):
        return consultar_completo(lambda: supabase.table(tabela).select(campos), tabela).data or []
    respostas = executar_em_paralelo(*(lambda t=t, c=c: ler(t, c) for t, c in tabelas.items()))
    return dict(zip(tabelas, respostas))


CATALOGO = {
    'Livro': 'idLivro,livTitulo,livISBN,livAnoPublicacao,livAtivo,idEditora,livCDD',
    'Exemplar': 'idExemplar,idLivro,exeLivTombo,exeLivStatus,exeLivLocalizacao',
    'Autor': 'idAutor,autNome,autABNT',
    'LivroAutor': 'idLivro,idAutor',
    'Editora': 'idEditora,ediNome',
    'Categoria': 'idCategoria,catNome', 'LivroCategoria': 'idLivro,idCategoria',
    'Genero': 'idGenero,genNome', 'LivroGenero': 'idLivro,idGenero',
}
LEITORES = {
    'Usuario': 'idUsuario,usuNome,usuTipo,usuRA,usuSerie,usuTurma,usuAnoLetivo,usuStatus,usuFormado,usuExcluido',
    'Administrador': 'idAdmin,admNome,admStatus,admProfessor',
}


def identidade(item):
    if item.get('idAdminProfessor') is not None:
        return f"professor:{item['idAdminProfessor']}"
    return f"usuario:{item.get('idUsuario')}"


def _vinculos(dados, tabela, campo_id, campo_nome):
    nomes = {r[campo_id]: r.get(campo_nome) for r in dados[tabela]}
    por_livro = defaultdict(dict)
    for r in dados['Livro' + tabela]:
        if r.get(campo_id) in nomes:
            por_livro[r['idLivro']][r[campo_id]] = nomes[r[campo_id]]
    return por_livro


def _livros(dados, atividade):
    autores = _vinculos(dados, 'Autor', 'idAutor', 'autNome')
    categorias = _vinculos(dados, 'Categoria', 'idCategoria', 'catNome')
    generos = _vinculos(dados, 'Genero', 'idGenero', 'genNome')
    editoras = {e['idEditora']: e.get('ediNome') for e in dados['Editora']}
    return {l['idLivro']: {
        'idLivro': l['idLivro'], 'titulo': l.get('livTitulo'), 'isbn': l.get('livISBN'),
        'anoPublicacao': l.get('livAnoPublicacao'), 'cdd': l.get('livCDD'),
        'situacao': 'Ativo' if l.get('livAtivo') else 'Inativo',
        'autores': ', '.join(autores[l['idLivro']].values()),
        'editora': editoras.get(l.get('idEditora')),
        'categorias': ', '.join(categorias[l['idLivro']].values()),
        'generos': ', '.join(generos[l['idLivro']].values()),
    } for l in dados['Livro'] if atividade == 'todos' or bool(l.get('livAtivo')) == (atividade == 'ativos')}


def _pessoas(dados, filtros):
    pessoas = []
    for u in dados['Usuario']:
        if u.get('usuExcluido'):
            continue
        situacao = 'Formado' if u.get('usuFormado') else ('Ativo' if u.get('usuStatus') else 'Inativo')
        pessoas.append({'chave': f"usuario:{u['idUsuario']}", 'idUsuario': u['idUsuario'],
            'usuario': u.get('usuNome'), 'tipo': u.get('usuTipo'), 'ra': u.get('usuRA'),
            'serie': u.get('usuSerie'), 'turma': u.get('usuTurma'), 'anoLetivo': u.get('usuAnoLetivo'),
            'situacao': situacao})
    for p in dados['Administrador']:
        if p.get('admProfessor'):
            pessoas.append({'chave': f"professor:{p['idAdmin']}", 'idAdminProfessor': p['idAdmin'],
                'usuario': p.get('admNome'), 'tipo': 'Professor',
                'situacao': 'Ativo' if p.get('admStatus') else 'Inativo'})
    return [p for p in pessoas if
        (filtros['atividade'] == 'todos' or p['situacao'] == {'ativos':'Ativo','inativos':'Inativo','formados':'Formado'}[filtros['atividade']]) and
        (filtros['tipoUsuario'] == 'todos' or p['tipo'] == filtros['tipoUsuario']) and
        (not filtros['serie'] or p.get('serie') == filtros['serie']) and
        (not filtros['turma'] or p.get('turma') == filtros['turma']) and
        (not filtros['idUsuario'] or p.get('idUsuario') == filtros['idUsuario']) and
        (not filtros['idAdminProfessor'] or p.get('idAdminProfessor') == filtros['idAdminProfessor'])]


def montar_gestao(tipo, filtros, buscar_emprestimos):
    """Gera a população completa ANTES de ordenar e paginar (inclui zeros)."""
    catalogo = tipo in ('livros','inventario','autores','cadastro')
    dados = carregar(CATALOGO if catalogo else LEITORES) if catalogo or tipo in ('leitores','turmas') else {}
    argumentos = {k: filtros[k] for k in ('tipoUsuario','turma','serie','anoLetivo','idUsuario','idAdminProfessor','finalidade')}
    # Devoluções usam a data de devolução; renovações são totais dos empréstimos
    # originados no período, pois o sistema não armazena a data de cada renovação.
    if tipo != 'devolucoes':
        argumentos.update(dataInicio=filtros['dataInicio'], dataFim=filtros['dataFim'])
    if tipo in ('inventario','cadastro'):
        emprestimos = []
    elif tipo == 'solicitacoes':
        def consulta():
            q = supabase.table('Movimentacao').select('*').order('idMovimentacao')
            if filtros['dataInicio']: q = q.gte('movDataSolicitacao', filtros['dataInicio'])
            if filtros['dataFim']: q = q.lte('movDataSolicitacao', filtros['dataFim'])
            if filtros['idUsuario']: q = q.eq('idUsuario', filtros['idUsuario'])
            if filtros['idAdminProfessor']: q = q.eq('idAdminProfessor', filtros['idAdminProfessor'])
            return q
        from core import buscar_todos
        from loan_data import montar_itens
        emprestimos = montar_itens(buscar_todos(consulta))
        emprestimos = [i for i in emprestimos if i.get('movTipo') == 'SOLICITACAO' or i.get('dataConfirmacao') or i.get('dataEmprestimo') is None]
        emprestimos = [i for i in emprestimos if
            (filtros['tipoUsuario']=='todos' or i['usuarioTipo']==filtros['tipoUsuario']) and
            (not filtros['turma'] or i.get('turma')==filtros['turma']) and
            (not filtros['serie'] or i.get('serie')==filtros['serie']) and
            (not filtros['anoLetivo'] or i.get('movAnoLetivo')==filtros['anoLetivo']) and
            (not filtros['finalidade'] or i.get('movFinalidade')==filtros['finalidade'])]
    else:
        emprestimos = buscar_emprestimos(**argumentos)

    notas = []
    if tipo in ('historico','devolucoes','renovacoes','solicitacoes'):
        itens = [{**i, 'tipo':i.get('usuarioTipo'), 'tombo':i.get('codigo'),
            'finalidade':i.get('movFinalidade'), 'renovacoes':i.get('renovacoes') or 0,
            'dataSolicitacao':i.get('movDataSolicitacao'),
            'situacao':i.get('itemStatus') if tipo=='solicitacoes' else i.get('status')} for i in emprestimos]
        if tipo == 'devolucoes':
            itens = [i for i in itens if i.get('dataDevolucao') and
                (not filtros['dataInicio'] or str(i['dataDevolucao'])[:10]>=filtros['dataInicio']) and
                (not filtros['dataFim'] or str(i['dataDevolucao'])[:10]<=filtros['dataFim'])]
            notas.append('O período considera a data da devolução, inclusive devoluções parciais.')
        if tipo == 'renovacoes':
            itens = [i for i in itens if i['renovacoes']>0]
            notas.append('Renovações acumuladas de empréstimos iniciados no período. Não há registro da data de cada renovação.')
        if tipo == 'solicitacoes':
            notas.append('Uma linha por exemplar solicitado; o período considera a data da solicitação.')
    elif tipo in ('livros','inventario','cadastro','autores'):
        livros = _livros(dados, filtros['atividade'])
        exemplares = defaultdict(list)
        for ex in dados['Exemplar']: exemplares[ex['idLivro']].append(ex)
        totais = Counter(i.get('idLivro') for i in emprestimos)
        ultimos = {}
        for i in emprestimos:
            lid = i.get('idLivro')
            ultimos[lid] = max(ultimos.get(lid) or '', i.get('dataEmprestimo') or '')
        itens = []
        if tipo == 'inventario':
            for lid, livro in livros.items():
                for ex in exemplares[lid]:
                    itens.append({**livro, 'idExemplar':ex['idExemplar'], 'tombo':ex.get('exeLivTombo'),
                        'status':ex.get('exeLivStatus'), 'localizacao':ex.get('exeLivLocalizacao')})
            notas.append('Situação atual dos exemplares, incluindo desativados. Não representa uma posição histórica de estoque.')
        elif tipo == 'autores':
            vinculos = defaultdict(set)
            for v in dados['LivroAutor']:
                if v['idLivro'] in livros: vinculos[v['idAutor']].add(v['idLivro'])
            for autor in dados['Autor']:
                ids = vinculos[autor['idAutor']]
                itens.append({'idAutor':autor['idAutor'], 'autor':autor.get('autNome'), 'abnt':autor.get('autABNT'),
                    'titulos':len(ids), 'exemplares':sum(len(exemplares[lid]) for lid in ids),
                    'emprestimos':sum(totais[lid] for lid in ids)})
            notas.append('Obras com coautoria contam para cada autor; os totais por autor não devem ser somados como total da biblioteca.')
        else:
            for lid, livro in livros.items():
                pendencias = [nome for campo, nome in [('isbn','ISBN'),('autores','Autor'),('editora','Editora'),('categorias','Categoria'),('generos','Gênero'),('cdd','CDD')] if not livro.get(campo)]
                if not exemplares[lid]: pendencias.append('Sem exemplares')
                itens.append({**livro, 'exemplares':len(exemplares[lid]),
                    'disponiveis':sum(texto(e.get('exeLivStatus'))=='disponivel' for e in exemplares[lid]),
                    'emprestimos':totais[lid], 'ultimoEmprestimo':ultimos.get(lid),
                    'pendencias':', '.join(pendencias)})
            if tipo=='cadastro':
                itens = [i for i in itens if i['pendencias']]
                notas.append('Campos ausentes indicam revisão cadastral; ISBN e CDD podem não se aplicar a todas as obras.')
            else:
                notas.append('Inclui títulos com zero empréstimos no período e contabiliza cada exemplar retirado uma vez.')
    else:
        pessoas = _pessoas(dados, filtros)
        por_pessoa = defaultdict(list)
        for i in emprestimos: por_pessoa[identidade(i)].append(i)
        itens = []
        for p in pessoas:
            loans = por_pessoa[p['chave']]
            itens.append({**p, 'emprestimos':len(loans),
                'livrosDistintos':len({i['idLivro'] for i in loans}),
                'ativos':sum(i['status'] in ('ativo','atrasado') for i in loans),
                'atrasados':sum(i['status']=='atrasado' for i in loans),
                'devolvidos':sum(i['status']=='devolvido' for i in loans),
                'ultimoEmprestimo':max((i.get('dataEmprestimo') or '' for i in loans),default=None)})
        notas.append('Cadastro atual dos leitores, incluindo quem não emprestou. Contas excluídas não aparecem. Histórico mantém a turma/série registrada no empréstimo.')
        if tipo == 'turmas':
            grupos = {}
            def grupo(key):
                return grupos.setdefault(key, {'serie':key[0], 'turma':key[1], 'alunos':0,
                    'leitores':set(), 'professores':set(), 'emprestimos':0, 'emprestimosTurma':0})
            # População matriculada atual; circulação agrupada pela turma histórica.
            for p in pessoas:
                if p['tipo']!='Aluno': continue
                key = (p.get('serie') or 'Sem série', p.get('turma') or 'Sem turma')
                g = grupo(key)
                g['alunos'] += 1
            for i in emprestimos:
                para_turma = i.get('usuarioTipo')=='Professor' and i.get('movFinalidade')=='TURMA'
                if i.get('usuarioTipo')!='Aluno' and not para_turma: continue
                key = (i.get('serie') or 'Sem série', i.get('turma') or 'Sem turma')
                g = grupo(key)
                if para_turma:
                    g['professores'].add(identidade(i)); g['emprestimosTurma'] += 1
                else:
                    g['leitores'].add(identidade(i))
                g['emprestimos'] += 1
            itens = [{**g, 'leitores':len(g['leitores']), 'professores':len(g['professores'])} for g in grupos.values()]
            notas.append('Alunos cadastrados usam a turma atual; leitores e circulação usam a turma histórica. Inclui livros retirados por professores para a turma, identificados na coluna Uso em sala.')
    return itens, notas
