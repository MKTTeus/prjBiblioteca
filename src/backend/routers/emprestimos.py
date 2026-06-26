from datetime import datetime, timedelta
import os
from fastapi import APIRouter, Depends, HTTPException

from database import supabase
from core import get_admin, get_admin_id, get_optional_user
from schemas import Emprestimo, Configuracao, EmprestimoSolicitacao

router = APIRouter()


def get_config_map():
    try:
        resp = supabase.table("Configuracoes").select("chave, valor").execute()
        if resp.data:
            return {row["chave"]: row["valor"] for row in resp.data}
    except Exception:
        pass
    return {}


def get_config_int(chave: str, default: int):
    configs = get_config_map()
    valor = configs.get(chave)
    if valor is not None:
        try:
            return int(valor)
        except Exception:
            pass
    env_key = chave.upper()
    return int(os.getenv(env_key, default))


def get_config_bool(chave: str, default: bool):
    configs = get_config_map()
    valor = configs.get(chave)
    if isinstance(valor, bool):
        return valor
    if isinstance(valor, str):
        return valor.lower() in ("1", "true", "yes", "on")
    return default


def get_config_days():
    return get_config_int("dias_emprestimo", 14)


def get_max_renewals():
    return get_config_int("maximo_renovacoes", 2)


def get_max_books_per_user():
    return get_config_int("livros_por_aluno", 3)


@router.get("/configuracoes")
def listar_configuracoes(user=Depends(get_optional_user)):
    try:
        configs = supabase.table("Configuracoes").select("*").execute().data or []
        return configs
    except Exception as e:
        print("Erro listar configuracoes:", e)
        raise HTTPException(status_code=500, detail="Erro ao buscar configurações")


@router.put("/configuracoes")
def atualizar_configuracao(config: Configuracao, admin=Depends(get_admin)):
    try:
        if not config.chave:
            raise HTTPException(status_code=400, detail="Chave obrigatória")

        payload = {"valor": config.valor, "atualizado_em": datetime.utcnow().isoformat()}
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
                "criado_em": datetime.utcnow().isoformat(),
            })
            ins = supabase.table("Configuracoes").insert(insert_payload).execute()
            if not ins.data:
                raise HTTPException(status_code=500, detail="Erro ao salvar configuração")

        return {"chave": config.chave, "valor": config.valor}
    except HTTPException:
        raise
    except Exception as e:
        print("Erro atualizar configuracao:", e)
        raise HTTPException(status_code=500, detail="Erro ao atualizar configuração")


