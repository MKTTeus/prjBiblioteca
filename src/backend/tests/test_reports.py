"""Regressões de população, circulação, filtros, paginação e autorização."""
from datetime import date
from pathlib import Path
from types import SimpleNamespace
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
import core
import loan_data
import report_data
from routers import relatorios


class Query:
    def __init__(self, rows):
        self.rows = list(rows); self.start = 0; self.end = 999999; self.fields = '*'
    def select(self, fields, **kwargs): self.fields = fields; return self
    def order(self, field):
        self.rows.sort(key=lambda r: (r.get(field) is None, r.get(field))); return self
    def eq(self, field, value): self.rows = [r for r in self.rows if r.get(field)==value]; return self
    def in_(self, field, values): self.rows = [r for r in self.rows if r.get(field) in values]; return self
    def gte(self, field, value): self.rows = [r for r in self.rows if r.get(field) and r[field]>=str(value)]; return self
    def lte(self, field, value): self.rows = [r for r in self.rows if r.get(field) and r[field]<=str(value)]; return self
    def ilike(self, field, value): self.rows = [r for r in self.rows if value.strip('%').casefold() in str(r.get(field,'')).casefold()]; return self
    def limit(self, size): self.end = size-1; return self
    def range(self, start, end): self.start, self.end = start, end; return self
    def execute(self):
        rows = self.rows[self.start:self.end+1]
        if self.fields != '*': rows = [{k.strip():r.get(k.strip()) for k in self.fields.split(',')} for r in rows]
        return SimpleNamespace(data=rows)


@pytest.fixture
def dados(monkeypatch):
    tables = {t:[] for t in [*report_data.CATALOGO, *report_data.LEITORES, 'Movimentacao', 'MovimentacaoExemplar']}
    tables.update({
        'Livro':[{'idLivro':1,'livTitulo':'Árvore','livAtivo':True}, {'idLivro':2,'livTitulo':'Sem circulação','livAtivo':True}, {'idLivro':3,'livTitulo':'Baixado','livAtivo':False}],
        'Autor':[{'idAutor':1,'autNome':'José'}, {'idAutor':2,'autNome':'Maria'}, {'idAutor':3,'autNome':'Sem obra'}],
        'LivroAutor':[{'idLivro':1,'idAutor':1}, {'idLivro':1,'idAutor':2}],
        'Usuario':[{'idUsuario':1,'usuNome':'Aluno','usuTipo':'Aluno','usuSerie':'6º Ano','usuTurma':'A','usuStatus':True},
            {'idUsuario':2,'usuNome':'Sem leitura','usuTipo':'Aluno','usuStatus':True,'usuSerie':'6º Ano','usuTurma':'A'},
            {'idUsuario':3,'usuNome':'Formado','usuTipo':'Aluno','usuFormado':True,'usuStatus':False},
            {'idUsuario':4,'usuNome':'Excluído','usuTipo':'Aluno','usuExcluido':True}],
        'Administrador':[{'idAdmin':1,'admNome':'Professor','admProfessor':True,'admStatus':True,'admSenha':'SEGREDO'}],
        'Exemplar':[{'idExemplar':1,'idLivro':1,'exeLivTombo':'T1','exeLivStatus':'Disponível'},
            {'idExemplar':2,'idLivro':1,'exeLivTombo':'T2','exeLivStatus':'Emprestado'},
            {'idExemplar':3,'idLivro':2,'exeLivTombo':'T3','exeLivStatus':'desativado'}],
        'Movimentacao':[{'idMovimentacao':1,'idUsuario':1,'movTipo':'EMPRESTIMO','movStatus':'Ativo','movDataEmprestimo':'2026-09-01','movDataSolicitacao':'2026-09-01','movSerie':'5º Ano','movTurma':'B'},
            {'idMovimentacao':2,'idUsuario':None,'idAdminProfessor':1,'movTipo':'EMPRESTIMO','movStatus':'Ativo','movDataEmprestimo':'2026-10-01','movFinalidade':'TURMA','movSerie':'6º Ano','movTurma':'A'},
            {'idMovimentacao':3,'idUsuario':2,'movTipo':'SOLICITACAO','movStatus':'Pendente','movDataEmprestimo':None,'movDataSolicitacao':'2026-10-02'}],
        'MovimentacaoExemplar':[{'idMovimentacao':1,'idExemplar':1,'itemStatus':'Devolvido','dataPrevistaDevolucao':'2026-09-15','dataDevolucao':'2026-10-03','renovacoes':2},
            {'idMovimentacao':1,'idExemplar':2,'itemStatus':'Ativo','dataPrevistaDevolucao':'2026-09-15','renovacoes':0},
            {'idMovimentacao':2,'idExemplar':1,'itemStatus':'Ativo','dataPrevistaDevolucao':'2026-10-30','renovacoes':1},
            {'idMovimentacao':3,'idExemplar':3,'itemStatus':'Pendente'}],
    })
    db = SimpleNamespace(table=lambda table:Query(tables[table]))
    for module in (core,loan_data,report_data,relatorios): monkeypatch.setattr(module,'supabase',db)
    monkeypatch.setattr(loan_data,'business_today',lambda:date(2026,10,12))
    return tables


