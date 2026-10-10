from core import consultar_completo, consultar_lote
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException

from database import supabase
from core import datetime_utc, get_admin, executar_em_paralelo, utc_now, buscar_todos, business_today
from loan_data import montar_itens

router = APIRouter()

MESES_LABEL = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]


def _buscar_itens_emprestimos(dataInicio=None,dataFim=None,tipoUsuario='todos',turma=None,serie=None,anoLetivo=None,idUsuario=None,status='todos'):
    def consulta():
        q=supabase.table('Movimentacao').select('*').eq('movTipo','EMPRESTIMO').order('idMovimentacao')
        if dataInicio: q=q.gte('movDataEmprestimo',dataInicio)
        if dataFim: q=q.lte('movDataEmprestimo',dataFim)
        if idUsuario: q=q.eq('idUsuario',idUsuario)
        return q
    itens=montar_itens(buscar_todos(consulta))
    itens=[{**i,'tombo':i['codigo']} for i in itens if
        (not tipoUsuario or tipoUsuario=='todos' or i['usuarioTipo']==tipoUsuario) and
        (not turma or i['turma']==turma) and (not serie or i['serie']==serie) and
        (not anoLetivo or (i.get('movAnoLetivo') or str(i.get('dataEmprestimo',''))[:4]) in (anoLetivo,str(anoLetivo))) and
        (not status or status=='todos' or i['status']==status)]
    return sorted(itens,key=lambda i:(i.get('dataEmprestimo') or '',i['idExemplar']),reverse=True)


@router.get("/relatorios/emprestimos")
def relatorio_emprestimos(
    dataInicio: Optional[str] = None,
    dataFim: Optional[str] = None,
    status: Optional[str] = "todos",       # todos | ativo | atrasado | devolvido
    tipoUsuario: Optional[str] = "todos",  # todos | Aluno | Comunidade
    turma: Optional[str] = None,
    serie: Optional[str] = None,
    anoLetivo: Optional[int] = None,       # filtra pelo ano de movDataEmprestimo
    idUsuario: Optional[int] = None,       # histórico de um aluno específico
    agrupador: Optional[str] = None,       # None | usuario | turma | serie | livro
    admin=Depends(get_admin),
):
    try:
        itens = _buscar_itens_emprestimos(
            dataInicio=dataInicio, dataFim=dataFim, tipoUsuario=tipoUsuario,
            turma=turma, serie=serie, anoLetivo=anoLetivo, idUsuario=idUsuario,
            status=status,
        )

        resumo = {"ativos": 0, "atrasados": 0, "devolvidos": 0, "total": len(itens)}
        for i in itens:
            chave_status={'ativo':'ativos','atrasado':'atrasados','devolvido':'devolvidos'}.get(i['status'])
            if chave_status: resumo[chave_status]+=1

        # Ranking opcional: agrega os itens já filtrados por uma dimensão
        # (aluno, turma, série ou livro) — cobre "livros mais emprestados",
        # "alunos que mais emprestam", "empréstimos por turma/série" etc.
        ranking = None
        if agrupador in ("usuario", "turma", "serie", "livro"):
            chave_fn = {
                "usuario": lambda i: (("professor:"+str(i["idAdminProfessor"]) if i.get("idAdminProfessor") else "usuario:"+str(i["idUsuario"])), i["usuario"]),
                "turma": lambda i: (i["turma"], i["turma"]),
                "serie": lambda i: (i["serie"], i["serie"]),
                "livro": lambda i: (i["idLivro"], i["titulo"]),
            }[agrupador]

            agregados = {}
            for i in itens:
                chave, rotulo = chave_fn(i)
                bucket = agregados.setdefault(chave, {
                    "rotulo": rotulo,
                    "total": 0, "ativos": 0, "atrasados": 0, "devolvidos": 0,
                })
                bucket["total"] += 1
                if i["status"] in ("ativo", "atrasado", "devolvido"):
                    bucket[{"ativo":"ativos","atrasado":"atrasados","devolvido":"devolvidos"}[i["status"]]] += 1

            ranking = sorted(
                [{"chave": k, **v} for k, v in agregados.items()],
                key=lambda r: r["total"],
                reverse=True,
            )

        resultado = {"itens": itens, "resumo": resumo}
        if ranking is not None:
            resultado["ranking"] = ranking
            resultado["agrupador"] = agrupador
        return resultado
    except Exception as e:
        raise HTTPException(503,'Serviço temporariamente indisponível') from e


