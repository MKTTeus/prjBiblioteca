from fastapi import APIRouter, Depends, HTTPException, UploadFile, File

from database import supabase
from core import get_admin, hash_password, normalize_email, parse_status, get_optional_user, verify_password, validar_cpf, normalize_cpf
from schemas import UsuarioCreate, UsuarioUpdate, BatchIds, BatchStatus
from routers.ano_letivo import get_ano_letivo_atual
import io
import openpyxl
import csv
from pydantic import BaseModel
from typing import Optional as Opt

router = APIRouter()


def _parse_upload(contents: bytes, filename: str) -> list[dict]:
    """Retorna lista de dicts com as linhas do arquivo (xlsx ou csv)."""
    if filename.lower().endswith(".csv"):
        text = contents.decode("utf-8-sig")
        reader = csv.DictReader(io.StringIO(text))
        return [
            {k.strip().lower(): (v.strip() if v else "") for k, v in row.items()}
            for row in reader
        ]
    else:
        wb = openpyxl.load_workbook(io.BytesIO(contents))
        ws = wb.active
        headers = [str(c.value).strip().lower() if c.value else "" for c in ws[1]]
        rows = []
        for row in ws.iter_rows(min_row=2, values_only=True):
            rows.append({headers[i]: (str(v).strip() if v is not None else "") for i, v in enumerate(row)})
        return rows


# ── ALUNOS ────────────────────────────────────────────────────────

@router.get("/alunos")
def listar_alunos(admin=Depends(get_admin)):
    resp = supabase.table("Usuario").select("*").eq("usuTipo", "Aluno").eq("usuExcluido", False).order("usuNome").execute()
    return resp.data or []


@router.post("/alunos")
def criar_aluno(data: UsuarioCreate, admin=Depends(get_admin)):
    email = normalize_email(data.email)

    email_existe_admin = supabase.table("Administrador").select("*").eq("admEmail", email).execute()
    if email_existe_admin.data:
        raise HTTPException(status_code=400, detail="Email já cadastrado como administrador")

    exist = supabase.table("Usuario").select("*").eq("usuEmail", email).eq("usuExcluido", False).execute()
    if exist.data:
        usuario = exist.data[0]
        if usuario.get("usuStatus") == True:
            raise HTTPException(status_code=400, detail="Aluno já existe")
        raise HTTPException(status_code=409, detail="USUARIO_INATIVO")

    novo = {
        "usuNome": data.nome,
        "usuEmail": email,
        "usuSenha": hash_password(data.senha),
        "usuTelefone": data.telefone,
        "usuTelefoneResponsavel": data.telefoneResponsavel,
        "usuEndereco": data.endereco,
        "usuRA": data.ra,
        "usuSerie": data.serie,
        "usuTurma": data.turma,
        "usuAnoLetivo": get_ano_letivo_atual(),
        "usuFormado": False,
        "usuTipo": "Aluno",
        "usuStatus": parse_status(data.status),
        "usuExcluido": False,
    }
    criado = supabase.table("Usuario").insert(novo).execute()
    if not criado.data:
        raise HTTPException(status_code=500, detail="Falha ao criar aluno")
    return criado.data[0]


@router.post("/alunos/reativar")
def reativar_aluno(data: UsuarioCreate, admin=Depends(get_admin)):
    email = normalize_email(data.email)
    exist = supabase.table("Usuario").select("*").eq("usuEmail", email).eq("usuExcluido", False).execute()
    if not exist.data:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    usuario = exist.data[0]
    payload = {
        "usuNome": data.nome,
        "usuSenha": hash_password(data.senha),
        "usuTelefone": data.telefone,
        "usuTelefoneResponsavel": data.telefoneResponsavel,
        "usuEndereco": data.endereco,
        "usuRA": data.ra,
        "usuSerie": data.serie,
        "usuTurma": data.turma,
        "usuAnoLetivo": get_ano_letivo_atual(),
        "usuFormado": False,
        "usuStatus": True,
    }
    reativado = supabase.table("Usuario").update(payload).eq("idUsuario", usuario["idUsuario"]).execute()
    if not reativado.data:
        raise HTTPException(status_code=500, detail="Falha ao reativar usuário no banco de dados")
    return reativado.data[0]


