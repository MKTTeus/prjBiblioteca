from fastapi import APIRouter, Depends, HTTPException

from database import supabase
from core import get_admin, utc_now, verify_password, buscar_todos
from rpc import executar_rpc
from schemas import EncerrarAnoLetivo

router = APIRouter()


# ── Progressão de séries ──────────────────────────────────────────────────────
# A ordem importa: cada série é promovida para a seguinte. O 3º Ano EM não tem
# próxima série — seus alunos são marcados como formados.
SERIES = ["6º Ano", "7º Ano", "8º Ano", "9º Ano", "1º Ano EM", "2º Ano EM", "3º Ano EM"]
PROXIMA_SERIE = dict(zip(SERIES, SERIES[1:]))   # 6º→7º ... 2ºEM→3ºEM
SERIE_CONCLUINTE = SERIES[-1]                    # "3º Ano EM"


# ── Ano letivo corrente (armazenado em Configuracoes) ─────────────────────────

def get_ano_letivo_atual() -> int:
    try:
        resp = (
            supabase.table("Configuracoes")
            .select("valor")
            .eq("chave", "ano_letivo_atual")
            .limit(1)
            .execute()
        )
        if resp.data:
            return int(resp.data[0]["valor"])
    except Exception:
        pass
    return utc_now().year


def set_ano_letivo_atual(ano: int) -> None:
    payload = {"valor": str(ano), "atualizado_em": utc_now().isoformat()}
    upd = supabase.table("Configuracoes").update(payload).eq("chave", "ano_letivo_atual").execute()
    if not upd.data:
        insert_payload = payload.copy()
        insert_payload.update({
            "chave": "ano_letivo_atual",
            "descricao": "Ano letivo corrente do sistema",
            "categoria": "academico",
            "ativo": True,
            "criado_em": utc_now().isoformat(),
        })
        supabase.table("Configuracoes").insert(insert_payload).execute()


def _filtros_alunos_ativos(qb):
    """Aplica os filtros de alunos que participam do fluxo escolar
    (não excluídos, ativos, não formados) a um builder select/update."""
    return (
        qb.eq("usuTipo", "Aluno")
        .eq("usuExcluido", False)
        .eq("usuStatus", True)
        .eq("usuFormado", False)
    )


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/ano-letivo")
def info_ano_letivo(admin=Depends(get_admin)):
    ano=get_ano_letivo_atual()
    alunos=buscar_todos(lambda:_filtros_alunos_ativos(supabase.table('Usuario').select('idUsuario,usuNome,usuSerie,usuTurma')).order('idUsuario'))
    return {'anoLetivoAtual':ano,'alunosAtivos':len(alunos),'concluintes':sum(a['usuSerie']==SERIE_CONCLUINTE for a in alunos),
        'fraseConfirmacao':f'ENCERRAR ANO LETIVO {ano}','alunos':alunos}


@router.post("/ano-letivo/encerrar")
def encerrar_ano_letivo(body: EncerrarAnoLetivo, admin=Depends(get_admin)):
    ano=get_ano_letivo_atual()
    rows=supabase.table('Administrador').select('admSenha').eq('idAdmin',admin['id']).limit(1).execute().data
    if not rows or not verify_password(body.senha,rows[0]['admSenha']): raise HTTPException(403,'Senha incorreta')
    if body.confirmacao.strip().upper()!=f'ENCERRAR ANO LETIVO {ano}': raise HTTPException(400,'Frase de confirmação incorreta')
    return executar_rpc('encerrar_ano_letivo',{'p_ano':ano,'p_retidos':body.retidos})