@router.get("/relatorios/emprestimos/mensal")
def relatorio_emprestimos_mensal(
    anoLetivo: Optional[int] = None,
    tipoUsuario: Optional[str] = "todos",  # todos | Aluno | Comunidade
    turma: Optional[str] = None,
    serie: Optional[str] = None,
    admin=Depends(get_admin),
):
    """Empréstimos agrupados por mês dentro de um ano letivo — cobre
    'empréstimos por período' (visão mensal), evolução ao longo do ano e
    identificação do mês de pico. Também devolve os anos que têm
    movimentação registrada, para popular o seletor de ano letivo."""
    try:
        ano = anoLetivo or utc_now().year

        try:
            anos_resp = supabase.rpc("listar_anos_emprestimos").execute()
            anos_disponiveis = sorted({
                int(row.get("ano"))
                for row in (anos_resp.data or [])
                if row.get("ano") is not None
            }, reverse=True)
        except Exception:
            # Compatibilidade durante a implantação da migração 0018.
            todas_datas = (
                consultar_completo(lambda: supabase.table('Movimentacao').select('movDataEmprestimo').eq('movTipo', 'EMPRESTIMO'), 'Movimentacao')
                .data
                or []
            )
            anos_disponiveis = sorted({
                int(str(d["movDataEmprestimo"])[:4])
                for d in todas_datas
                if d.get("movDataEmprestimo") and str(d["movDataEmprestimo"])[:4].isdigit()
            }, reverse=True)
        if ano not in anos_disponiveis:
            anos_disponiveis = sorted(set(anos_disponiveis + [ano]), reverse=True)

        itens = _buscar_itens_emprestimos(
            dataInicio=f"{ano}-01-01", dataFim=f"{ano}-12-31",
            tipoUsuario=tipoUsuario, turma=turma, serie=serie,
        )

        meses = [
            {"mes": m, "label": MESES_LABEL[m - 1], "total": 0, "ativos": 0, "atrasados": 0, "devolvidos": 0}
            for m in range(1, 13)
        ]

        for item in itens:
            data_emp = item.get("dataEmprestimo")
            if not data_emp or len(str(data_emp)) < 7:
                continue
            try:
                mes_num = int(str(data_emp)[5:7])
            except Exception:
                continue
            if not (1 <= mes_num <= 12):
                continue
            bucket = meses[mes_num - 1]
            bucket["total"] += 1
            chave_status = {"ativo": "ativos", "atrasado": "atrasados", "devolvido": "devolvidos"}.get(item["status"])
            if chave_status:
                bucket[chave_status] += 1

        total_ano = sum(m["total"] for m in meses)
        mes_pico = max(meses, key=lambda m: m["total"]) if total_ano > 0 else None
        meses_com_movimento = [m for m in meses if m["total"] > 0]

        resumo = {
            "totalAno": total_ano,
            "mediaMensal": round(total_ano / 12, 1),
            "mesPico": {"mes": mes_pico["mes"], "label": mes_pico["label"], "total": mes_pico["total"]} if mes_pico else None,
            "mesesComMovimento": len(meses_com_movimento),
        }

        return {
            "anoLetivo": ano,
            "anosDisponiveis": anos_disponiveis,
            "meses": meses,
            "resumo": resumo,
        }
    except Exception as e:
        raise HTTPException(503,'Serviço temporariamente indisponível') from e