@router.post("/alunos/importar")
async def importar_alunos(file: UploadFile = File(...), admin=Depends(get_admin)):
    contents = await file.read()
    linhas = _parse_upload(contents, file.filename)
    resultados = {"importados": 0, "ignorados": 0, "erros": []}
    ano_letivo = get_ano_letivo_atual()

    for i, dados in enumerate(linhas, start=2):
        nome  = dados.get("nome", "").strip()
        email = dados.get("email", "").strip().lower()
        ra    = dados.get("ra", "").strip()
        serie = dados.get("serie", "").strip()
        turma = dados.get("turma", "").strip()

        if not nome or not email:
            resultados["erros"].append(f"Linha {i}: nome e email são obrigatórios")
            resultados["ignorados"] += 1
            continue

        existe_email = supabase.table("Usuario").select("idUsuario").eq("usuEmail", email).eq("usuExcluido", False).execute()
        if existe_email.data:
            resultados["erros"].append(f"Linha {i}: email '{email}' já cadastrado")
            resultados["ignorados"] += 1
            continue

        if ra:
            existe_ra = supabase.table("Usuario").select("idUsuario").eq("usuRA", ra).eq("usuExcluido", False).execute()
            if existe_ra.data:
                resultados["erros"].append(f"Linha {i}: RA '{ra}' já cadastrado")
                resultados["ignorados"] += 1
                continue

        novo = {
            "usuNome": nome,
            "usuEmail": email,
            "usuSenha": hash_password("mudar@123"),
            "usuTelefone": dados.get("telefone", ""),
            "usuTelefoneResponsavel": dados.get("telefone_responsavel", ""),
            "usuEndereco": dados.get("endereco", ""),
            "usuRA": ra,
            "usuSerie": serie or None,
            "usuTurma": turma or None,
            "usuAnoLetivo": ano_letivo,
            "usuFormado": False,
            "usuTipo": "Aluno",
            "usuStatus": True,
            "usuExcluido": False,
        }
        try:
            supabase.table("Usuario").insert(novo).execute()
            resultados["importados"] += 1
        except Exception as e:
            resultados["erros"].append(f"Linha {i}: erro ao inserir — {str(e)}")
            resultados["ignorados"] += 1

    return resultados


@router.post("/alunos/batch/excluir")
def excluir_alunos_lote(data: BatchIds, admin=Depends(get_admin)):
    if not data.ids:
        raise HTTPException(status_code=400, detail="Nenhum ID informado")
    for id in data.ids:
        supabase.table("Usuario").update({"usuExcluido": True}).eq("idUsuario", id).eq("usuTipo", "Aluno").execute()
    return {"message": f"{len(data.ids)} aluno(s) excluído(s) com sucesso"}


@router.post("/alunos/batch/status")
def atualizar_status_lote(data: BatchStatus, admin=Depends(get_admin)):
    if not data.ids:
        raise HTTPException(status_code=400, detail="Nenhum ID informado")
    for id in data.ids:
        supabase.table("Usuario").update({"usuStatus": data.status}).eq("idUsuario", id).eq("usuTipo", "Aluno").execute()
    return {"message": f"{len(data.ids)} aluno(s) atualizados com sucesso"}

@router.put("/alunos/{idUsuario}")
def atualizar_aluno(idUsuario: int, data: UsuarioUpdate, admin=Depends(get_admin)):
    resp = supabase.table("Usuario").select("*").eq("idUsuario", idUsuario).eq("usuExcluido", False).execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")

    payload = {}
    if data.nome is not None:
        payload["usuNome"] = data.nome
    if data.email is not None:
        payload["usuEmail"] = normalize_email(data.email)
    if data.senha is not None:
        payload["usuSenha"] = hash_password(data.senha)
    if data.telefone is not None:
        payload["usuTelefone"] = data.telefone
    if data.telefoneResponsavel is not None:
        payload["usuTelefoneResponsavel"] = data.telefoneResponsavel
    if data.endereco is not None:
        payload["usuEndereco"] = data.endereco
    if data.ra is not None:
        payload["usuRA"] = data.ra
    if data.serie is not None:
        payload["usuSerie"] = data.serie
    if data.turma is not None:
        payload["usuTurma"] = data.turma
    if data.status is not None:
        payload["usuStatus"] = parse_status(data.status)

    if not payload:
        raise HTTPException(status_code=400, detail="Nenhum campo para atualizar")

    atual = supabase.table("Usuario").update(payload).eq("idUsuario", idUsuario).execute()
    if not atual.data:
        raise HTTPException(status_code=500, detail="Falha ao atualizar aluno")
    return atual.data[0]