@pytest.fixture
def client(dados):
    app = FastAPI(); app.include_router(relatorios.router)
    app.dependency_overrides[core.get_admin] = lambda:{'tipo':'admin'}
    return TestClient(app)


def test_zero_circulation_sort_and_exemplar_counts(client):
    result = client.get('/relatorios/gestao/livros?atividade=ativos&ordenarPor=emprestimos&ordem=asc').json()
    assert [i['idLivro'] for i in result['itens']] == [2,1]
    assert result['itens'][1]['emprestimos']==3
    assert client.get('/relatorios/gestao/livros?atividade=ativos&participacao=sem').json()['itens'][0]['idLivro']==2


def test_readers_include_zero_and_professor_ids_do_not_collide(client):
    rows = client.get('/relatorios/gestao/leitores?atividade=ativos').json()['itens']
    assert {r['chave']:r['emprestimos'] for r in rows}=={'usuario:1':2,'professor:1':1,'usuario:2':0}
    assert client.get('/relatorios/gestao/leitores?atividade=formados').json()['itens'][0]['usuario']=='Formado'
    assert 'SEGREDO' not in str(rows)


def test_partial_returns_use_return_date_not_loan_date(client):
    response = client.get('/relatorios/gestao/devolucoes?dataInicio=2026-10-01&dataFim=2026-10-12')
    assert response.status_code==200
    rows=response.json()['itens']
    assert len(rows)==1 and rows[0]['dataEmprestimo']=='2026-09-01' and rows[0]['tombo']=='T1'


def test_renewals_describe_cumulative_counts(client):
    result = client.get('/relatorios/gestao/renovacoes?dataInicio=2026-10-01').json()
    assert result['resumo']['renovacoes']==1
    assert 'acumuladas' in result['notas'][0]


def test_history_filters_professor_classroom_and_tombo(client):
    result = client.get('/relatorios/gestao/historico?idAdminProfessor=1&finalidade=TURMA&q=T1').json()
    assert len(result['itens'])==1 and result['itens'][0]['tipo']=='Professor'
    old = client.get('/relatorios/emprestimos?idAdminProfessor=1&q=T1').json()
    assert len(old['itens'])==1 and old['itens'][0]['usuario']=='Professor'


def test_authors_include_no_books_and_coauthorship(client):
    result = client.get('/relatorios/gestao/autores').json()
    assert {i['autor']:i['emprestimos'] for i in result['itens']}=={'José':3,'Maria':3,'Sem obra':0}
    assert 'coautoria' in result['notas'][0]
    assert result['resumo']=={'registros':3}