@router.get("/relatorios/usuarios/busca")
def relatorio_usuarios_busca(
    q: str = "",
    admin=Depends(get_admin),
):
    """Busca leve de usuários por nome, usada no autocomplete de 'histórico
    de um aluno específico' do relatório de empréstimos. Só retorna os
    campos necessários pro autocomplete (não a ficha completa)."""
    try:
        termo = (q or "").strip()
        if len(termo) < 2:
            return {"itens": []}

        resp = (
            supabase.table("Usuario")
            .select("idUsuario, usuNome, usuTipo, usuTurma, usuSerie")
            .eq("usuExcluido", False)
            .ilike("usuNome", f"%{termo}%")
            .order("usuNome")
            .limit(15)
            .execute()
        )
        return {"itens": resp.data or []}
    except Exception as e:
        raise HTTPException(503,'Serviço temporariamente indisponível') from e




@router.get("/relatorios/atrasos")
def relatorio_atrasos(tipoUsuario='todos',turma=None,serie=None,apenasAtivos:bool=True,agrupador=None,admin=Depends(get_admin)):
    itens=[];hoje=business_today()
    usuarios={u['idUsuario']:u for u in consultar_completo(lambda:supabase.table('Usuario').select('idUsuario,usuEmail,usuTelefone,usuTelefoneResponsavel'),'Usuario').data}
    professores={p['idAdmin']:p for p in consultar_completo(lambda:supabase.table('Administrador').select('idAdmin,admEmail'),'Administrador').data}
    for it in _buscar_itens_emprestimos(tipoUsuario=tipoUsuario,turma=turma,serie=serie):
        if it['itemStatus'] not in ('Ativo','Devolvido') or not it.get('dataPrevistaDevolucao'): continue
        devolvido=bool(it.get('dataDevolucao'))
        if apenasAtivos and devolvido: continue
        fim=datetime_utc(it['dataDevolucao']).date() if devolvido else hoje
        dias=(fim-datetime_utc(it['dataPrevistaDevolucao']).date()).days
        if dias<=0: continue
        conta=professores.get(it.get('idAdminProfessor'),{}) if it.get('idAdminProfessor') else usuarios.get(it.get('idUsuario'),{})
        contato=conta.get('admEmail') or conta.get('usuEmail') or conta.get('usuTelefone') or conta.get('usuTelefoneResponsavel') or '-'
        itens.append({**it,'contato':contato,'diasAtraso':dias,'situacao':'devolvido_em_atraso' if devolvido else 'em_atraso'})
    itens.sort(key=lambda i:i['diasAtraso'],reverse=True)
    devedores={(i.get('idUsuario'),i.get('idAdminProfessor')) for i in itens if i['situacao']=='em_atraso'}
    resumo={'usuariosInadimplentes':len(devedores),'itensAtrasados':len(itens),'diasAtrasoMedio':round(sum(i['diasAtraso'] for i in itens)/len(itens),1) if itens else 0}
    resultado={'itens':itens,'resumo':resumo}
    if agrupador in ('usuario','turma'):
        grupos={}
        for i in itens:
            chave=(('professor' if i.get('idAdminProfessor') else 'usuario')+':'+str(i.get('idAdminProfessor') or i.get('idUsuario'))) if agrupador=='usuario' else i['turma']
            bucket=grupos.setdefault(chave,{'chave':chave,'rotulo':i['usuario'] if agrupador=='usuario' else i['turma'],'ocorrencias':0,'diasAtrasoTotal':0})
            bucket['ocorrencias']+=1;bucket['diasAtrasoTotal']+=i['diasAtraso']
        resultado.update(ranking=sorted(grupos.values(),key=lambda g:g['ocorrencias'],reverse=True),agrupador=agrupador)
    return resultado