@router.get("/emprestimos/solicitacoes")
def listar_solicitacoes(admin=Depends(get_admin)):
    """Retorna apenas movimentações do tipo SOLICITACAO (pendentes, aprovadas ou negadas)."""
    try:
        movimentacoes = (
            supabase.table("Movimentacao")
            .select("*")
            .eq("movTipo", "SOLICITACAO")
            .execute()
            .data or []
        )

        movimentacao_ids = [m["idMovimentacao"] for m in movimentacoes if m.get("idMovimentacao")]
        mov_ex_map = {}
        exemplar_ids = []
        if movimentacao_ids:
            movimentacao_exemplares = (
                supabase.table("MovimentacaoExemplar")
                .select("*")
                .in_("idMovimentacao", movimentacao_ids)
                .execute()
                .data or []
            )
            for me in movimentacao_exemplares:
                mov_ex_map.setdefault(me["idMovimentacao"], []).append(me)
                if me.get("idExemplar"):
                    exemplar_ids.append(me["idExemplar"])

        exemplar_map = {}
        livro_map = {}
        if exemplar_ids:
            exemplares = (
                supabase.table("Exemplar")
                .select("idExemplar, exeLivTombo, idLivro")
                .in_("idExemplar", list(set(exemplar_ids)))
                .execute()
                .data or []
            )
            exemplar_map = {e["idExemplar"]: e for e in exemplares}
            livro_ids = list({e.get("idLivro") for e in exemplares if e.get("idLivro")})
            if livro_ids:
                livros = (
                    supabase.table("Livro")
                    .select("idLivro, livTitulo")
                    .in_("idLivro", livro_ids)
                    .execute()
                    .data or []
                )
                livro_map = {l["idLivro"]: l["livTitulo"] for l in livros}

        usuario_ids = list({m.get("idUsuario") for m in movimentacoes if m.get("idUsuario")})
        usuario_map = {}
        if usuario_ids:
            usuarios = (
                supabase.table("Usuario")
                .select("idUsuario, usuNome, usuTipo")
                .in_("idUsuario", usuario_ids)
                .execute()
                .data or []
            )
            usuario_map = {u["idUsuario"]: u for u in usuarios}

        for mov in movimentacoes:
            me_list = mov_ex_map.get(mov.get("idMovimentacao"), [])
            exemplar = me_list[0] if me_list else None

            u = usuario_map.get(mov.get("idUsuario"), {})
            mov["usuario"] = u.get("usuNome", "Usuário não informado")
            mov["usuarioTipo"] = u.get("usuTipo", "-")

            if exemplar:
                ex = exemplar_map.get(exemplar.get("idExemplar"))
                if ex:
                    mov["codigo"] = ex.get("exeLivTombo")
                    mov["titulo"] = livro_map.get(ex.get("idLivro"), "Livro não informado")
                    mov["empLiv_Tombo"] = ex.get("exeLivTombo")
                    mov["empLiv_Titulo"] = mov.get("titulo")

            mov["idEmprestimo"] = mov.get("idMovimentacao")
            mov["status"] = (mov.get("movStatus") or "").lower()

        return movimentacoes
    except Exception as e:
        print("Erro listar_solicitacoes:", e)
        return []


