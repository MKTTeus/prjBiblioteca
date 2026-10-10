import hmac
from html import escape
from rpc import executar_rpc
from loan_data import montar_itens
from core import consultar_completo, consultar_lote
import os
from datetime import timedelta

from fastapi import APIRouter, Depends, Header, HTTPException
import httpx

from database import supabase
from core import datetime_utc, utc_now
from zoneinfo import ZoneInfo
import logging
logger=logging.getLogger(__name__)
from routers.emprestimos import get_config_bool, get_config_int, get_config_map

router = APIRouter()

CRON_SECRET = os.getenv("CRON_SECRET")
RESEND_API_KEY = os.getenv("RESEND_API_KEY")
RESEND_FROM_EMAIL = os.getenv("RESEND_FROM_EMAIL", "Biblioteca <onboarding@resend.dev>")


def verificar_cron(authorization: str | None = Header(default=None)):
    if not CRON_SECRET or not hmac.compare_digest(authorization or '', f'Bearer {CRON_SECRET}'):
        raise HTTPException(401,'Acesso não autorizado')


def enviar_email(destinatario: str, assunto: str, html: str, chave: str | None = None) -> bool:
    if not RESEND_API_KEY:
        print("RESEND_API_KEY não configurada")
        return False
    try:
        resp = httpx.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {RESEND_API_KEY}", **({"Idempotency-Key": chave} if chave else {})},
            json={"from": RESEND_FROM_EMAIL, "to": [destinatario], "subject": assunto, "html": html},
            timeout=10,
        )
        return resp.status_code in (200, 201)
    except Exception as e:
        print("Erro ao enviar email via Resend:", 'falha de operação')
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
                © {utc_now().year} Sistema de Biblioteca
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
    nome=escape(str(nome),quote=True); titulo=escape(str(titulo),quote=True)
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
    nome=escape(str(nome),quote=True); titulo=escape(str(titulo),quote=True)
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
    return processar_fila_emails()


@router.get("/cron/lembretes-devolucao")
def lembretes_devolucao_email(_=Depends(verificar_cron)):
    return processar_fila_emails()

def _email_redefinir_senha(nome: str, link: str, ttl_minutos: int) -> str:
    nome=escape(str(nome),quote=True); link=escape(str(link),quote=True)
    conteudo = f"""
      <p style="margin:0 0 8px;font-size:15px;color:#374151;">Olá, <strong>{nome}</strong>!</p>

      <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
        Recebemos uma solicitação para redefinir a senha da sua conta no
        Sistema de Biblioteca. Clique no botão abaixo para escolher uma nova senha.
      </p>

      <table cellpadding="0" cellspacing="0" style="margin:24px 0;">
        <tr>
          <td style="background:#111827;border-radius:8px;padding:14px 28px;">
            <a href="{link}" style="color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;">
              🔑 Redefinir minha senha
            </a>
          </td>
        </tr>
      </table>

      <p style="margin:0 0 16px;font-size:13px;color:#6b7280;line-height:1.6;">
        Este link expira em <strong>{ttl_minutos} minutos</strong>. Se você não solicitou
        essa redefinição, pode ignorar este e-mail — sua senha permanecerá inalterada.
      </p>

      <p style="margin:16px 0 0;font-size:13px;color:#9ca3af;line-height:1.6;">
        Em caso de dúvidas, procure a equipe da biblioteca.
      </p>
    """
    return _base_template(conteudo)


# ── Email templates for confirmation workflow ─────────────────────────

def _email_confirmacao(nome: str, titulo: str, prazo_fmt: str, prazo_horas: int) -> str:
    nome=escape(str(nome),quote=True); titulo=escape(str(titulo),quote=True)
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
    nome=escape(str(nome),quote=True); titulo=escape(str(titulo),quote=True)
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
    nome=escape(str(nome),quote=True); titulo=escape(str(titulo),quote=True)
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
    nome=escape(str(nome),quote=True); titulo=escape(str(titulo),quote=True)
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
    return processar_fila_emails()

