from database import supabase
ex = supabase.table("ExemplarLivro").select("exeLivTombo, exeLivStatus").ilike("exeLivStatus", "%Disponível%").limit(5).execute()
print("Exemplars:")
print(ex.data)

