import os
from database import supabase
from datetime import datetime

def init_sample_data():
    print("Current available exemplars:")
    ex_disp = supabase.table("ExemplarLivro").select("*").ilike("exeLivStatus", "%Disponível%").execute()
    print(f"Found {len(ex_disp.data)} available exemplars")
    
    print("Initializing sample data...")
    
    # Create book if not exists (using defaults, skip FK)
    books = supabase.table("Livro").select("idLivro").limit(1).execute()
    if not books.data:
        book = supabase.table("Livro").insert({
            "livTitulo": "Teste Empréstimo",
            "livAutor": "Autor Teste"
            # defaults idCategoria=1 etc handled by DB?
        }).execute().data[0]
        book_id = book["idLivro"]
        print(f"✓ Created book ID: {book_id}")
    else:
        book_id = books.data[0]["idLivro"]
        print(f"✓ Using existing book ID: {book_id}")
    
    # Create exemplars
    exs = supabase.table("ExemplarLivro").select("idExemplar").eq("idLivro", book_id).execute()
    if len(exs.data) == 0:
        from core import gerar_tombos
        tombos = gerar_tombos(2, "T")
        for tombo in tombos:
            supabase.table("ExemplarLivro").insert({
                "idLivro": book_id,
                "exeLivTombo": tombo,
                "exeLivStatus": "Disponível"
            }).execute()
        print("✓ Created 2 available exemplars")
    else:
        # Ensure available
        for ex in exs.data:
            supabase.table("ExemplarLivro").update({"exeLivStatus": "Disponível"}).eq("idExemplar", ex["idExemplar"]).execute()
        print("✓ Ensured exemplars available")
    
# Sample admin if none
    admins = supabase.table("Administrador").select("idAdmin").limit(1).execute()
    if not admins.data:
        from core import hash_password
        hash_pwd = hash_password("admin123")
        supabase.table("Administrador").insert({
            "admNome": "Admin Teste",
            "admEmail": "admin@teste.com",
            "admSenha": hash_pwd,
            "admStatus": True
        }).execute()
        print("✓ Created sample Admin: admin@teste.com / admin123")
    else:
        print("✓ Admin exists")

    # Sample user if none
    users = supabase.table("Usuario").select("idUsuario").limit(1).execute()
    if not users.data:
        supabase.table("Usuario").insert({
            "usuNome": "Aluno Teste",
            "usuRA": "2024001",
            "usuStatus": True,
            "usuTipo": "Aluno"
        }).execute()
        print("✓ Created sample Aluno")
    
    ex_disp_final = supabase.table("ExemplarLivro").select("*").ilike("exeLivStatus", "%Disponível%").execute()
    print(f"Final available: {len(ex_disp_final.data)}")
    print("✅ Done! Refresh Emprestimos page")

if __name__ == "__main__":
    init_sample_data()