@router.delete("/alunos/{idUsuario}")
def deletar_aluno(idUsuario: int, admin=Depends(get_admin)):
    supabase.table("Usuario").update({"usuExcluido": True}).eq("idUsuario", idUsuario).eq("usuTipo", "Aluno").execute()
    return {"message": "Aluno excluído com sucesso"}

# ── COMUNIDADE ────────────────────────────────────────────────────

@router.get("/comunidade")
def listar_comunidade(admin=Depends(get_admin)):
    resp = supabase.table("Usuario").select("*").eq("usuTipo", "Comunidade").eq("usuExcluido", False).order("usuNome").execute()
    return resp.data or []


@router.post("/comunidade")
def criar_comunidade(data: UsuarioCreate, admin=Depends(get_admin)):
    cpf = normalize_cpf(data.cpf)
    if not validar_cpf(cpf):
        raise HTTPException(status_code=400, detail="CPF inválido")

    email_existe_admin = supabase.table("Administrador").select("*").eq("admEmail", data.email).execute()
    if email_existe_admin.data:
        raise HTTPException(status_code=400, detail="Email já cadastrado como administrador")

    exist = supabase.table("Usuario").select("*").eq("usuEmail", data.email).eq("usuExcluido", False).execute()
    if exist.data:
        usuario = exist.data[0]
        if usuario.get("usuStatus") == True:
            raise HTTPException(status_code=400, detail="Membro já existe")
        raise HTTPException(status_code=409, detail="USUARIO_INATIVO")

    cpf_existe = supabase.table("Usuario").select("idUsuario").eq("usuCPF", cpf).eq("usuExcluido", False).execute()
    if cpf_existe.data:
        raise HTTPException(status_code=400, detail="CPF já cadastrado")

    novo = {
        "usuNome": data.nome,
        "usuEmail": data.email,
        "usuSenha": hash_password(data.senha),
        "usuTelefone": data.telefone,
        "usuTelefoneResponsavel": data.telefoneResponsavel,
        "usuEndereco": data.endereco,
        "usuCPF": cpf,
        "usuTipo": "Comunidade",
        "usuStatus": parse_status(data.status),
        "usuExcluido": False,
    }
    criado = supabase.table("Usuario").insert(novo).execute()
    if not criado.data:
        raise HTTPException(status_code=500, detail="Falha ao criar membro")
    return criado.data[0]


@router.post("/comunidade/reativar")
def reativar_comunidade(data: UsuarioCreate, admin=Depends(get_admin)):
    cpf = normalize_cpf(data.cpf)
    if not validar_cpf(cpf):
        raise HTTPException(status_code=400, detail="CPF inválido")

    email = normalize_email(data.email)
    exist = supabase.table("Usuario").select("*").eq("usuEmail", email).eq("usuExcluido", False).execute()
    if not exist.data:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    usuario = exist.data[0]

    cpf_existe = (
        supabase.table("Usuario")
        .select("idUsuario")
        .eq("usuCPF", cpf)
        .eq("usuExcluido", False)
        .neq("idUsuario", usuario["idUsuario"])
        .execute()
    )
    if cpf_existe.data:
        raise HTTPException(status_code=400, detail="CPF já cadastrado")

    payload = {
        "usuNome": data.nome,
        "usuEmail": data.email,
        "usuSenha": hash_password(data.senha),
        "usuTelefone": data.telefone,
        "usuTelefoneResponsavel": data.telefoneResponsavel,
        "usuEndereco": data.endereco,
        "usuCPF": cpf,
        "usuTipo": "Comunidade",
        "usuStatus": True,
        # Ex-aluno retornando como comunidade: limpa os dados acadêmicos
        "usuSerie": None,
        "usuTurma": None,
        "usuAnoLetivo": None,
        "usuFormado": False,
    }
    reativado = supabase.table("Usuario").update(payload).eq("idUsuario", usuario["idUsuario"]).execute()
    if not reativado.data:
        raise HTTPException(status_code=500, detail="Falha ao reativar usuário no banco de dados")
    return reativado.data[0]


