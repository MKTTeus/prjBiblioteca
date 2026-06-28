from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException

from database import supabase
from core import get_admin, verify_password
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
    return datetime.utcnow().year


def set_ano_letivo_atual(ano: int) -> None:
    payload = {"valor": str(ano), "atualizado_em": datetime.utcnow().isoformat()}
    upd = supabase.table("Configuracoes").update(payload).eq("chave", "ano_letivo_atual").execute()
    if not upd.data:
        insert_payload = payload.copy()
        insert_payload.update({
            "chave": "ano_letivo_atual",
            "descricao": "Ano letivo corrente do sistema",
            "categoria": "academico",
            "ativo": True,
            "criado_em": datetime.utcnow().isoformat(),
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
    ano_atual = get_ano_letivo_atual()

    ativos_resp = _filtros_alunos_ativos(
        supabase.table("Usuario").select("idUsuario")
    ).execute()
    ativos = len(ativos_resp.data or [])

    concluintes_resp = _filtros_alunos_ativos(
        supabase.table("Usuario").select("idUsuario")
    ).eq("usuSerie", SERIE_CONCLUINTE).execute()
    concluintes = len(concluintes_resp.data or [])

    return {
        "anoLetivoAtual": ano_atual,
        "alunosAtivos": ativos,
        "concluintes": concluintes,
        "fraseConfirmacao": f"ENCERRAR ANO LETIVO {ano_atual}",
    }


@router.post("/ano-letivo/encerrar")
def encerrar_ano_letivo(body: EncerrarAnoLetivo, admin=Depends(get_admin)):
    ano_atual = get_ano_letivo_atual()
    novo_ano = ano_atual + 1

    # 1. Verificar senha do administrador autenticado
    email = admin.get("sub")
    adm_db = (
        supabase.table("Administrador")
        .select("admSenha")
        .eq("admEmail", email)
        .limit(1)
        .execute()
    )
    if not adm_db.data:
        raise HTTPException(status_code=403, detail="Administrador não encontrado")
    if not verify_password(body.senha, adm_db.data[0]["admSenha"]):
        # 403 (e não 401) para não disparar o logout automático do cliente
        raise HTTPException(status_code=403, detail="Senha incorreta")

    # 2. Validar frase de confirmação (carrega o ano → garante idempotência)
    frase_esperada = f"ENCERRAR ANO LETIVO {ano_atual}"
    if (body.confirmacao or "").strip().upper() != frase_esperada.upper():
        raise HTTPException(
            status_code=400,
            detail=f'Frase de confirmação incorreta. Digite exatamente: "{frase_esperada}"',
        )

    # 3. Formar concluintes (3º Ano EM) antes de promover os demais
    formados_resp = _filtros_alunos_ativos(
        supabase.table("Usuario").update({"usuFormado": True})
    ).eq("usuSerie", SERIE_CONCLUINTE).execute()
    formados = len(formados_resp.data or [])

    # 4. Promover em ordem decrescente para não promover o mesmo aluno duas vezes
    promovidos = 0
    for atual, proxima in reversed(list(PROXIMA_SERIE.items())):
        resp = _filtros_alunos_ativos(
            supabase.table("Usuario").update({"usuSerie": proxima, "usuAnoLetivo": novo_ano})
        ).eq("usuSerie", atual).execute()
        promovidos += len(resp.data or [])

    # 5. Avançar o ano letivo do sistema
    set_ano_letivo_atual(novo_ano)

    return {
        "promovidos": promovidos,
        "formados": formados,
        "novoAnoLetivo": novo_ano,
    }