@router.get("/relatorios/acervo")
def relatorio_acervo(
    agrupador: Optional[str] = "categoria",  # categoria | genero | autor | editora | ano_publicacao
    admin=Depends(get_admin),
):
    """Acervo agrupado por categoria, gênero, autor, editora ou ano de
    publicação: quantidade de títulos e de exemplares (cópias físicas,
    detalhadas por status) em cada grupo."""
    try:
        livros = consultar_completo(lambda: supabase.table('Livro').select('idLivro, livAtivo, idEditora, livAnoPublicacao').eq('livAtivo', True), 'Livro').data or []
        livro_ids = [l["idLivro"] for l in livros]

        if not livro_ids:
            return {"itens": [], "resumo": {"totalLivros": 0, "totalExemplares": 0, "totalGrupos": 0}}

        if agrupador == "genero":
            tabela_vinculo, tabela_grupo, campo_id, campo_nome = "LivroGenero", "Genero", "idGenero", "genNome"
        elif agrupador == "autor":
            tabela_vinculo, tabela_grupo, campo_id, campo_nome = "LivroAutor", "Autor", "idAutor", "autNome"
        elif agrupador == "editora":
            tabela_vinculo = None  # Editora é FK direta em Livro, não tabela de vínculo N:N
        elif agrupador == "ano_publicacao":
            tabela_vinculo = None
        else:
            agrupador = "categoria"
            tabela_vinculo, tabela_grupo, campo_id, campo_nome = "LivroCategoria", "Categoria", "idCategoria", "catNome"

        if agrupador == "editora":
            editora_ids = list({l.get("idEditora") for l in livros if l.get("idEditora")})
            consultas = [
                lambda: consultar_lote(lambda ids_lote: supabase.table('Editora').select('idEditora, ediNome').in_('idEditora', ids_lote), 'Editora', editora_ids)
                if editora_ids else None,
                lambda: consultar_lote(lambda ids_lote: supabase.table('Exemplar').select('idLivro, exeLivStatus').in_('idLivro', ids_lote), 'Exemplar', livro_ids),
            ]
            resp_editoras, resp_exemplares = executar_em_paralelo(*consultas)
            editora_nome_map = {e["idEditora"]: e.get("ediNome", "Sem nome") for e in ((resp_editoras.data or []) if resp_editoras else [])}
            grupos_por_livro = {
                l["idLivro"]: [(l.get("idEditora"), editora_nome_map.get(l.get("idEditora"), "Sem nome"))]
                for l in livros if l.get("idEditora")
            }
        elif agrupador == "ano_publicacao":
            resp_exemplares, = executar_em_paralelo(
                lambda: consultar_lote(lambda ids_lote: supabase.table('Exemplar').select('idLivro, exeLivStatus').in_('idLivro', ids_lote), 'Exemplar', livro_ids),
            )
            grupos_por_livro = {
                l["idLivro"]: [(l.get("livAnoPublicacao"), str(l["livAnoPublicacao"]) if l.get("livAnoPublicacao") else "Sem ano")]
                for l in livros
            }
        else:
            consultas = [
                lambda: consultar_lote(lambda ids_lote:supabase.table(tabela_vinculo).select(f"idLivro, {tabela_grupo}({campo_id}, {campo_nome})").in_("idLivro", ids_lote),tabela_vinculo,livro_ids),
                lambda: consultar_lote(lambda ids_lote: supabase.table('Exemplar').select('idLivro, exeLivStatus').in_('idLivro', ids_lote), 'Exemplar', livro_ids),
            ]
            resp_vinculo, resp_exemplares = executar_em_paralelo(*consultas)

            vinculos = resp_vinculo.data or []

            # nome do grupo por livro (um livro pode ter só 1 categoria/gênero hoje,
            # mas o vínculo é N:N, então tratamos como lista)
            grupos_por_livro = {}
            for v in vinculos:
                grupo = v.get(tabela_grupo)
                if not grupo:
                    continue
                lid = v.get("idLivro")
                grupos_por_livro.setdefault(lid, []).append(
                    (grupo.get(campo_id), grupo.get(campo_nome, "Sem nome"))
                )

        exemplares = resp_exemplares.data or []

        # quantos exemplares de cada status cada livro tem
        STATUS_CHAVES = {
            "disponível": "disponiveis",
            "emprestado": "emprestados",
            "reservado": "reservados",
            "indisponível": "indisponiveis",
            "tombo fixo": "tomboFixo",
        }
        exemplares_por_livro = {}
        status_por_livro = {}  # idLivro -> {"disponiveis": n, "emprestados": n, ...}
        for ex in exemplares:
            lid = ex.get("idLivro")
            exemplares_por_livro[lid] = exemplares_por_livro.get(lid, 0) + 1
            chave = STATUS_CHAVES.get((ex.get("exeLivStatus") or "").lower())
            if chave:
                bucket = status_por_livro.setdefault(lid, {})
                bucket[chave] = bucket.get(chave, 0) + 1
        disponiveis_por_livro = {lid: b.get("disponiveis", 0) for lid, b in status_por_livro.items()}

        nome_sem_grupo = {
            "categoria": "Sem categoria",
            "genero": "Sem gênero",
            "autor": "Sem autor",
            "editora": "Sem editora",
            "ano_publicacao": "Sem ano",
        }[agrupador]

        # agregados agrupados por id do grupo (None = bucket "sem categoria/gênero"),
        # guardando também os idLivro de cada grupo para permitir consultar os
        # títulos depois (ver /relatorios/acervo/titulos)
        agregados = {}  # id_grupo -> {"nome": str, "livros": set(idLivro), "exemplares": int, status...: int}

        for lid in livro_ids:
            pares = grupos_por_livro.get(lid) or [(None, nome_sem_grupo)]
            for id_grupo, nome in pares:
                bucket = agregados.setdefault(id_grupo, {
                    "nome": nome, "livros": set(), "exemplares": 0,
                    "disponiveis": 0, "emprestados": 0, "reservados": 0,
                    "indisponiveis": 0, "tomboFixo": 0,
                })
                bucket["livros"].add(lid)
                bucket["exemplares"] += exemplares_por_livro.get(lid, 0)
                status_livro = status_por_livro.get(lid, {})
                for chave in ("disponiveis", "emprestados", "reservados", "indisponiveis", "tomboFixo"):
                    bucket[chave] += status_livro.get(chave, 0)

        itens = [
            {
                "idGrupo": id_grupo,
                "grupo": dados["nome"],
                "quantidadeLivros": len(dados["livros"]),
                "quantidadeExemplares": dados["exemplares"],
                "quantidadeDisponiveis": dados["disponiveis"],
                "quantidadeEmprestados": dados["emprestados"],
                "quantidadeReservados": dados["reservados"],
                "quantidadeIndisponiveis": dados["indisponiveis"] + dados["tomboFixo"],
                "idLivros": sorted(dados["livros"]),
            }
            for id_grupo, dados in agregados.items()
        ]

        # Por padrão ordena pela quantidade de títulos (maior primeiro), mas
        # para "ano de publicação" faz mais sentido ordenar cronologicamente
        # (do mais antigo pro mais novo) — ajuda a identificar acervo antigo
        # / candidato a descarte.
        if agrupador == "ano_publicacao":
            itens.sort(key=lambda i: (i["idGrupo"] is None, i["idGrupo"] or 0))
        else:
            itens.sort(key=lambda i: i["quantidadeLivros"], reverse=True)

        resumo = {
            "totalLivros": len(livro_ids),
            "totalExemplares": sum(exemplares_por_livro.values()),
            "totalGrupos": len(itens),
        }

        return {"itens": itens, "resumo": resumo, "agrupador": agrupador}
    except Exception as e:
        raise HTTPException(503,'Serviço temporariamente indisponível') from e