@router.get("/emprestimos")
def listar_emprestimos(user=Depends(get_optional_user)):
    try:
        hoje = datetime.utcnow().date()
        query = supabase.table("Movimentacao").select("*")

        if user and user.get("tipo") in ["Aluno", "Comunidade"]:
            usuario_resp = supabase.table("Usuario").select("idUsuario").eq("usuEmail", user["sub"]).execute()
            if not usuario_resp.data:
                raise HTTPException(status_code=404, detail="Usuário não encontrado")
            id_usuario = usuario_resp.data[0]["idUsuario"]
            query = query.eq("idUsuario", id_usuario)

        emprestimos = query.execute().data or []

        movimentacao_ids = [m["idMovimentacao"] for m in emprestimos if m.get("idMovimentacao")]
        movimentacao_exemplares = []
        if movimentacao_ids:
            movimentacao_exemplares = supabase.table("MovimentacaoExemplar").select("*").in_("idMovimentacao", movimentacao_ids).execute().data or []

        mov_ex_map = {}
        exemplar_ids = []
        for me in movimentacao_exemplares:
            mov_ex_map.setdefault(me["idMovimentacao"], []).append(me)
            if me.get("idExemplar"):
                exemplar_ids.append(me["idExemplar"])

        exemplares = []
        livros = []
        if exemplar_ids:
            exemplares = supabase.table("Exemplar").select("idExemplar, exeLivTombo, idLivro").in_("idExemplar", list(set(exemplar_ids))).execute().data or []
            livro_ids = list({ex.get("idLivro") for ex in exemplares if ex.get("idLivro")})
            if livro_ids:
                livros = supabase.table("Livro").select("idLivro, livTitulo").in_("idLivro", livro_ids).execute().data or []

        livro_map = {l["idLivro"]: l["livTitulo"] for l in livros}
        exemplar_map = {e["idExemplar"]: e for e in exemplares}

        # Buscar dados dos usuários
        usuario_ids = list({m.get("idUsuario") for m in emprestimos if m.get("idUsuario")})
        usuario_map = {}
        if usuario_ids:
            usuarios = supabase.table("Usuario").select("idUsuario, usuNome, usuTipo").in_("idUsuario", usuario_ids).execute().data or []
            usuario_map = {u["idUsuario"]: u for u in usuarios}

        for mov in emprestimos:
            me_list = mov_ex_map.get(mov.get("idMovimentacao"), [])
            exemplar = me_list[0] if me_list else None

            # Popular dados do usuário
            u = usuario_map.get(mov.get("idUsuario"), {})
            mov["usuario"] = u.get("usuNome", "Usuário não informado")
            mov["usuarioTipo"] = u.get("usuTipo", "-")

            # Título e código sempre, independente do status
            if exemplar:
                ex = exemplar_map.get(exemplar.get("idExemplar"))
                if ex:
                    mov["codigo"] = ex.get("exeLivTombo")
                    mov["titulo"] = livro_map.get(ex.get("idLivro"), mov.get("titulo"))

            data_prev = exemplar.get("dataPrevistaDevolucao") if exemplar else None

            # Checagem de atraso só para exemplares marcados como ativos (case-insensitive)
            item_status_lower = (exemplar.get("itemStatus") or "").lower() if exemplar else ""
            mov_status_lower  = (mov.get("movStatus") or "").lower()

            if exemplar:
                mov["dataDevolucao"] = exemplar.get("dataDevolucao") or exemplar.get("dataPrevistaDevolucao")
                mov["renovacoes"]    = exemplar.get("renovacoes", 0)
            else:
                mov["dataDevolucao"] = None
                mov["renovacoes"]    = 0

            # Checar atraso para qualquer empréstimo ativo (pelo item ou pela movimentação)
            is_ativo = item_status_lower == "ativo" or (not exemplar and mov_status_lower == "ativo")
            if is_ativo and data_prev:
                try:
                    data_prevista = datetime.fromisoformat(data_prev).date()
                    if data_prevista < hoje:
                        mov["itemStatus"] = "Atrasado"
                        mov["status"]     = "atrasado"
                    else:
                        mov["status"] = mov_status_lower
                except Exception:
                    mov["status"] = mov_status_lower
            else:
                mov["status"] = mov_status_lower

            mov["dataEmprestimo"] = mov.get("movDataEmprestimo")

            try:
                mov["idEmprestimo"] = mov.get("idMovimentacao")
                mov["empLiv_DataEmprestimo"] = mov.get("movDataEmprestimo")
                mov["empLiv_DataDevolucao"] = mov.get("dataDevolucao")
                mov["empLiv_DataPrevistaDevolucao"] = (
                    exemplar.get("dataPrevistaDevolucao") if exemplar else None
                )
                mov["empLiv_Status"] = (exemplar.get("itemStatus") if exemplar else None) or mov.get("movStatus")
                mov["empLiv_RenovacoesTotais"] = exemplar.get("renovacoes", 0) if exemplar else mov.get("renovacoes", 0)
                if exemplar:
                    ex_obj = exemplar_map.get(exemplar.get("idExemplar"))
                    mov["empLiv_Tombo"] = ex_obj.get("exeLivTombo") if ex_obj else None
                    mov["empLiv_Titulo"] = mov.get("titulo")
            except Exception:
                pass

        return emprestimos
    except Exception as e:
        print("Erro emprestimos:", e)
        return []