@router.post("/comunidade/importar")
async def importar_comunidade(file: UploadFile = File(...), admin=Depends(get_admin)):
    contents = await file.read()
    linhas = _parse_upload(contents, file.filename)
    resultados = {"importados": 0, "ignorados": 0, "erros": []}
    cpfs_vistos = set()

    for i, dados in enumerate(linhas, start=2):
        nome  = dados.get("nome", "").strip()
        email = dados.get("email", "").strip().lower()
        cpf   = normalize_cpf(dados.get("cpf", ""))

        if not nome or not email:
            resultados["erros"].append(f"Linha {i}: nome e email são obrigatórios")
            resultados["ignorados"] += 1
            continue

        if cpf and not validar_cpf(cpf):
            resultados["erros"].append(f"Linha {i}: CPF '{cpf}' inválido")
            resultados["ignorados"] += 1
            continue

        if cpf and cpf in cpfs_vistos:
            resultados["erros"].append(f"Linha {i}: CPF '{cpf}' duplicado no arquivo")
            resultados["ignorados"] += 1
            continue

        existe_email = supabase.table("Usuario").select("idUsuario").eq("usuEmail", email).eq("usuExcluido", False).execute()
        if existe_email.data:
            resultados["erros"].append(f"Linha {i}: email '{email}' já cadastrado")
            resultados["ignorados"] += 1
            continue

        if cpf:
            existe_cpf = supabase.table("Usuario").select("idUsuario").eq("usuCPF", cpf).eq("usuExcluido", False).execute()
            if existe_cpf.data:
                resultados["erros"].append(f"Linha {i}: CPF '{cpf}' já cadastrado")
                resultados["ignorados"] += 1
                continue

        novo = {
            "usuNome": nome,
            "usuEmail": email,
            "usuSenha": hash_password("mudar@123"),
            "usuTelefone": dados.get("telefone", ""),
            "usuTelefoneResponsavel": dados.get("telefone_responsavel", ""),
            "usuEndereco": dados.get("endereco", ""),
            "usuCPF": cpf,
            "usuTipo": "Comunidade",
            "usuStatus": True,
            "usuExcluido": False,
        }
        try:
            supabase.table("Usuario").insert(novo).execute()
            resultados["importados"] += 1
            if cpf:
                cpfs_vistos.add(cpf)
        except Exception as e:
            resultados["erros"].append(f"Linha {i}: erro ao inserir — {str(e)}")
            resultados["ignorados"] += 1

    return resultados


@router.post("/comunidade/batch/excluir")
def excluir_comunidade_lote(data: BatchIds, admin=Depends(get_admin)):
    if not data.ids:
        raise HTTPException(status_code=400, detail="Nenhum ID informado")
    for id in data.ids:
        supabase.table("Usuario").update({"usuExcluido": True}).eq("idUsuario", id).eq("usuTipo", "Comunidade").execute()
    return {"message": f"{len(data.ids)} membro(s) excluído(s) com sucesso"}


@router.post("/comunidade/batch/status")
def atualizar_status_comunidade_lote(data: BatchStatus, admin=Depends(get_admin)):
    if not data.ids:
        raise HTTPException(status_code=400, detail="Nenhum ID informado")
    for id in data.ids:
        supabase.table("Usuario").update({"usuStatus": data.status}).eq("idUsuario", id).eq("usuTipo", "Comunidade").execute()
    return {"message": f"{len(data.ids)} membro(s) atualizados com sucesso"}

