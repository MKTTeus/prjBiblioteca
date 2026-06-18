import os
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Header, HTTPException
import httpx

from database import supabase
from routers.emprestimos import get_config_bool

router = APIRouter()

CRON_SECRET = os.getenv("CRON_SECRET")
RESEND_API_KEY = os.getenv("RESEND_API_KEY")
RESEND_FROM_EMAIL = os.getenv("RESEND_FROM_EMAIL", "Biblioteca <onboarding@resend.dev>")


def verificar_cron(authorization: str = Header(None)):
    if not CRON_SECRET or authorization != f"Bearer {CRON_SECRET}":
        raise HTTPException(status_code=401, detail="Acesso não autorizado")


def enviar_email(destinatario: str, assunto: str, html: str) -> bool:
    if not RESEND_API_KEY:
        print("RESEND_API_KEY não configurada")
        return False
    try:
        resp = httpx.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {RESEND_API_KEY}"},
            json={"from": RESEND_FROM_EMAIL, "to": [destinatario], "subject": assunto, "html": html},
            timeout=10,
        )
        return resp.status_code in (200, 201)
    except Exception as e:
        print("Erro ao enviar email via Resend:", e)
        return False


@router.get("/cron/lembretes-atraso")
def lembretes_atraso_email(_=Depends(verificar_cron)):
    if not get_config_bool("notificacao_email", True) or not get_config_bool("lembrete_atraso", True):
        return {"enviados": 0, "motivo": "notificações desativadas nas configurações"}

    try:
        hoje = datetime.utcnow().date()
        limite_renotificacao = datetime.utcnow() - timedelta(hours=24)

        movimentacoes = supabase.table("Movimentacao").select("idMovimentacao, idUsuario").eq("movStatus", "Ativo").execute().data or []
        movimentacao_map = {m["idMovimentacao"]: m for m in movimentacoes}
        mov_ids = list(movimentacao_map.keys())
        if not mov_ids:
            return {"enviados": 0}

        itens_mov = supabase.table("MovimentacaoExemplar").select("*").in_("idMovimentacao", mov_ids).eq("itemStatus", "Ativo").execute().data or []

        usuario_ids, exemplar_ids, pendentes = set(), set(), []

        for me in itens_mov:
            if not me.get("dataPrevistaDevolucao"):
                continue
            try:
                data_prevista = datetime.fromisoformat(me["dataPrevistaDevolucao"]).date()
            except Exception:
                continue
            if data_prevista >= hoje:
                continue

            notificado_em = me.get("emailAtrasoNotificadoEm")
            if notificado_em:
                try:
                    if datetime.fromisoformat(notificado_em.replace("Z", "+00:00")).replace(tzinfo=None) >= limite_renotificacao:
                        continue
                except Exception:
                    pass

            mov = movimentacao_map.get(me["idMovimentacao"], {})
            usuario_ids.add(mov.get("idUsuario"))
            exemplar_ids.add(me.get("idExemplar"))
            pendentes.append({**me, "idUsuario": mov.get("idUsuario"), "diasAtraso": (hoje - data_prevista).days})

        if not pendentes:
            return {"enviados": 0}

        usuarios = supabase.table("Usuario").select("idUsuario, usuNome, usuEmail").in_("idUsuario", list(usuario_ids)).execute().data or []
        exemplares = supabase.table("Exemplar").select("idExemplar, idLivro").in_("idExemplar", list(exemplar_ids)).execute().data or []
        livro_ids = list({e["idLivro"] for e in exemplares if e.get("idLivro")})
        livros = supabase.table("Livro").select("idLivro, livTitulo").in_("idLivro", livro_ids).execute().data or [] if livro_ids else []

        usuario_map = {u["idUsuario"]: u for u in usuarios}
        exemplar_map = {e["idExemplar"]: e for e in exemplares}
        livro_map = {l["idLivro"]: l["livTitulo"] for l in livros}

        enviados = 0
        agora = datetime.utcnow().isoformat()

        for p in pendentes:
            usuario = usuario_map.get(p["idUsuario"], {})
            exemplar = exemplar_map.get(p["idExemplar"], {})
            email = usuario.get("usuEmail")
            if not email:
                continue

            titulo = livro_map.get(exemplar.get("idLivro"), "Livro")
            html = (
                f"<p>Olá, {usuario.get('usuNome', 'aluno(a)')}.</p>"
                f"<p>O livro <strong>{titulo}</strong> está atrasado há {p['diasAtraso']} dia(s). "
                f"Por favor, devolva o quanto antes na biblioteca.</p>"
            )

            if enviar_email(email, "Lembrete de devolução - Biblioteca", html):
                enviados += 1
                supabase.table("MovimentacaoExemplar").update({
                    "emailAtrasoNotificadoEm": agora
                }).eq("idMovimentacao", p["idMovimentacao"]).eq("idExemplar", p["idExemplar"]).execute()

        return {"enviados": enviados, "total_pendentes": len(pendentes)}
    except Exception as e:
        print("Erro lembretes atraso email:", e)
        raise HTTPException(status_code=500, detail="Erro ao enviar lembretes")