@router.get("/emprestimos/notificacoes-admin")
def notificacoes_admin(admin=Depends(get_admin)):
    try:
        agora = datetime.utcnow()
        hoje = agora.date()
        limite_24h = agora - timedelta(hours=24)
        # fetch movimentacoes and associated exemplar entries
        movimentacoes = supabase.table("Movimentacao").select("*").execute().data or []
        movimentacao_exemplares = supabase.table("MovimentacaoExemplar").select("*").execute().data or []

        # build joined loan entries (one per movimentacao_exemplar)
        movimentacao_map = {m["idMovimentacao"]: m for m in movimentacoes}
        usuario_ids = set()
        exemplar_ids = set()
        loans = []
        for me in movimentacao_exemplares:
            mov = movimentacao_map.get(me.get("idMovimentacao")) or {}
            loan = {
                "idMovimentacao": me.get("idMovimentacao"),
                "idExemplar": me.get("idExemplar"),
                "idUsuario": mov.get("idUsuario"),
                "movDataEmprestimo": mov.get("movDataEmprestimo"),
                "dataPrevistaDevolucao": me.get("dataPrevistaDevolucao"),
                "dataDevolucao": me.get("dataDevolucao"),
            }
            loans.append(loan)
            if loan.get("idUsuario"):
                usuario_ids.add(loan.get("idUsuario"))
            if loan.get("idExemplar"):
                exemplar_ids.add(loan.get("idExemplar"))

        usuarios = []
        if usuario_ids:
            usuarios = supabase.table("Usuario").select(
                "idUsuario, usuNome, usuRA, usuCPF, usuTelefone, usuTipo"
            ).in_("idUsuario", list(usuario_ids)).execute().data or []

        exemplares = []
        if exemplar_ids:
            exemplares = supabase.table("Exemplar").select("idExemplar, exeLivTombo, idLivro").in_("idExemplar", list(exemplar_ids)).execute().data or []

        livro_ids = list({ex["idLivro"] for ex in exemplares if ex.get("idLivro")})
        livros = []
        if livro_ids:
            livros = supabase.table("Livro").select("idLivro, livTitulo").in_("idLivro", livro_ids).execute().data or []

        usuario_map = {usuario["idUsuario"]: usuario for usuario in usuarios}
        exemplar_map = {ex["idExemplar"]: ex for ex in exemplares}
        livro_map = {livro["idLivro"]: livro for livro in livros}
        
        def build_entry(loan):
            usuario = usuario_map.get(loan.get("idUsuario"), {})
            exemplar = exemplar_map.get(loan.get("idExemplar"), {})
            livro = livro_map.get(exemplar.get("idLivro"), {})
            document = usuario.get("usuRA") or usuario.get("usuCPF") or "N/A"

            return {
                "id": loan.get("idMovimentacao"),
                "userName": usuario.get("usuNome") or "Usuário desconhecido",
                "userDocument": document,
                "telefone": usuario.get("usuTelefone") or "-",
                "userType": usuario.get("usuTipo") or "Aluno",
                "bookTitle": livro.get("livTitulo") or "Livro desconhecido",
                "tombo": exemplar.get("exeLivTombo") or "-",
                "loanDate": loan.get("movDataEmprestimo"),
            }

        atrasados_alunos = []
        atrasados_comunidade = []
        recentes = []
        devolucoes_recentes = []

        for emp in loans:
            data_prevista = None
            data_emprestimo = None
            data_devolucao = None

            if emp.get("dataPrevistaDevolucao"):
                try:
                    data_prevista = datetime.fromisoformat(emp["dataPrevistaDevolucao"])
                except:
                    data_prevista = None

            if emp.get("movDataEmprestimo"):
                try:
                    data_emprestimo = datetime.fromisoformat(emp["movDataEmprestimo"])
                except:
                    data_emprestimo = None

            if emp.get("dataDevolucao"):
                try:
                    data_devolucao = datetime.fromisoformat(emp["dataDevolucao"])
                except:
                    data_devolucao = None

            if data_prevista and data_prevista.date() < hoje and not data_devolucao:
                entry = build_entry(emp)
                if entry["userType"] == "Comunidade":
                    atrasados_comunidade.append(entry)
                else:
                    atrasados_alunos.append(entry)

            if data_emprestimo and data_emprestimo >= limite_24h and not data_devolucao:
                recentes.append(build_entry(emp))

            if data_devolucao and data_devolucao >= limite_24h:
                devolucoes_recentes.append(build_entry(emp))

        recentes.sort(
            key=lambda loan: loan.get("loanDate") or "",
            reverse=True,
        )

        devolucoes_recentes.sort(
            key=lambda loan: loan.get("loanDate") or "",
            reverse=True,
        )

        return {
            "atrasadosAlunos": atrasados_alunos,
            "atrasadosComunidade": atrasados_comunidade,
            "recentes": recentes,
            "devolucoesRecentes": devolucoes_recentes,
        }
    except Exception as e:
        print("Erro notificacoes admin:", e)
        raise HTTPException(status_code=500, detail="Erro ao buscar notificações de empréstimos")