@router.put("/comunidade/{idUsuario}")
def atualizar_comunidade(idUsuario: int, data: UsuarioUpdate, admin=Depends(get_admin)):
    resp = supabase.table("Usuario").select("*").eq("idUsuario", idUsuario).eq("usuExcluido", False).execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Membro não encontrado")

    payload = {}
    if data.nome is not None:
        payload["usuNome"] = data.nome
    if data.email is not None:
        payload["usuEmail"] = normalize_email(data.email)
    if data.senha is not None:
        payload["usuSenha"] = hash_password(data.senha)
    if data.telefone is not None:
        payload["usuTelefone"] = data.telefone
    if data.telefoneResponsavel is not None:
        payload["usuTelefoneResponsavel"] = data.telefoneResponsavel
    if data.endereco is not None:
        payload["usuEndereco"] = data.endereco
    if data.cpf is not None:
        payload["usuCPF"] = data.cpf
    if data.status is not None:
        payload["usuStatus"] = parse_status(data.status)

    if not payload:
        raise HTTPException(status_code=400, detail="Nenhum campo para atualizar")

    atual = supabase.table("Usuario").update(payload).eq("idUsuario", idUsuario).execute()
    if not atual.data:
        raise HTTPException(status_code=500, detail="Falha ao atualizar membro")
    return atual.data[0]


@router.delete("/comunidade/{idUsuario}")
def deletar_comunidade(idUsuario: int, admin=Depends(get_admin)):
    supabase.table("Usuario").update({"usuExcluido": True}).eq("idUsuario", idUsuario).eq("usuTipo", "Comunidade").execute()
    return {"message": "Membro da comunidade excluído com sucesso"}


# ── PERFIL DO PRÓPRIO USUÁRIO ─────────────────────────────────────


class PerfilUpdate(BaseModel):
    telefone:             Opt[str] = None
    telefoneResponsavel:  Opt[str] = None
    endereco:             Opt[str] = None
    senhaAtual:           Opt[str] = None
    novaSenha:            Opt[str] = None

@router.get("/usuario/me")
def get_perfil(user=Depends(get_optional_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Não autenticado")
    resp = supabase.table("Usuario").select("*").eq("usuEmail", user["sub"]).execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    u = resp.data[0]
    return {
        "idUsuario":            u.get("idUsuario"),
        "nome":                 u.get("usuNome"),
        "email":                u.get("usuEmail"),
        "ra":                   u.get("usuRA"),
        "cpf":                  u.get("usuCPF"),
        "dataNascimento":       u.get("usuDataNascimento"),
        "endereco":             u.get("usuEndereco"),
        "telefone":             u.get("usuTelefone"),
        "telefoneResponsavel":  u.get("usuTelefoneResponsavel"),
        "tipo":                 u.get("usuTipo"),
    }

@router.patch("/usuario/me")
def atualizar_perfil(data: PerfilUpdate, user=Depends(get_optional_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Não autenticado")

    resp = supabase.table("Usuario").select("*").eq("usuEmail", user["sub"]).execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    u = resp.data[0]

    payload = {}

    # Contato
    if data.telefone is not None:
        payload["usuTelefone"] = data.telefone
    if data.telefoneResponsavel is not None:
        payload["usuTelefoneResponsavel"] = data.telefoneResponsavel
    if data.endereco is not None:
        payload["usuEndereco"] = data.endereco

    # Senha: exige senha atual correta
    if data.novaSenha:
        if not data.senhaAtual:
            raise HTTPException(status_code=400, detail="Informe a senha atual para trocar a senha")
        if not verify_password(data.senhaAtual, u.get("usuSenha", "")):
            raise HTTPException(status_code=400, detail="Senha atual incorreta")
        payload["usuSenha"] = hash_password(data.novaSenha)

    if not payload:
        raise HTTPException(status_code=400, detail="Nenhum campo para atualizar")

    atual = supabase.table("Usuario").update(payload).eq("idUsuario", u["idUsuario"]).execute()
    if not atual.data:
        raise HTTPException(status_code=500, detail="Falha ao atualizar perfil")

    updated = atual.data[0]
    return {
        "idUsuario":            updated.get("idUsuario"),
        "nome":                 updated.get("usuNome"),
        "email":                updated.get("usuEmail"),
        "ra":                   updated.get("usuRA"),
        "cpf":                  updated.get("usuCPF"),
        "dataNascimento":       updated.get("usuDataNascimento"),
        "endereco":             updated.get("usuEndereco"),
        "telefone":             updated.get("usuTelefone"),
        "telefoneResponsavel":  updated.get("usuTelefoneResponsavel"),
        "tipo":                 updated.get("usuTipo"),
    }