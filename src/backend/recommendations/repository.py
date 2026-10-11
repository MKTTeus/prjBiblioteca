"""Leituras paginadas; não consulta nomes, emails ou senhas dos vizinhos."""
from collections import Counter, defaultdict
from core import buscar_todos, executar_em_paralelo
from database import supabase
from routers.livros import enriquecer_livros


def carregar_catalogo():
    livros, exemplares = executar_em_paralelo(
        lambda: buscar_todos(lambda: supabase.table('Livro').select(
            '*,LivroCategoria(Categoria(catNome)),LivroGenero(Genero(genNome))').order('idLivro')),
        lambda: buscar_todos(lambda: supabase.table('Exemplar').select(
            'idLivro,exeLivStatus').order('idExemplar')),
    )
    contagens = defaultdict(Counter)
    for exemplar in exemplares:
        contagens[exemplar['idLivro']][exemplar['exeLivStatus']] += 1
    for livro in livros:
        counts = contagens[livro['idLivro']]
        livro.update(disponiveis=counts['Disponível'], emprestados=counts['Emprestado'],
                     reservados=counts['Reservado'], exemplares_cadastrados=sum(counts.values()),
                     total_exemplares=sum(n for s, n in counts.items() if s != 'Desativado'))
    return enriquecer_livros(livros)


def carregar_historico(usuario_id=None):
    def consulta():
        query = supabase.table('HistoricoRecomendacao').select('*')
        if usuario_id is not None:
            query = query.eq('idUsuario', usuario_id)
        return query.order('idUsuario').order('idLivro')
    return buscar_todos(consulta)


def livros_avaliaveis(usuario_id):
    historico = carregar_historico(usuario_id)
    devolvidos = [h for h in historico if h['devolvido']]
    if not devolvidos:
        return []
    from core import consultar_lote
    livros = consultar_lote(lambda ids: supabase.table('Livro').select(
        'idLivro,livTitulo').in_('idLivro', ids), 'Livro', [h['idLivro'] for h in devolvidos]).data
    titulos = {b['idLivro']: b['livTitulo'] for b in livros}
    return [{'idLivro': h['idLivro'], 'livTitulo': titulos[h['idLivro']],
             'nota': h.get('nota'), 'devolvidoEm': h['devolvidoEm']} for h in sorted(
                 devolvidos, key=lambda h: (h['devolvidoEm'], h['idLivro']), reverse=True)
            if h['idLivro'] in titulos]