@router.post("/emprestimos")
def criar_emprestimo(data: Emprestimo, admin=Depends(get_admin)):
    try:
        # Validar usuário ativo
        usuario_resp = supabase.table("Usuario").select("usuStatus").eq("idUsuario", data.idUsuario).limit(1).execute()
        if not usuario_resp.data or not usuario_resp.data[0]["usuStatus"]:
            raise HTTPException(status_code=400, detail="Usuário inativo não pode realizar empréstimos")

        # Validar exemplar disponível e não desativado
        exemplar_resp = supabase.table("Exemplar").select("exeLivStatus").eq("idExemplar", data.idExemplar).limit(1).execute()
        status = exemplar_resp.data[0]["exeLivStatus"] if exemplar_resp.data else None
        if not status or status != "Disponível" or "desativado" in status.lower():
            raise HTTPException(status_code=400, detail="Exemplar desativado ou não disponível para empréstimo")

        hoje = datetime.utcnow().date()

        dias = get_config_days()
        max_por_usuario = get_max_books_per_user()

        # verificar limite de empréstimos ativos por usuário
        movimentacoes_ativas = supabase.table("Movimentacao").select("idMovimentacao").eq("idUsuario", data.idUsuario).eq("movStatus", "Ativo").execute().data or []
        movimentacao_ids = [mov["idMovimentacao"] for mov in movimentacoes_ativas if mov.get("idMovimentacao")]
        emprestimos_ativos = []
        if movimentacao_ids:
            emprestimos_ativos = supabase.table("MovimentacaoExemplar").select("idMovimentacao").in_("idMovimentacao", movimentacao_ids).eq("itemStatus", "Ativo").execute().data or []

        if len(emprestimos_ativos) >= max_por_usuario:
            raise HTTPException(status_code=400, detail=f"O usuário já possui {max_por_usuario} empréstimos ativos")

        id_admin = get_admin_id(admin)

        novo_mov = {
            "idAdmin": id_admin,
            "idUsuario": data.idUsuario,
            "movTipo": "EMPRESTIMO",
            "movStatus": "Ativo",
            "movDataSolicitacao": hoje.isoformat(),
            "movDataEmprestimo": hoje.isoformat()
        }

        mov_resp = supabase.table("Movimentacao").insert(novo_mov).execute()
        if not mov_resp.data:
            raise HTTPException(status_code=500, detail="Erro ao criar movimentacao")

        id_mov = mov_resp.data[0].get("idMovimentacao")

        vencimento_date = (hoje + timedelta(days=dias)).isoformat()

        novo_me = {
            "idMovimentacao": id_mov,
            "idExemplar": data.idExemplar,
            "dataPrevistaDevolucao": vencimento_date,
            "itemStatus": "Ativo",
            "renovacoes": 0,
        }

        me_resp = supabase.table("MovimentacaoExemplar").insert(novo_me).execute()

        supabase.table("Exemplar").update({
            "exeLivStatus": "Emprestado"
        }).eq("idExemplar", data.idExemplar).execute()

        return {"idMovimentacao": id_mov}
    except HTTPException:
        raise
    except Exception as e:
        print("Erro criar emprestimo:", e)
        raise HTTPException(status_code=500, detail="Erro ao criar empréstimo")


@router.get("/exemplares/disponiveis")
def exemplares_disponiveis():
    try:
        exemplares = (
            supabase
            .table("Exemplar")
            .select("idExemplar, exeLivTombo, idLivro")
            .eq("exeLivStatus", "Disponível")
            .execute().data or []
        )

        livros = supabase.table("Livro").select("idLivro, livTitulo").execute().data or []
        mapa_livros = {l["idLivro"]: l["livTitulo"] for l in livros}

        return [
            {
                "id": ex["idExemplar"],
                "tombo": ex["exeLivTombo"],
                "nome": mapa_livros.get(ex["idLivro"], "Livro"),
            }
            for ex in exemplares
        ]
    except Exception as e:
        print("Erro exemplares disponiveis:", e)
        return []


