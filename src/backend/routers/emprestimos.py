from core import consultar_completo, consultar_lote
import os
from zoneinfo import ZoneInfo
from datetime import timedelta

from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Header
from rpc import executar_rpc
from loan_data import montar_itens
from core import buscar_todos

from database import supabase
from core import datetime_utc, get_admin, get_admin_id, get_optional_user, get_user, get_loan_reader, executar_em_paralelo, parse_status, utc_now
from schemas import Emprestimo, Configuracao, EmprestimoSolicitacao, RenovarEmprestimo, SolicitacaoLivro, DevolucaoExemplares

router = APIRouter()


def get_config_map():
    try:
        resp = consultar_completo(lambda: supabase.table('Configuracoes').select('chave, valor'), 'Configuracoes')
        if resp.data:
            return {row["chave"]: row["valor"] for row in resp.data}
    except Exception:
        pass
    return {}


def get_config_int(chave: str, default: int, configs: dict = None):
    if configs is None:
        configs = get_config_map()
    valor = configs.get(chave)
    if valor is not None:
        try:
            return int(valor)
        except Exception:
            pass
    env_key = chave.upper()
    return int(os.getenv(env_key, default))


def get_config_bool(chave: str, default: bool, configs: dict = None):
    if configs is None:
        configs = get_config_map()
    valor = configs.get(chave)
    if isinstance(valor, bool):
        return valor
    if isinstance(valor, str):
        return valor.lower() in ("1", "true", "yes", "on")
    return default


def get_config_days(configs: dict = None):
    return get_config_int("dias_emprestimo", 14, configs)


def get_max_renewals(configs: dict = None):
    return get_config_int("maximo_renovacoes", 2, configs)


def get_max_books_per_user(configs: dict = None):
    return get_config_int("livros_por_aluno", 3, configs)


CONFIG_PUBLICAS={'nome_biblioteca','dias_emprestimo','maximo_renovacoes','livros_por_aluno','prazo_confirmacao_horas','alerta_expiracao_horas','timeout_sessao'}
CONFIG_NUMERICAS={'dias_emprestimo':(1,365),'maximo_renovacoes':(0,100),'livros_por_aluno':(1,100),'prazo_confirmacao_horas':(1,168),
    'alerta_expiracao_horas':(1,48),'timeout_sessao':(1,1440),'tamanho_minimo_senha':(8,32),'dias_antecedencia_lembrete':(0,30)}
CONFIG_BOOL={'exigir_senha_forte','notificacao_email','lembrete_atraso','lembrete_devolucao','log_api'}
CONFIG_INDISPONIVEIS={'autenticacao_dois_fatores','notificacao_sms','modo_debug','modo_manutencao'}
CONFIG_PERMITIDAS=CONFIG_PUBLICAS|set(CONFIG_NUMERICAS)|CONFIG_BOOL|CONFIG_INDISPONIVEIS|{'frequencia_backup'}


@router.get('/configuracoes/email-status')
def email_status(admin=Depends(get_admin)):
    return {'configurado':bool(os.getenv('RESEND_API_KEY')), 'remetente':os.getenv('RESEND_FROM_EMAIL','')}


@router.get("/configuracoes")
def listar_configuracoes(user=Depends(get_optional_user)):
    try:
        configs = consultar_completo(lambda: supabase.table('Configuracoes').select('*'), 'Configuracoes').data or []
        permitidas=CONFIG_PERMITIDAS if user and user['tipo']=='admin' and not user.get('admProfessor') else CONFIG_PUBLICAS
        return [c for c in configs if c['chave'] in permitidas]
    except Exception as e:
        print("Erro listar configuracoes:", 'falha de operação')
        raise HTTPException(status_code=500, detail="Erro ao buscar configurações")


