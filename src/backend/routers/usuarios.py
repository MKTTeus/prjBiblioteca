from fastapi import APIRouter, Depends, HTTPException, UploadFile, File

from database import supabase
from core import get_admin, hash_password, normalize_email, parse_status
from schemas import UsuarioCreate, UsuarioUpdate
import io
import openpyxl
import csv

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
    resp = supabase.table("Usuario").select("*").eq("usuTipo", "Aluno").order("usuNome").execute()
    return resp.data or []


@router.post("/alunos")
def criar_aluno(data: UsuarioCreate, admin=Depends(get_admin)):
    email = normalize_email(data.email)

    email_existe_admin = supabase.table("Administrador").select("*").eq("admEmail", email).execute()
    if email_existe_admin.data:
        raise HTTPException(status_code=400, detail="Email já cadastrado como administrador")

    exist = supabase.table("Usuario").select("*").eq("usuEmail", email).eq("usuStatus", True).execute()
    if exist.data:
        raise HTTPException(status_code=400, detail="Aluno já existe")

    novo = {
        "usuNome": data.nome,
        "usuEmail": email,
        "usuSenha": hash_password(data.senha),
        "usuTelefone": data.telefone,
        "usuTelefoneResponsavel": data.telefoneResponsavel,
        "usuEndereco": data.endereco,
        "usuRA": data.ra,
        "usuTipo": "Aluno",
        "usuStatus": parse_status(data.status)
    }
    criado = supabase.table("Usuario").insert(novo).execute()
    return criado.data[0]


@router.post("/alunos/importar") # importa aluno de tabela excel
async def importar_alunos(file: UploadFile = File(...), admin=Depends(get_admin)):
    contents = await file.read()
    linhas = _parse_upload(contents, file.filename)
    resultados = {"importados": 0, "ignorados": 0, "erros": []}

    for i, dados in enumerate(linhas, start=2):
        nome  = dados.get("nome", "").strip()
        email = dados.get("email", "").strip().lower()
        ra    = dados.get("ra", "").strip()

        if not nome or not email:
            resultados["erros"].append(f"Linha {i}: nome e email são obrigatórios")
            resultados["ignorados"] += 1
            continue

        existe = supabase.table("Usuario").select("idUsuario").eq("usuEmail", email).eq("usuStatus", True).execute()
        if existe.data:
            resultados["erros"].append(f"Linha {i}: email '{email}' já cadastrado")
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
            "usuTipo": "Aluno",
            "usuStatus": True,
        }
        supabase.table("Usuario").insert(novo).execute()
        resultados["importados"] += 1

    return resultados


@router.put("/alunos/{idUsuario}")
def atualizar_aluno(idUsuario: int, data: UsuarioUpdate, admin=Depends(get_admin)):
    resp = supabase.table("Usuario").select("*").eq("idUsuario", idUsuario).execute()
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
    if data.status is not None:
        payload["usuStatus"] = parse_status(data.status)

    if not payload:
        raise HTTPException(status_code=400, detail="Nenhum campo para atualizar")

    atual = supabase.table("Usuario").update(payload).eq("idUsuario", idUsuario).execute()
    return atual.data[0]


@router.delete("/alunos/{idUsuario}")
def deletar_aluno(idUsuario: int, admin=Depends(get_admin)):
    supabase.table("Usuario").update({"usuStatus": False}).eq("idUsuario", idUsuario).eq("usuTipo", "Aluno").execute()
    return {"message": "Aluno desativado com sucesso"}


# ── COMUNIDADE ────────────────────────────────────────────────────

@router.get("/comunidade")
def listar_comunidade(admin=Depends(get_admin)):
    resp = supabase.table("Usuario").select("*").eq("usuTipo", "Comunidade").order("usuNome").execute()
    return resp.data or []


@router.post("/comunidade")
def criar_comunidade(data: UsuarioCreate, admin=Depends(get_admin)):
    email_existe_admin = supabase.table("Administrador").select("*").eq("admEmail", data.email).execute()
    if email_existe_admin.data:
        raise HTTPException(status_code=400, detail="Email já cadastrado como administrador")

    exist = supabase.table("Usuario").select("*").eq("usuEmail", data.email).eq("usuStatus", True).execute()
    if exist.data:
        raise HTTPException(status_code=400, detail="Membro já existe")

    novo = {
        "usuNome": data.nome,
        "usuEmail": data.email,
        "usuSenha": hash_password(data.senha),
        "usuTelefone": data.telefone,
        "usuTelefoneResponsavel": data.telefoneResponsavel,
        "usuEndereco": data.endereco,
        "usuCPF": data.cpf,
        "usuTipo": "Comunidade",
        "usuStatus": parse_status(data.status)
    }
    criado = supabase.table("Usuario").insert(novo).execute()
    return criado.data[0]


@router.post("/comunidade/importar") # importa membro da comunidade de tabela excel 
async def importar_comunidade(file: UploadFile = File(...), admin=Depends(get_admin)):
    contents = await file.read()
    linhas = _parse_upload(contents, file.filename)
    resultados = {"importados": 0, "ignorados": 0, "erros": []}

    for i, dados in enumerate(linhas, start=2):
        nome  = dados.get("nome", "").strip()
        email = dados.get("email", "").strip().lower()
        cpf   = dados.get("cpf", "").strip()

        if not nome or not email:
            resultados["erros"].append(f"Linha {i}: nome e email são obrigatórios")
            resultados["ignorados"] += 1
            continue

        existe = supabase.table("Usuario").select("idUsuario").eq("usuEmail", email).eq("usuStatus", True).execute()
        if existe.data:
            resultados["erros"].append(f"Linha {i}: email '{email}' já cadastrado")
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
        }
        supabase.table("Usuario").insert(novo).execute()
        resultados["importados"] += 1

    return resultados


@router.put("/comunidade/{idUsuario}")
def atualizar_comunidade(idUsuario: int, data: UsuarioUpdate, admin=Depends(get_admin)):
    resp = supabase.table("Usuario").select("*").eq("idUsuario", idUsuario).execute()
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
    return atual.data[0]


@router.delete("/comunidade/{idUsuario}")
def deletar_comunidade(idUsuario: int, admin=Depends(get_admin)):
    supabase.table("Usuario").update({"usuStatus": False}).eq("idUsuario", idUsuario).eq("usuTipo", "Comunidade").execute()
    return {"message": "Membro da comunidade desativado com sucesso"}