@router.get("/exemplares")
def listar_exemplares():
    try:
        exemplares = supabase.table("Exemplar") \
            .select("idExemplar, exeLivTombo, idLivro") \
            .execute().data or []

        livros = supabase.table("Livro").select("idLivro, livTitulo").execute().data or []
        mapa = {l["idLivro"]: l["livTitulo"] for l in livros}

        return [
            {
                "id": e["idExemplar"],
                "tombo": e["exeLivTombo"],
                "nome": mapa.get(e["idLivro"], "Livro"),
            }
            for e in exemplares
        ]
    except Exception as e:
        print("Erro listar exemplares:", e)
        return []


@router.put("/emprestimos/{idEmprestimo}/devolver")
def devolver_emprestimo(idEmprestimo: int, admin=Depends(get_admin)):
    try:
        hoje = datetime.utcnow().date()
        # marcar movimentacao como devolvida e atualizar movimentacao_exemplar
        mov_resp = supabase.table("Movimentacao").update({
            "movStatus": "Devolvido"
        }).eq("idMovimentacao", idEmprestimo).execute()

        if not mov_resp.data:
            raise HTTPException(status_code=404, detail="Não encontrado")

        # atualizar dataDevolucao e itemStatus na MovimentacaoExemplar
        me_resp = supabase.table("MovimentacaoExemplar").select("*").eq("idMovimentacao", idEmprestimo).limit(1).execute()
        if not me_resp.data:
            raise HTTPException(status_code=404, detail="Item de empréstimo não encontrado")

        idExemplar = me_resp.data[0].get("idExemplar")

        supabase.table("MovimentacaoExemplar").update({
            "dataDevolucao": hoje.isoformat(),
            "itemStatus": "Devolvido"
        }).eq("idMovimentacao", idEmprestimo).execute()

        supabase.table("Exemplar").update({
            "exeLivStatus": "Disponível"
        }).eq("idExemplar", idExemplar).execute()

        return {"message": "Devolvido com sucesso"}
    except Exception as e:
        print("Erro devolver:", e)
        raise HTTPException(status_code=500, detail="Erro ao devolver")


@router.put("/emprestimos/{idEmprestimo}/renovar")
def renovar_emprestimo(idEmprestimo: int, admin=Depends(get_admin)):
    try:
        # Buscar movimentacao_exemplar para este emprestimo
        me_resp = supabase.table("MovimentacaoExemplar").select("*").eq("idMovimentacao", idEmprestimo).limit(1).execute()
        if not me_resp.data:
            raise HTTPException(status_code=404, detail="Empréstimo não encontrado")

        me = me_resp.data[0]

        dias = get_config_days()
        max_renovacoes = get_max_renewals()
        renovacoes_atuais = me.get("renovacoes") or 0
        if renovacoes_atuais >= max_renovacoes:
            raise HTTPException(status_code=400, detail=f"Máximo de {max_renovacoes} renovações atingido")

        if me.get("dataPrevistaDevolucao"):
            try:
                data_prevista = datetime.fromisoformat(me["dataPrevistaDevolucao"]).date()
            except:
                data_prevista = datetime.utcnow().date()
        else:
            data_prevista = datetime.utcnow().date()

        nova_data = data_prevista + timedelta(days=dias)

        # Atualizar movimentacao_exemplar
        resultado = supabase.table("MovimentacaoExemplar").update({
            "dataPrevistaDevolucao": nova_data.isoformat(),
            "renovacoes": renovacoes_atuais + 1
        }).eq("idMovimentacao", idEmprestimo).execute()

        if not resultado.data:
            raise HTTPException(status_code=500, detail="Erro ao renovar")

        return {"message": "Empréstimo renovado com sucesso", "nova_data": nova_data.isoformat()}
    except HTTPException:
        raise
    except Exception as e:
        print("Erro renovar:", e)
        raise HTTPException(status_code=500, detail="Erro ao renovar empréstimo")