@router.put("/configuracoes")
def atualizar_configuracao(config: Configuracao, admin=Depends(get_admin)):
    try:
        if not config.chave:
            raise HTTPException(status_code=400, detail="Chave obrigatória")

        if config.chave not in CONFIG_PERMITIDAS: raise HTTPException(422,'Configuração desconhecida ou sensível')
        if config.chave in CONFIG_NUMERICAS:
            try: numero=int(config.valor)
            except ValueError: raise HTTPException(422,'Valor deve ser inteiro')
            minimo,maximo=CONFIG_NUMERICAS[config.chave]
            if not minimo<=numero<=maximo: raise HTTPException(422,f'Valor deve estar entre {minimo} e {maximo}')
        if config.chave in CONFIG_BOOL|CONFIG_INDISPONIVEIS and config.valor not in ('true','false'): raise HTTPException(422,'Valor deve ser true ou false')
        if config.chave in CONFIG_INDISPONIVEIS and config.valor!='false': raise HTTPException(422,'Recurso ainda indisponível')
        if config.chave=='frequencia_backup' and config.valor!='diario': raise HTTPException(422,'O agendamento configurado é diário')
        if config.chave=='nome_biblioteca' and not 1<=len(config.valor.strip())<=200: raise HTTPException(422,'Nome inválido')
        payload = {"valor": config.valor, "atualizado_em": utc_now().isoformat()}
        if config.descricao is not None:
            payload["descricao"] = config.descricao
        if config.categoria is not None:
            payload["categoria"] = config.categoria
        if config.ativo is not None:
            payload["ativo"] = config.ativo

        upd = supabase.table("Configuracoes").update(payload).eq("chave", config.chave).execute()
        if not upd.data:
            insert_payload = payload.copy()
            insert_payload.update({
                "chave": config.chave,
                "criado_em": utc_now().isoformat(),
            })
            ins = supabase.table("Configuracoes").insert(insert_payload).execute()
            if not ins.data:
                raise HTTPException(status_code=500, detail="Erro ao salvar configuração")

        return {"chave": config.chave, "valor": config.valor}
    except HTTPException:
        raise
    except Exception as e:
        print("Erro atualizar configuracao:", 'falha de operação')
        raise HTTPException(status_code=500, detail="Erro ao atualizar configuração")


@router.get("/emprestimos/solicitacoes")
def listar_solicitacoes(admin=Depends(get_admin)):
    movs = buscar_todos(lambda: supabase.table("Movimentacao").select("*").eq("movTipo", "SOLICITACAO").order("idMovimentacao", desc=True))
    grupos = {}
    for it in montar_itens(movs): grupos.setdefault(it["idMovimentacao"], []).append(it)
    resultado = []
    for mov in movs:
        itens = grupos.get(mov["idMovimentacao"], [])
        primeiro = itens[0] if itens else {}
        limite = datetime_utc(mov["data_confirmacao"]) + timedelta(hours=mov["prazo_horas"]) if mov.get("data_confirmacao") and mov.get("prazo_horas") else None
        resultado.append({**mov, **{k: primeiro.get(k) for k in ("usuario", "usuarioTipo", "statusConfirmacao", "dataConfirmacao", "prazoHoras")},
            "idEmprestimo": mov["idMovimentacao"], "status": mov["movStatus"].lower(), "itens": itens,
            "titulo": ", ".join(dict.fromkeys(i["titulo"] for i in itens)), "codigo": ", ".join(i["codigo"] or "-" for i in itens),
            "professor": bool(mov.get("idAdminProfessor")), "finalidade": mov.get("movFinalidade"),
            "serie": mov.get("movSerie"), "turma": mov.get("movTurma"), "totalExemplares": len(itens),
            "dataLimite": limite.isoformat() if limite else None})
    return resultado


@router.get("/emprestimos")
def listar_emprestimos(user=Depends(get_loan_reader)):
    def query():
        q = supabase.table("Movimentacao").select("*").order("idMovimentacao", desc=True)
        return q.eq("movTipo", "EMPRESTIMO") if user["tipo"] == "admin" else q.eq("idUsuario", user["id"])
    return montar_itens(buscar_todos(query))


