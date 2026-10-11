"""Endpoints exclusivos do aluno, usando a sessão e revogação existentes."""
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import BaseModel, ConfigDict, Field
from core import executar_em_paralelo, get_user
from recommendations.engine import recomendar
from recommendations.repository import carregar_catalogo, carregar_historico, livros_avaliaveis
from rpc import executar_rpc

router = APIRouter()


def get_aluno(user=Depends(get_user)):
    if user['tipo'] != 'Aluno':
        raise HTTPException(403, 'Recurso disponível apenas para alunos')
    return user


class Avaliacao(BaseModel):
    model_config = ConfigDict(extra='forbid')
    nota: Annotated[int, Field(strict=True, ge=1, le=5)]


@router.get('/aluno/recomendacoes')
def listar_recomendacoes(response: Response, limite: int = Query(6, ge=1, le=12), aluno=Depends(get_aluno)):
    response.headers['Cache-Control'] = 'private, no-store'
    livros, historico = executar_em_paralelo(carregar_catalogo, carregar_historico)
    return {'itens': recomendar(livros, historico, aluno['id'], limite)}


@router.get('/aluno/avaliacoes')
def listar_avaliacoes(response: Response, aluno=Depends(get_aluno)):
    response.headers['Cache-Control'] = 'private, no-store'
    return livros_avaliaveis(aluno['id'])


@router.put('/aluno/avaliacoes/{idLivro}')
def avaliar_livro(idLivro: int, data: Avaliacao, response: Response, aluno=Depends(get_aluno)):
    response.headers['Cache-Control'] = 'private, no-store'
    return executar_rpc('avaliar_livro', {'p_usuario': aluno['id'], 'p_livro': idLivro, 'p_nota': data.nota})
