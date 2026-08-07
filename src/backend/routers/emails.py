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
        raise HTTPException(status_code=500, detail="Erro ao enviar lembretes de devolução")

# ── Email templates for confirmation workflow ─────────────────────────

def _email_confirmacao(nome: str, titulo: str, prazo_fmt: str, prazo_horas: int) -> str:
    conteudo = f"""
      <p style="margin:0 0 8px;font-size:15px;color:#374151;">Olá, <strong>{nome}</strong>!</p>

      <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-left:4px solid #10b981;
                  border-radius:8px;padding:20px 24px;margin:24px 0;">
        <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#059669;text-transform:uppercase;
                  letter-spacing:0.5px;">✅ Retirada Confirmada</p>
        <p style="margin:0;font-size:22px;font-weight:700;color:#111827;">{titulo}</p>
        <p style="margin:8px 0 0;font-size:14px;color:#6b7280;">
          Prazo para retirada: <strong style="color:#111827;">{prazo_fmt}</strong>
          ({prazo_horas}h após confirmação)
        </p>
      </div>

      <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
        A retirada do livro acima foi confirmada pelo administrador. Você tem
        <strong>{prazo_horas} horas</strong> para retirar o livro na biblioteca.
      </p>

      <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
        Caso não retire dentro do prazo, a reserva será cancelada automaticamente
        e será necessário solicitar novamente.
      </p>

      <table cellpadding="0" cellspacing="0" width="100%"
             style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px 20px;margin-bottom:8px;">
        <tr>
          <td style="font-size:13px;color:#6b7280;">📅 Prazo máximo</td>
          <td align="right" style="font-size:14px;font-weight:700;color:#111827;">{prazo_fmt}</td>
        </tr>
      </table>

      <p style="margin:16px 0 0;font-size:13px;color:#9ca3af;line-height:1.6;">
        Em caso de dúvidas, procure a equipe da biblioteca.
      </p>
    """
    return _base_template(conteudo)


def _email_lembrete_confirmacao(nome: str, titulo: str, horas_passadas: int, prazo_fmt: str) -> str:
    conteudo = f"""
      <p style="margin:0 0 8px;font-size:15px;color:#374151;">Olá, <strong>{nome}</strong>!</p>

      <div style="background:#fffbeb;border:1px solid #fde68a;border-left:4px solid #f59e0b;
                  border-radius:8px;padding:20px 24px;margin:24px 0;">
        <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#d97706;text-transform:uppercase;
                  letter-spacing:0.5px;">🔔 Lembrete de Retirada</p>
        <p style="margin:0;font-size:22px;font-weight:700;color:#111827;">{titulo}</p>
        <p style="margin:8px 0 0;font-size:14px;color:#6b7280;">
          {horas_passadas}h desde a confirmação — prazo limite: <strong style="color:#111827;">{prazo_fmt}</strong>
        </p>
      </div>

      <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
        Lembrete: a retirada do livro acima foi confirmada há <strong>{horas_passadas} horas</strong>.
        Caso não retire até <strong>{prazo_fmt}</strong>, a reserva será cancelada automaticamente.
      </p>

      <p style="margin:16px 0 0;font-size:13px;color:#9ca3af;line-height:1.6;">
        Em caso de dúvidas, procure a equipe da biblioteca.
      </p>
    """
    return _base_template(conteudo)


def _email_aviso_expiracao(nome: str, titulo: str, horas_restantes: int, prazo_fmt: str) -> str:
    conteudo = f"""
      <p style="margin:0 0 8px;font-size:15px;color:#374151;">Olá, <strong>{nome}</strong>!</p>

      <div style="background:#fef2f2;border:1px solid #fecaca;border-left:4px solid #ef4444;
                  border-radius:8px;padding:20px 24px;margin:24px 0;">
        <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#dc2626;text-transform:uppercase;
                  letter-spacing:0.5px;">⚠️ Prazo de Retirada Expirando!</p>
        <p style="margin:0;font-size:22px;font-weight:700;color:#111827;">{titulo}</p>
        <p style="margin:8px 0 0;font-size:14px;color:#6b7280;">
          Restam apenas <strong style="color:#dc2626;">{horas_restantes}h</strong> — prazo limite: <strong>{prazo_fmt}</strong>
        </p>
      </div>

      <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
        <strong>Atenção!</strong> Faltam apenas <strong>{horas_restantes} horas</strong> para o prazo
        de retirada expirar. Dirija-se à biblioteca o mais rápido possível para retirar o livro.
      </p>

      <table cellpadding="0" cellspacing="0" style="margin:24px 0;">
        <tr>
          <td style="background:#dc2626;border-radius:8px;padding:14px 28px;">
            <span style="color:#ffffff;font-size:14px;font-weight:600;">
              📍 Dirija-se à biblioteca agora
            </span>
          </td>
        </tr>
      </table>

      <p style="margin:16px 0 0;font-size:13px;color:#9ca3af;line-height:1.6;">
        Se a retirada não for realizada a tempo, a reserva será cancelada automaticamente.
      </p>
    """
    return _base_template(conteudo)