@router.get("/emprestimos/notificacoes-admin")
def notificacoes_admin(admin=Depends(get_admin)):
    itens=montar_itens(buscar_todos(lambda:supabase.table('Movimentacao').select('*').eq('movTipo','EMPRESTIMO').order('idMovimentacao')))
    resultado={'atrasadosAlunos':[],'atrasadosComunidade':[],'recentes':[],'devolucoesRecentes':[]}
    hoje=utc_now().astimezone(ZoneInfo('America/Sao_Paulo')).date()
    for i in itens:
        entrada={'id':f"{i['idMovimentacao']}-{i['idExemplar']}",'userName':i['usuario'],'userType':i['usuarioTipo'],'bookTitle':i['titulo'],'tombo':i['codigo'],'loanDate':i['dataEmprestimo']}
        if i['status']=='atrasado': resultado['atrasadosComunidade' if i['usuarioTipo']=='Comunidade' else 'atrasadosAlunos'].append(entrada)
        if i.get('dataEmprestimo')==hoje.isoformat(): resultado['recentes'].append(entrada)
        if i.get('dataDevolucao')==hoje.isoformat(): resultado['devolucoesRecentes'].append(entrada)
    return resultado


@router.post("/emprestimos")
def criar_emprestimo(data: Emprestimo, admin=Depends(get_admin), idempotency_key: UUID | None = Header(default=None, alias="Idempotency-Key")):
    return executar_rpc("criar_movimentacao", {"p_usuario": data.idUsuario, "p_professor": None,
        "p_admin": get_admin_id(admin), "p_itens": [], "p_exemplar": data.idExemplar,
        "p_direto": True, "p_chave": str(idempotency_key) if idempotency_key else None})


@router.get("/exemplares/disponiveis")
def exemplares_disponiveis():
    try:
        exemplares = (
            consultar_completo(lambda: supabase.table('Exemplar').select('idExemplar, exeLivTombo, idLivro').eq('exeLivStatus', 'Disponível'), 'Exemplar').data or []
        )
        livro_ids = list({e["idLivro"] for e in exemplares if e.get("idLivro")})
        livros = (
            consultar_lote(lambda ids_lote: supabase.table('Livro').select('idLivro, livTitulo, livISBN').eq('livAtivo',True).in_('idLivro', ids_lote), 'Livro', livro_ids)
            .data or []
        ) if livro_ids else []
        mapa_livros = {l["idLivro"]: l for l in livros}
        return [
            {
                "id": ex["idExemplar"],
                "tombo": ex["exeLivTombo"],
                "nome": mapa_livros.get(ex["idLivro"], {}).get("livTitulo", "Livro"),
                "isbn": mapa_livros.get(ex["idLivro"], {}).get("livISBN"),
                "idLivro": ex["idLivro"],
            }
            for ex in exemplares if ex["idLivro"] in mapa_livros
        ]
    except Exception as e:
        raise HTTPException(503,'Serviço temporariamente indisponível') from e


@router.get("/exemplares")
def listar_exemplares():
    try:
        exemplares = consultar_completo(lambda: supabase.table('Exemplar').select('idExemplar, exeLivTombo, idLivro'), 'Exemplar').data or []
        livro_ids = list({e["idLivro"] for e in exemplares if e.get("idLivro")})
        livros = (
            consultar_lote(lambda ids_lote: supabase.table('Livro').select('idLivro, livTitulo, livISBN').in_('idLivro', ids_lote), 'Livro', livro_ids)
            .data or []
        ) if livro_ids else []
        mapa = {l["idLivro"]: l for l in livros}
        return [
            {
                "id": e["idExemplar"],
                "tombo": e["exeLivTombo"],
                "nome": mapa.get(e["idLivro"], {}).get("livTitulo", "Livro"),
                "isbn": mapa.get(e["idLivro"], {}).get("livISBN"),
                "idLivro": e["idLivro"],
            }
            for e in exemplares
        ]
    except Exception as e:
        raise HTTPException(503,'Serviço temporariamente indisponível') from e


