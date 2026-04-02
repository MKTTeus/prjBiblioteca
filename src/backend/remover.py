import os
from supabase import create_client
from dotenv import load_dotenv
from pathlib import Path

# Carrega variáveis do .env
dotenv_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=dotenv_path)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# ===================== REMOVER USUÁRIO "Marcos" =====================
def remover_marcos():
    # Busca todos os usuários com nome "Marcos"
    resp = supabase.table("Aluno").select("*").eq("aluNome", "Marcos").execute()
    if not resp.data:
        print("Nenhum usuário 'Marcos' encontrado.")
        return

    for user in resp.data:
        id_aluno = user.get("idAluno") or user.get("id")
        supabase.table("Aluno").delete().eq("idAluno", id_aluno).execute()
        print(f"Usuário 'Marcos' removido: id={id_aluno}")

    print("Todos os usuários 'Marcos' foram removidos.")

if __name__ == "__main__":
    remover_marcos()