# ── Cron: send reminder emails 2h before expiration ───────────────

@router.get("/cron/lembretes-confirmacao")
def lembretes_confirmacao_email(_=Depends(verificar_cron)):
    return processar_fila_emails()


def processar_fila_emails():
    executar_rpc('processar_prazos',{})
    executar_rpc('enfileirar_lembretes',{})
    enviados=0; adiados=0
    for evento in executar_rpc('reservar_emails',{'p_limite':20}) or []:
        sucesso=False
        try:
            rows=supabase.table('Movimentacao').select('*').eq('idMovimentacao',evento['idMovimentacao']).limit(1).execute().data
            if not rows: sucesso=True
            else:
                m=rows[0]; tipo='lembrete_confirmacao' if evento['tipo']=='lembrete' else evento['tipo']; cfg=get_config_map()
                valido=get_config_bool('notificacao_email',True,cfg)
                if tipo in ('aprovacao','lembrete_confirmacao'): valido=valido and m['movStatus']=='Aprovado' and m['status_confirmacao']=='CONFIRMADA'
                if tipo=='expiracao': valido=valido and m['movStatus']=='Expirado'
                itens=montar_itens(rows)
                if tipo in ('atraso','devolucao'):
                    partes=evento['chave'].split(':'); idex=int(partes[2]); prazo=partes[3]
                    itens=[i for i in itens if i['idExemplar']==idex and i['itemStatus']=='Ativo' and i.get('dataPrevistaDevolucao')==prazo]
                    valido=valido and bool(itens) and get_config_bool('lembrete_'+tipo,True,cfg)
                    if tipo=='atraso': valido=valido and itens[0]['status']=='atrasado'
                if not valido: sucesso=True
                else:
                    is_prof=bool(m.get('idAdminProfessor')); tabela='Administrador' if is_prof else 'Usuario'; idcol='idAdmin' if is_prof else 'idUsuario'; prefix='adm' if is_prof else 'usu'
                    idconta=m.get('idAdminProfessor') if is_prof else m.get('idUsuario')
                    conta=supabase.table(tabela).select(f'{prefix}Nome,{prefix}Email,{prefix}Status').eq(idcol,idconta).limit(1).execute().data
                    if not conta or not conta[0][prefix+'Status']: sucesso=True
                    else:
                        titulos=', '.join(f"{i['titulo']} (tombo {i['codigo']})" for i in itens)
                        assunto={'aprovacao':'Solicitação aprovada','lembrete_confirmacao':'Prazo de retirada','expiracao':'Solicitação expirada','atraso':'Devolução em atraso','devolucao':'Lembrete de devolução'}[tipo]
                        mensagem=f"<p>Olá, {escape(conta[0][prefix+'Nome'])}.</p><p>{escape(assunto)}: {escape(titulos)}.</p>"
                        if m.get('data_confirmacao') and tipo in ('aprovacao','lembrete_confirmacao'):
                            limite=datetime_utc(m['data_confirmacao'])+timedelta(hours=m['prazo_horas'])
                            mensagem+=f"<p>Retire até {limite.astimezone(ZoneInfo('America/Sao_Paulo')).strftime('%d/%m/%Y %H:%M')}.</p>"
                        sucesso=enviar_email(conta[0][prefix+'Email'],assunto,_base_template(mensagem),chave=evento['chave'])
            enviados+=int(sucesso);adiados+=int(not sucesso)
        except Exception:
            logger.error('Falha ao processar evento de email %s',evento['id']);adiados+=1
        finally:
            executar_rpc('concluir_email',{'p_id':evento['id'],'p_lease':evento['lease_token'],'p_sucesso':sucesso})
    return {'ok':True,'processados':enviados,'adiados':adiados}


@router.get('/cron/circulacao')
def cron_circulacao(_=Depends(verificar_cron)):
    return processar_fila_emails()