@router.put("/emprestimos/{idEmprestimo}/devolver")
def devolver_emprestimo(idEmprestimo: int, data: DevolucaoExemplares, admin=Depends(get_admin)):
    return executar_rpc("transicionar_movimentacao", {"p_id": idEmprestimo, "p_acao": "devolver",
        "p_admin": get_admin_id(admin), "p_ids": data.idExemplares})


@router.put("/emprestimos/{idEmprestimo}/renovar")
def renovar_emprestimo(idEmprestimo: int, dados: RenovarEmprestimo, admin=Depends(get_admin)):
    return executar_rpc("transicionar_movimentacao", {"p_id": idEmprestimo, "p_acao": "renovar",
        "p_admin": get_admin_id(admin), "p_nova_data": dados.novaData.isoformat(), "p_ids": dados.idExemplares})












@router.post("/emprestimos/solicitar-livro")
@router.post("/emprestimos/solicitacao-livro")
def solicitar_livro(data: SolicitacaoLivro, user=Depends(get_user), idempotency_key: UUID | None = Header(default=None, alias="Idempotency-Key")):
    return executar_rpc("criar_movimentacao", {"p_usuario": user["id"], "p_professor": None,
        "p_admin": None, "p_itens": [{"idLivro": data.idLivro, "quantidade": 1}],
        "p_chave": str(idempotency_key) if idempotency_key else None})


@router.post("/emprestimos/solicitacao")
def criar_solicitacao_emprestimo(data: EmprestimoSolicitacao, user=Depends(get_user), idempotency_key: UUID | None = Header(default=None, alias="Idempotency-Key")):
    return executar_rpc("criar_movimentacao", {"p_usuario": user["id"], "p_professor": None,
        "p_admin": None, "p_itens": [], "p_exemplar": data.idExemplar,
        "p_chave": str(idempotency_key) if idempotency_key else None})

@router.put("/emprestimos/{idEmprestimo}/aprovar")
def aprovar_solicitacao(idEmprestimo: int, admin=Depends(get_admin)):
    return executar_rpc("transicionar_movimentacao", {"p_id": idEmprestimo, "p_acao": "aprovar", "p_admin": get_admin_id(admin)})


@router.put("/emprestimos/{idEmprestimo}/rejeitar")
def rejeitar_solicitacao(idEmprestimo: int, admin=Depends(get_admin)):
    return executar_rpc("transicionar_movimentacao", {"p_id": idEmprestimo, "p_acao": "rejeitar", "p_admin": get_admin_id(admin)})


# ── Confirmação de retirada (workflow com prazo) ─────────────────────


def _get_prazo_confirmacao_horas(configs: dict = None) -> int:
    """Return the configured withdrawal deadline in hours (default 48)."""
    return get_config_int("prazo_confirmacao_horas", 48, configs)


def _get_alerta_expiracao_horas(configs: dict = None) -> int:
    return get_config_int("alerta_expiracao_horas", 2, configs)


@router.post("/emprestimos/solicitacoes/{idSolicitacao}/retirar")
def registrar_retirada(idSolicitacao: int, admin=Depends(get_admin)):
    return executar_rpc("transicionar_movimentacao", {"p_id": idSolicitacao, "p_acao": "retirar", "p_admin": get_admin_id(admin)})


@router.post("/emprestimos/solicitacoes/{idSolicitacao}/expirar")
def expirar_solicitacao_manual(idSolicitacao: int, admin=Depends(get_admin)):
    return executar_rpc("transicionar_movimentacao", {"p_id": idSolicitacao, "p_acao": "expirar", "p_admin": get_admin_id(admin)})




def verificar_expiracoes():
    return executar_rpc("processar_prazos", {})