def _email_expirado(nome: str, titulo: str) -> str:
    conteudo = f"""
      <p style="margin:0 0 8px;font-size:15px;color:#374151;">Olá, <strong>{nome}</strong>!</p>

      <div style="background:#fef2f2;border:1px solid #fecaca;border-left:4px solid #ef4444;
                  border-radius:8px;padding:20px 24px;margin:24px 0;">
        <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#dc2626;text-transform:uppercase;
                  letter-spacing:0.5px;">❌ Reserva Expirada</p>
        <p style="margin:0;font-size:22px;font-weight:700;color:#111827;">{titulo}</p>
      </div>

      <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
        O prazo para retirada do livro acima expirou e a reserva foi cancelada automaticamente.
        Caso ainda deseje o livro, será necessário solicitar um novo empréstimo.
      </p>

      <p style="margin:16px 0 0;font-size:13px;color:#9ca3af;line-height:1.6;">
        Em caso de dúvidas, procure a equipe da biblioteca.
      </p>
    """
    return _base_template(conteudo)


# ── Helper to fetch user/book info for a movimentacao ────────────────

def _get_mov_user_book(mov):
    """Return (usuario, titulo) for a movimentacao record."""
    usuario = {}
    titulo = "Livro"
    try:
        id_usuario = mov.get("idUsuario")
        if id_usuario:
            u_resp = supabase.table("Usuario").select("idUsuario, usuNome, usuEmail").eq("idUsuario", id_usuario).limit(1).execute()
            if u_resp.data:
                usuario = u_resp.data[0]

        me_resp = supabase.table("MovimentacaoExemplar").select("idExemplar").eq("idMovimentacao", mov["idMovimentacao"]).limit(1).execute()
        if me_resp.data:
            id_exemplar = me_resp.data[0].get("idExemplar")
            if id_exemplar:
                ex = supabase.table("Exemplar").select("idLivro").eq("idExemplar", id_exemplar).limit(1).execute()
                if ex.data and ex.data[0].get("idLivro"):
                    lv = supabase.table("Livro").select("livTitulo").eq("idLivro", ex.data[0]["idLivro"]).limit(1).execute()
                    if lv.data:
                        titulo = lv.data[0].get("livTitulo", titulo)
    except Exception:
        pass
    return usuario, titulo


# ── Cron: check expirations + send expiration emails ─────────────────

@router.get("/cron/verificar-expiracoes")
def cron_verificar_expiracoes(_=Depends(verificar_cron)):
    """Hourly cron: expire overdue confirmed solicitations + send emails."""
    from routers.emprestimos import verificar_expiracoes

    if not get_config_bool("notificacao_email", True):
        expirados = verificar_expiracoes()
        return {"expirados": len(expirados), "emails_enviados": 0}

    # First, find confirmed ones about to expire (to send pre-expiration alerts)
    agora = datetime.utcnow()
    alerta_horas = get_config_int("alerta_expiracao_horas", 2)

    pre_alert_enviados = 0
    try:
        movs_confirmadas = (
            supabase.table("Movimentacao")
            .select("idMovimentacao, idUsuario, data_confirmacao, prazo_horas, status_confirmacao")
            .eq("status_confirmacao", "CONFIRMADA")
            .execute()
            .data or []
        )

        for mov in movs_confirmadas:
            data_conf_str = mov.get("data_confirmacao")
            prazo = mov.get("prazo_horas") or 48
            if not data_conf_str:
                continue
            try:
                dt_conf = datetime.fromisoformat(data_conf_str.replace("Z", "+00:00")).replace(tzinfo=None)
                data_limite = dt_conf + timedelta(hours=prazo)
                horas_restantes = (data_limite - agora).total_seconds() / 3600

                # Send pre-expiration alert if within the alert window
                if 0 < horas_restantes <= alerta_horas:
                    # Check if we already sent this alert
                    me_resp = supabase.table("MovimentacaoExemplar").select("emailConfirmacaoNotificadoEm, emailLembreteConfHoras").eq("idMovimentacao", mov["idMovimentacao"]).limit(1).execute()
                    horas_enviadas = set()
                    if me_resp.data:
                        raw = me_resp.data[0].get("emailLembreteConfHoras") or ""
                        horas_enviadas = set(raw.split(",")) if raw else set()

                    if "pre_exp" not in horas_enviadas:
                        usuario, titulo = _get_mov_user_book(mov)
                        email = usuario.get("usuEmail")
                        if email:
                            prazo_fmt = data_limite.strftime("%d/%m/%Y %H:%M")
                            html = _email_aviso_expiracao(
                                usuario.get("usuNome", "aluno(a)"), titulo,
                                max(1, int(horas_restantes)), prazo_fmt
                            )
                            if enviar_email(email, f"⚠️ Prazo de retirada expirando: {titulo}", html):
                                pre_alert_enviados += 1
                                horas_enviadas.add("pre_exp")
                                supabase.table("MovimentacaoExemplar").update({
                                    "emailLembreteConfHoras": ",".join(horas_enviadas)
                                }).eq("idMovimentacao", mov["idMovimentacao"]).execute()
            except Exception:
                continue
    except Exception as e:
        print("Erro pre-expiration alerts:", e)

    # Now run actual expiration check
    expirados = verificar_expiracoes()

    # Send expiration emails
    emails_exp_enviados = 0
    for id_mov in expirados:
        try:
            mov_resp = supabase.table("Movimentacao").select("*").eq("idMovimentacao", id_mov).limit(1).execute()
            if mov_resp.data:
                usuario, titulo = _get_mov_user_book(mov_resp.data[0])
                email = usuario.get("usuEmail")
                if email:
                    html = _email_expirado(usuario.get("usuNome", "aluno(a)"), titulo)
                    if enviar_email(email, f"❌ Reserva expirada: {titulo}", html):
                        emails_exp_enviados += 1
        except Exception:
            continue

    return {
        "expirados": len(expirados),
        "emails_expiracao_enviados": emails_exp_enviados,
        "emails_pre_alerta_enviados": pre_alert_enviados,
    }