@router.post("/emprestimos/solicitacao")
def criar_solicitacao_emprestimo(data: EmprestimoSolicitacao, user=Depends(get_optional_user)):
    try:
        # Validar se é um usuário comum (não admin)
        if not user or user.get("tipo") not in ["Aluno", "Comunidade"]:
            raise HTTPException(status_code=401, detail="Apenas usuários podem fazer solicitações de empréstimo")

        # Obter ID do usuário
        usuario_resp = supabase.table("Usuario").select("idUsuario, usuStatus").eq("usuEmail", user["sub"]).limit(1).execute()
        if not usuario_resp.data:
            raise HTTPException(status_code=404, detail="Usuário não encontrado")

        id_usuario = usuario_resp.data[0]["idUsuario"]
        if not usuario_resp.data[0].get("usuStatus"):
            raise HTTPException(status_code=400, detail="Usuário inativo não pode fazer solicitações de empréstimo")

        # Validar exemplar disponível
        exemplar_resp = supabase.table("Exemplar").select("exeLivStatus").eq("idExemplar", data.idExemplar).limit(1).execute()
        if not exemplar_resp.data:
            raise HTTPException(status_code=404, detail="Exemplar não encontrado")

        status = exemplar_resp.data[0].get("exeLivStatus")
        if status != "Disponível":
            raise HTTPException(status_code=400, detail="Exemplar não está disponível")

        hoje = datetime.utcnow().date()
        max_por_usuario = get_max_books_per_user()

        # Verificar limite de empréstimos ativos
        movimentacoes_ativas = supabase.table("Movimentacao").select("idMovimentacao").eq("idUsuario", id_usuario).in_("movStatus", ["Ativo", "Pendente"]).execute().data or []
        movimentacao_ids = [mov["idMovimentacao"] for mov in movimentacoes_ativas if mov.get("idMovimentacao")]
        emprestimos_ativos = []
        if movimentacao_ids:
            emprestimos_ativos = supabase.table("MovimentacaoExemplar").select("idMovimentacao").in_("idMovimentacao", movimentacao_ids).eq("itemStatus", "Ativo").execute().data or []

        if len(emprestimos_ativos) >= max_por_usuario:
            raise HTTPException(status_code=400, detail=f"Você já possui {max_por_usuario} empréstimos ativos")

        admin_placeholder = supabase.table("Administrador").select("idAdmin").limit(1).execute()
        
        if not admin_placeholder.data:
            raise HTTPException(status_code=500, detail="Nenhum administrador cadastrado no sistema")
        id_admin_placeholder = admin_placeholder.data[0]["idAdmin"]

        nova_mov = {
            "idUsuario": id_usuario,
            "idAdmin": id_admin_placeholder,
            "movTipo": "SOLICITACAO",
            "movStatus": "Pendente",
            "movDataSolicitacao": hoje.isoformat(),
            "movDataEmprestimo": hoje.isoformat(),  # placeholder; sobrescrito na aprovação
        }

        mov_resp = supabase.table("Movimentacao").insert(nova_mov).execute()
        if not mov_resp.data:
            raise HTTPException(status_code=500, detail="Erro ao criar solicitação")

        id_mov = mov_resp.data[0].get("idMovimentacao")

        # Criar MovimentacaoExemplar (sem status Ativo por enquanto)
        novo_me = {
            "idMovimentacao": id_mov,
            "idExemplar": data.idExemplar,
            "itemStatus": "Pendente",
            "renovacoes": 0,
        }

        supabase.table("MovimentacaoExemplar").insert(novo_me).execute()

        return {"idMovimentacao": id_mov, "status": "Solicitação criada com sucesso"}
    except HTTPException:
        raise
    except Exception as e:
        print("Erro criar solicitacao:", e)
        raise HTTPException(status_code=500, detail="Erro ao criar solicitação de empréstimo")


