import os
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Header, HTTPException
import httpx

from database import supabase
from routers.emprestimos import get_config_bool, get_config_int

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


def _base_template(conteudo: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Biblioteca</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:#111827;border-radius:12px 12px 0 0;padding:32px 40px;text-align:center;">
              <span style="font-size:28px;">📚</span>
              <h1 style="margin:8px 0 0;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:0.5px;">
                Sistema de Biblioteca
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#ffffff;padding:40px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
              {conteudo}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:24px 40px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                Esta é uma mensagem automática. Por favor, não responda este e-mail.
              </p>
              <p style="margin:8px 0 0;font-size:12px;color:#9ca3af;">
                © {datetime.utcnow().year} Sistema de Biblioteca
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def _email_atraso(nome: str, titulo: str, dias_atraso: int) -> str:
    label_dias = "1 dia" if dias_atraso == 1 else f"{dias_atraso} dias"
    conteudo = f"""
      <p style="margin:0 0 8px;font-size:15px;color:#374151;">Olá, <strong>{nome}</strong>!</p>

      <!-- Alert box -->
      <div style="background:#fef2f2;border:1px solid #fecaca;border-left:4px solid #ef4444;
                  border-radius:8px;padding:20px 24px;margin:24px 0;">
        <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#dc2626;text-transform:uppercase;
                  letter-spacing:0.5px;">⚠️ Devolução em Atraso</p>
        <p style="margin:0;font-size:22px;font-weight:700;color:#111827;">{titulo}</p>
        <p style="margin:8px 0 0;font-size:14px;color:#6b7280;">
          Atrasado há <strong style="color:#dc2626;">{label_dias}</strong>
        </p>
      </div>

      <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
        O livro acima está com a devolução em atraso. Pedimos que você o devolva
        o quanto antes na biblioteca para evitar pendências no seu cadastro.
      </p>

      <table cellpadding="0" cellspacing="0" style="margin:24px 0;">
        <tr>
          <td style="background:#111827;border-radius:8px;padding:14px 28px;">
            <span style="color:#ffffff;font-size:14px;font-weight:600;">
              📍 Dirija-se à biblioteca para devolver o livro
            </span>
          </td>
        </tr>
      </table>

      <p style="margin:16px 0 0;font-size:13px;color:#9ca3af;line-height:1.6;">
        Em caso de dúvidas, entre em contato com a biblioteca diretamente.
      </p>
    """
    return _base_template(conteudo)


def _email_devolucao(nome: str, titulo: str, dias_restantes: int, prazo_fmt: str) -> str:
    urgencia = "amanhã" if dias_restantes == 1 else f"em {dias_restantes} dias"
    badge_cor = "#f59e0b" if dias_restantes == 1 else "#3b82f6"
    badge_bg = "#fffbeb" if dias_restantes == 1 else "#eff6ff"
    badge_border = "#fde68a" if dias_restantes == 1 else "#bfdbfe"
    icone = "⚡" if dias_restantes == 1 else "🔔"
    label_urgencia = "URGENTE — Vence Amanhã" if dias_restantes == 1 else f"Vence em {dias_restantes} dias"

    conteudo = f"""
      <p style="margin:0 0 8px;font-size:15px;color:#374151;">Olá, <strong>{nome}</strong>!</p>

      <!-- Alert box -->
      <div style="background:{badge_bg};border:1px solid {badge_border};border-left:4px solid {badge_cor};
                  border-radius:8px;padding:20px 24px;margin:24px 0;">
        <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:{badge_cor};text-transform:uppercase;
                  letter-spacing:0.5px;">{icone} {label_urgencia}</p>
        <p style="margin:0;font-size:22px;font-weight:700;color:#111827;">{titulo}</p>
        <p style="margin:8px 0 0;font-size:14px;color:#6b7280;">
          Prazo de devolução: <strong style="color:#111827;">{prazo_fmt}</strong>
        </p>
      </div>

      <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
        Este é um lembrete amigável de que o prazo de devolução do livro acima se encerra
        <strong>{urgencia}</strong>. Lembre-se de devolvê-lo na biblioteca a tempo.
      </p>

      <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
        Se precisar de mais tempo, entre em contato com a biblioteca para verificar
        a possibilidade de renovação do empréstimo.
      </p>

      <!-- Info row -->
      <table cellpadding="0" cellspacing="0" width="100%"
             style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px 20px;margin-bottom:8px;">
        <tr>
          <td style="font-size:13px;color:#6b7280;">📅 Data limite de devolução</td>
          <td align="right" style="font-size:14px;font-weight:700;color:#111827;">{prazo_fmt}</td>
        </tr>
      </table>

      <p style="margin:16px 0 0;font-size:13px;color:#9ca3af;line-height:1.6;">
        Em caso de dúvidas, procure a equipe da biblioteca.
      </p>
    """
    return _base_template(conteudo)


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
            html = _email_atraso(usuario.get("usuNome", "aluno(a)"), titulo, p["diasAtraso"])

            if enviar_email(email, f"⚠️ Livro em atraso: {titulo} — Biblioteca", html):
                enviados += 1
                supabase.table("MovimentacaoExemplar").update({
                    "emailAtrasoNotificadoEm": agora
                }).eq("idMovimentacao", p["idMovimentacao"]).eq("idExemplar", p["idExemplar"]).execute()

        return {"enviados": enviados, "total_pendentes": len(pendentes)}
    except Exception as e:
        print("Erro lembretes atraso email:", e)
        raise HTTPException(status_code=500, detail="Erro ao enviar lembretes")


@router.get("/cron/lembretes-devolucao")
def lembretes_devolucao_email(_=Depends(verificar_cron)):
    if not get_config_bool("notificacao_email", True) or not get_config_bool("lembrete_devolucao", True):
        return {"enviados": 0, "motivo": "notificações desativadas nas configurações"}

    try:
        dias_antecedencia = get_config_int("dias_antecedencia_lembrete", 2)
        hoje = datetime.utcnow().date()
        data_alvo = hoje + timedelta(days=dias_antecedencia)

        movimentacoes = (
            supabase.table("Movimentacao")
            .select("idMovimentacao, idUsuario")
            .eq("movStatus", "Ativo")
            .execute()
            .data or []
        )
        movimentacao_map = {m["idMovimentacao"]: m for m in movimentacoes}
        mov_ids = list(movimentacao_map.keys())
        if not mov_ids:
            return {"enviados": 0}

        itens_mov = (
            supabase.table("MovimentacaoExemplar")
            .select("*")
            .in_("idMovimentacao", mov_ids)
            .eq("itemStatus", "Ativo")
            .execute()
            .data or []
        )

        usuario_ids, exemplar_ids, pendentes = set(), set(), []

        for me in itens_mov:
            if not me.get("dataPrevistaDevolucao"):
                continue
            try:
                data_prevista = datetime.fromisoformat(me["dataPrevistaDevolucao"]).date()
            except Exception:
                continue

            if data_prevista != data_alvo:
                continue

            notificado_em = me.get("emailDevolucaoNotificadoEm")
            if notificado_em:
                try:
                    limite = datetime.utcnow() - timedelta(hours=24)
                    if datetime.fromisoformat(notificado_em.replace("Z", "+00:00")).replace(tzinfo=None) >= limite:
                        continue
                except Exception:
                    pass

            mov = movimentacao_map.get(me["idMovimentacao"], {})
            usuario_ids.add(mov.get("idUsuario"))
            exemplar_ids.add(me.get("idExemplar"))
            pendentes.append({**me, "idUsuario": mov.get("idUsuario"), "diasRestantes": dias_antecedencia})

        if not pendentes:
            return {"enviados": 0}

        usuarios = (
            supabase.table("Usuario")
            .select("idUsuario, usuNome, usuEmail")
            .in_("idUsuario", list(usuario_ids))
            .execute()
            .data or []
        )
        exemplares = (
            supabase.table("Exemplar")
            .select("idExemplar, idLivro")
            .in_("idExemplar", list(exemplar_ids))
            .execute()
            .data or []
        )
        livro_ids = list({e["idLivro"] for e in exemplares if e.get("idLivro")})
        livros = (
            supabase.table("Livro").select("idLivro, livTitulo").in_("idLivro", livro_ids).execute().data or []
        ) if livro_ids else []

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
            dias = p["diasRestantes"]
            prazo_fmt = data_alvo.strftime("%d/%m/%Y")
            urgencia = "amanhã" if dias == 1 else f"em {dias} dia(s)"

            html = _email_devolucao(usuario.get("usuNome", "aluno(a)"), titulo, dias, prazo_fmt)

            if enviar_email(email, f"🔔 Lembrete: devolução de '{titulo}' {urgencia} — Biblioteca", html):
                enviados += 1
                supabase.table("MovimentacaoExemplar").update({
                    "emailDevolucaoNotificadoEm": agora
                }).eq("idMovimentacao", p["idMovimentacao"]).eq("idExemplar", p["idExemplar"]).execute()

        return {"enviados": enviados, "total_pendentes": len(pendentes)}
    except Exception as e:
        print("Erro lembretes devolucao email:", e)
        raise HTTPException(status_code=500, detail="Erro ao enviar lembretes de devolução")