@router.get("/relatorios/acervo/exemplares")
def relatorio_acervo_exemplares(
    status: Optional[str] = None,          # Disponível | Emprestado | Reservado | Indisponível | Tombo Fixo
    anoMax: Optional[int] = None,           # só livros publicados até esse ano (candidatos a descarte)
    ordenarPor: Optional[str] = "titulo",   # titulo | ano_publicacao | tombo
    admin=Depends(get_admin),
):
    """Lista plana de exemplares (cópias físicas), um por linha — cobre o
    'acervo completo', filtro por status (inclui a categoria 'Indisponível',
    usada para exemplares extraviados/danificados/baixados) e candidatos a
    descarte por ano de publicação."""
    try:
        consulta_livros = (
            supabase.table("Livro")
            .select("idLivro, livTitulo, livISBN, livAnoPublicacao, livAtivo")
            .eq("livAtivo", True)
        )
        if anoMax is not None:
            consulta_livros = consulta_livros.lte("livAnoPublicacao", anoMax)
        livros = consultar_completo(lambda:consulta_livros,'Livro').data

        livro_ids = [l["idLivro"] for l in livros]
        if not livro_ids:
            return {"itens": [], "resumo": {}}

        livro_map = {l["idLivro"]: l for l in livros}

        query = supabase.table("Exemplar").select("idExemplar, idLivro, exeLivTombo, exeLivStatus").in_("idLivro", livro_ids)
        if status:
            query = query.eq("exeLivStatus", status)
        exemplares = consultar_completo(lambda:query,'Exemplar').data

        itens = []
        resumo_status = {}
        for ex in exemplares:
            livro = livro_map.get(ex.get("idLivro"))
            if not livro:
                continue
            st = ex.get("exeLivStatus") or "Sem status"
            resumo_status[st] = resumo_status.get(st, 0) + 1
            itens.append({
                "idLivro": livro["idLivro"],
                "titulo": livro.get("livTitulo", "-"),
                "isbn": livro.get("livISBN") or "-",
                "anoPublicacao": livro.get("livAnoPublicacao"),
                "tombo": ex.get("exeLivTombo") or "-",
                "status": st,
            })

        chave_ordenacao = {
            "ano_publicacao": lambda i: (i["anoPublicacao"] is None, i["anoPublicacao"] or 0),
            "tombo": lambda i: i["tombo"] or "",
        }.get(ordenarPor, lambda i: (i["titulo"] or "").lower())
        itens.sort(key=chave_ordenacao)

        return {
            "itens": itens,
            "resumo": {"totalExemplares": len(itens), "porStatus": resumo_status},
        }
    except Exception as e:
        raise HTTPException(503,'Serviço temporariamente indisponível') from e