@router.put("/emprestimos/{idEmprestimo}/aprovar")
def aprovar_solicitacao(idEmprestimo: int, admin=Depends(get_admin)):
    """
    Aprovar uma solicitação de empréstimo e ativá-la.
    """
    try:
        hoje = datetime.utcnow().date()
        dias = get_config_days()

        # Buscar movimentação
        mov_resp = supabase.table("Movimentacao").select("*").eq("idMovimentacao", idEmprestimo).limit(1).execute()
        if not mov_resp.data:
            raise HTTPException(status_code=404, detail="Solicitação não encontrada")

        mov = mov_resp.data[0]
        if mov.get("movStatus") != "Pendente":
            raise HTTPException(status_code=400, detail="Apenas solicitações pendentes podem ser aprovadas")

        # Buscar exemplar
        me_resp = supabase.table("MovimentacaoExemplar").select("*").eq("idMovimentacao", idEmprestimo).limit(1).execute()
        if not me_resp.data:
            raise HTTPException(status_code=404, detail="Item não encontrado")

        me = me_resp.data[0]
        idExemplar = me.get("idExemplar")

        # Validar que exemplar está ainda disponível
        exemplar_resp = supabase.table("Exemplar").select("exeLivStatus").eq("idExemplar", idExemplar).limit(1).execute()
        if exemplar_resp.data and exemplar_resp.data[0].get("exeLivStatus") != "Disponível":
            raise HTTPException(status_code=400, detail="Exemplar não está mais disponível")

        id_admin = get_admin_id(admin)

        # Atualizar movimentação para Ativa
        supabase.table("Movimentacao").update({
            "movTipo": "EMPRESTIMO",
            "movStatus": "Ativo",
            "movDataEmprestimo": hoje.isoformat(),
            "idAdmin": id_admin,
        }).eq("idMovimentacao", idEmprestimo).execute()

        # Atualizar MovimentacaoExemplar
        vencimento_date = (hoje + timedelta(days=dias)).isoformat()
        supabase.table("MovimentacaoExemplar").update({
            "itemStatus": "Ativo",
            "dataPrevistaDevolucao": vencimento_date,
        }).eq("idMovimentacao", idEmprestimo).execute()

        # Atualizar status do exemplar
        supabase.table("Exemplar").update({
            "exeLivStatus": "Emprestado"
        }).eq("idExemplar", idExemplar).execute()

        return {"message": "Solicitação aprovada com sucesso"}
    except HTTPException:
        raise
    except Exception as e:
        print("Erro aprovar solicitacao:", e)
        raise HTTPException(status_code=500, detail="Erro ao aprovar solicitação")


@router.put("/emprestimos/{idEmprestimo}/rejeitar")
def rejeitar_solicitacao(idEmprestimo: int, admin=Depends(get_admin)):
    """
    Rejeitar uma solicitação de empréstimo.
    """
    try:
        # Buscar movimentação
        mov_resp = supabase.table("Movimentacao").select("*").eq("idMovimentacao", idEmprestimo).limit(1).execute()
        if not mov_resp.data:
            raise HTTPException(status_code=404, detail="Solicitação não encontrada")

        mov = mov_resp.data[0]
        if mov.get("movStatus") != "Pendente":
            raise HTTPException(status_code=400, detail="Apenas solicitações pendentes podem ser rejeitadas")

        # Atualizar movimentação para Negado
        supabase.table("Movimentacao").update({
            "movStatus": "Negado",
        }).eq("idMovimentacao", idEmprestimo).execute()

        # Atualizar MovimentacaoExemplar
        supabase.table("MovimentacaoExemplar").update({
            "itemStatus": "Negado",
        }).eq("idMovimentacao", idEmprestimo).execute()

        return {"message": "Solicitação rejeitada com sucesso"}
    except HTTPException:
        raise
    except Exception as e:
        print("Erro rejeitar solicitacao:", e)
        raise HTTPException(status_code=500, detail="Erro ao rejeitar solicitação")