# ── Cron: send reminder emails 2h before expiration ───────────────

@router.get("/cron/lembretes-confirmacao")
def lembretes_confirmacao_email(_=Depends(verificar_cron)):
    """
    Envia apenas um lembrete quando faltam 2 horas para a retirada expirar.
    O e-mail de expiração é enviado pelo endpoint /cron/verificar-expiracoes.
    """
    if not get_config_bool("notificacao_email", True):
        return {"enviados": 0, "motivo": "notificações desativadas"}

    try:
        agora = datetime.utcnow()
        alerta_horas = 2

        # Busca apenas movimentações confirmadas
        movs = (
            supabase.table("Movimentacao")
            .select(
                "idMovimentacao, idUsuario, data_confirmacao, "
                "prazo_horas, status_confirmacao"
            )
            .eq("status_confirmacao", "CONFIRMADA")
            .execute()
            .data or []
        )

        enviados = 0

        for mov in movs:
            data_conf_str = mov.get("data_confirmacao")
            prazo = mov.get("prazo_horas") or 48

            if not data_conf_str:
                continue

            try:
                dt_conf = datetime.fromisoformat(
                    data_conf_str.replace("Z", "+00:00")
                ).replace(tzinfo=None)
            except Exception:
                continue

            # Calcula o momento exato da expiração
            data_limite = dt_conf + timedelta(hours=prazo)

            # Quantas horas faltam para expirar
            horas_restantes = (
                data_limite - agora
            ).total_seconds() / 3600

            # Envia somente quando estiver dentro das 2 horas anteriores
            if not (0 < horas_restantes <= alerta_horas):
                continue

            # Verifica se o aviso de 2h já foi enviado
            me_resp = (
                supabase.table("MovimentacaoExemplar")
                .select("emailLembreteConfHoras")
                .eq("idMovimentacao", mov["idMovimentacao"])
                .limit(1)
                .execute()
            )

            avisos_enviados = set()

            if me_resp.data:
                raw = me_resp.data[0].get("emailLembreteConfHoras") or ""
                avisos_enviados = set(raw.split(",")) if raw else set()

            # Evita enviar o mesmo aviso novamente
            if "2h_expiracao" in avisos_enviados:
                continue

            usuario, titulo = _get_mov_user_book(mov)
            email = usuario.get("usuEmail")

            if not email:
                continue

            prazo_fmt = data_limite.strftime("%d/%m/%Y %H:%M")

            html = _email_aviso_expiracao(
                usuario.get("usuNome", "aluno(a)"),
                titulo,
                max(1, int(horas_restantes)),
                prazo_fmt
            )

            if enviar_email(
                email,
                f"⚠️ Faltam 2 horas para retirar: {titulo}",
                html
            ):
                enviados += 1

                avisos_enviados.add("2h_expiracao")

                supabase.table("MovimentacaoExemplar").update({
                    "emailLembreteConfHoras": ",".join(avisos_enviados)
                }).eq(
                    "idMovimentacao",
                    mov["idMovimentacao"]
                ).execute()

        return {"enviados": enviados}

    except Exception as e:
        print("Erro lembrete 2h confirmação:", e)
        raise HTTPException(
            status_code=500,
            detail="Erro ao enviar lembrete de 2 horas"
        )