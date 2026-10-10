from core import buscar_todos, datetime_utc, business_today
from database import supabase

def relacionados(tabela, coluna, ids, campos, ordem):
    ids = list(set(ids)); resultado = []
    for inicio in range(0, len(ids), 100):
        lote = ids[inicio:inicio + 100]
        resultado.extend(buscar_todos(lambda: supabase.table(tabela).select(campos).in_(coluna, lote).order(ordem)))
    return resultado

def montar_itens(movimentacoes):
    movs = {m['idMovimentacao']: m for m in movimentacoes}
    itens = relacionados('MovimentacaoExemplar', 'idMovimentacao', movs, '*', 'idExemplar')
    exemplares = {e['idExemplar']: e for e in relacionados('Exemplar', 'idExemplar', [i['idExemplar'] for i in itens], 'idExemplar, idLivro, exeLivTombo', 'idExemplar')}
    livros = {l['idLivro']: l for l in relacionados('Livro', 'idLivro', [e['idLivro'] for e in exemplares.values()], 'idLivro, livTitulo, livISBN', 'idLivro')}
    usuarios = {u['idUsuario']: u for u in relacionados('Usuario', 'idUsuario', [m['idUsuario'] for m in movimentacoes if m.get('idUsuario')], 'idUsuario, usuNome, usuTipo, usuSerie, usuTurma', 'idUsuario')}
    professores = {a['idAdmin']: a for a in relacionados('Administrador', 'idAdmin', [m['idAdminProfessor'] for m in movimentacoes if m.get('idAdminProfessor')], 'idAdmin, admNome', 'idAdmin')}
    resultado = []; hoje = business_today()
    for it in itens:
        m = movs[it['idMovimentacao']]; ex = exemplares.get(it['idExemplar'], {}); livro = livros.get(ex.get('idLivro'), {})
        u = usuarios.get(m.get('idUsuario'), {}); prof = professores.get(m.get('idAdminProfessor'), {})
        status = (it.get('itemStatus') or m['movStatus']).lower()
        if status == 'ativo' and it.get('dataPrevistaDevolucao') and datetime_utc(it['dataPrevistaDevolucao']).date() < hoje: status = 'atrasado'
        row = {**m, **it, 'idEmprestimo': m['idMovimentacao'], 'idLivro': ex.get('idLivro'),
            'usuario': m.get('movUsuarioNome') or prof.get('admNome') or u.get('usuNome') or 'Usuário não informado',
            'usuarioTipo': m.get('movUsuarioTipo') or ('Professor' if prof else u.get('usuTipo', '-')),
            'serie': m.get('movSerie') or u.get('usuSerie'), 'turma': m.get('movTurma') or u.get('usuTurma'),
            'titulo': livro.get('livTitulo', 'Livro'), 'codigo': ex.get('exeLivTombo'), 'isbn': livro.get('livISBN'),
            'status': status, 'dataEmprestimo': m.get('movDataEmprestimo'),
            'empLiv_Titulo': livro.get('livTitulo'), 'empLiv_Tombo': ex.get('exeLivTombo'),
            'empLiv_Status': 'Atrasado' if status == 'atrasado' else it.get('itemStatus'),
            'empLiv_DataEmprestimo': m.get('movDataEmprestimo'), 'empLiv_DataDevolucao': it.get('dataDevolucao'),
            'empLiv_DataPrevistaDevolucao': it.get('dataPrevistaDevolucao'), 'empLiv_RenovacoesTotais': it.get('renovacoes',0),
            'statusConfirmacao': m.get('status_confirmacao'), 'dataConfirmacao': m.get('data_confirmacao'),
            'prazoHoras': m.get('prazo_horas')}
        resultado.append(row)
    return resultado
