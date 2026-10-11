"""Consultas agregadas; não consulta nomes, emails ou senhas dos vizinhos."""
from core import buscar_todos
from database import supabase
from rpc import executar_rpc


def carregar_catalogo():
    resultado = executar_rpc('catalogo_livros', {
        'p_busca': None, 'p_pagina': 1, 'p_por_pagina': 10000,
        'p_incluir_inativos': False, 'p_incluir_sem_exemplares': False,
    }) or {}
    return resultado.get('itens', [])


def carregar_historico(usuario_id=None):
    def consulta():
        query = supabase.table('HistoricoRecomendacao').select('*')
        if usuario_id is not None:
            query = query.eq('idUsuario', usuario_id)
        return query.order('idUsuario').order('idLivro')
    return buscar_todos(consulta)


def montar_avaliacoes(historico, livros):
    devolvidos = [h for h in historico if h['devolvido']]
    if not devolvidos:
        return []
    titulos = {b['idLivro']: b['livTitulo'] for b in livros}
    return [{'idLivro': h['idLivro'], 'livTitulo': titulos[h['idLivro']],
             'nota': h.get('nota'), 'devolvidoEm': h['devolvidoEm']} for h in sorted(
                 devolvidos, key=lambda h: (h['devolvidoEm'], h['idLivro']), reverse=True)
            if h['idLivro'] in titulos]


def livros_avaliaveis(usuario_id):
    historico = carregar_historico(usuario_id)
    if not any(h['devolvido'] for h in historico):
        return []
    return montar_avaliacoes(historico, carregar_catalogo())