def test_inventory_includes_deactivated_and_accent_insensitive_search(client):
    assert client.get('/relatorios/gestao/inventario?status=Desativado').json()['itens'][0]['tombo']=='T3'
    assert len(client.get('/relatorios/gestao/inventario?q=arvore%20jose').json()['itens'])==2


def test_historical_class_is_preserved(client):
    rows = client.get('/relatorios/gestao/turmas').json()['itens']
    assert {(r['serie'],r['turma']):r['emprestimos'] for r in rows}=={('6º Ano','A'):1,('5º Ano','B'):2,('Sem série','Sem turma'):0}
    atual = next(r for r in rows if r['turma']=='A')
    assert atual['professores']==1 and atual['emprestimosTurma']==1 and atual['leitores']==0


def test_requests_are_separate_from_actual_loans(client):
    result = client.get('/relatorios/gestao/solicitacoes?status=Pendente').json()
    assert result['total']==1 and result['itens'][0]['usuario']=='Sem leitura'
    assert client.get('/relatorios/emprestimos').json()['resumo']['total']==3


def test_catalog_review_reports_missing_information(client):
    rows = client.get('/relatorios/gestao/cadastro').json()['itens']
    assert all('ISBN' in i['pendencias'] for i in rows)
    assert 'Sem exemplares' in next(i for i in rows if i['idLivro']==3)['pendencias']


def test_pagination_and_export_do_not_truncate_populations(client,dados):
    dados['Livro'] = [{'idLivro':i,'livTitulo':f'Livro {i:03}','livAtivo':True} for i in range(240)]
    first = client.get('/relatorios/gestao/livros?tamanhoPagina=50').json()
    second = client.get('/relatorios/gestao/livros?tamanhoPagina=50&pagina=2').json()
    complete = client.get('/relatorios/gestao/livros?exportar=true').json()
    assert first['total']==240 and len(first['itens'])==50
    assert len(second['itens'])==50 and len(complete['itens'])==240
    assert not {r['idLivro'] for r in first['itens']} & {r['idLivro'] for r in second['itens']}
    assert first['resumo']==complete['resumo']


@pytest.mark.parametrize('query',['dataInicio=2026-10-12&dataFim=2026-10-01','dataInicio=invalid','ordenarPor=senha','pagina=0','tamanhoPagina=1000'])
def test_invalid_filters_are_rejected(client,query):
    assert client.get('/relatorios/gestao/livros?'+query).status_code==422


def test_administrative_data_require_authentication(dados):
    app = FastAPI(); app.include_router(relatorios.router)
    assert TestClient(app).get('/relatorios/gestao/leitores').status_code==401


def test_individual_search_finds_professors_and_keeps_account_type(client):
    rows = client.get('/relatorios/usuarios/busca?q=Professor').json()['itens']
    assert rows==[{'idAdminProfessor':1,'usuNome':'Professor','usuTipo':'Professor'}]


def test_grouped_collection_accounts_for_deactivated_copies(client):
    result = client.get('/relatorios/acervo?agrupador=ano_publicacao').json()
    assert result['resumo']['totalExemplares']==3
    assert result['itens'][0]['quantidadeDesativados']==1


@pytest.mark.parametrize('perfil',[{'tipo':'Aluno','admProfessor':False},{'tipo':'admin','admProfessor':True}])
def test_students_and_professors_cannot_access_management_reports(dados,monkeypatch,perfil):
    monkeypatch.setattr(core,'_authenticate',lambda token:perfil)
    app = FastAPI(); app.include_router(relatorios.router)
    assert TestClient(app).get('/relatorios/gestao/leitores',headers={'Authorization':'Bearer teste'}).status_code==403


def test_uncollected_or_cancelled_items_never_inflate_rankings(client,dados):
    dados['MovimentacaoExemplar'].append({'idMovimentacao':2,'idExemplar':3,'itemStatus':'Negado'})
    result = client.get('/relatorios/gestao/livros').json()
    assert result['resumo']['emprestimos']==3