@router.get("/relatorios/acervo/titulos")
def relatorio_acervo_titulos(
    ids: str,  # idLivro separados por vírgula, ex.: "3,7,12"
    admin=Depends(get_admin),
):
    """Detalha os títulos de um grupo específico (categoria ou gênero) do
    relatório de acervo — usado pelo modal que abre ao clicar no nome do grupo."""
    try:
        livro_ids = [int(i) for i in ids.split(",") if i.strip().isdigit()]
        if not livro_ids:
            return {"itens": []}

        consultas = [
            lambda: consultar_lote(lambda ids_lote: supabase.table('Livro').select('idLivro, livTitulo, livISBN').in_('idLivro', ids_lote), 'Livro', livro_ids),
            lambda: consultar_lote(lambda ids_lote: supabase.table('LivroAutor').select('idLivro, Autor(autNome)').in_('idLivro', ids_lote), 'LivroAutor', livro_ids),
            lambda: consultar_lote(lambda ids_lote: supabase.table('Exemplar').select('idLivro, exeLivStatus').in_('idLivro', ids_lote), 'Exemplar', livro_ids),
        ]
        resp_livros, resp_autores, resp_exemplares = executar_em_paralelo(*consultas)

        livros = resp_livros.data or []
        autores = resp_autores.data or []
        exemplares = resp_exemplares.data or []

        autores_por_livro = {}
        for a in autores:
            autor = a.get("Autor")
            if not autor:
                continue
            autores_por_livro.setdefault(a["idLivro"], []).append(autor.get("autNome", "-"))

        exemplares_por_livro = {}
        disponiveis_por_livro = {}
        for ex in exemplares:
            lid = ex.get("idLivro")
            exemplares_por_livro[lid] = exemplares_por_livro.get(lid, 0) + 1
            if (ex.get("exeLivStatus") or "").lower() == "disponível":
                disponiveis_por_livro[lid] = disponiveis_por_livro.get(lid, 0) + 1

        itens = [
            {
                "idLivro": l["idLivro"],
                "titulo": l.get("livTitulo", "-"),
                "isbn": l.get("livISBN") or "-",
                "autores": ", ".join(autores_por_livro.get(l["idLivro"], [])) or "-",
                "quantidadeExemplares": exemplares_por_livro.get(l["idLivro"], 0),
                "quantidadeDisponiveis": disponiveis_por_livro.get(l["idLivro"], 0),
            }
            for l in livros
        ]
        itens.sort(key=lambda i: i["titulo"])

        return {"itens": itens}
    except Exception as e:
        raise HTTPException(503,'Serviço temporariamente indisponível') from e
