from database import supabase
ex = supabase.table("Exemplar").select("exeLivTombo, exeLivStatus").ilike("exeLivStatus", "%Disponível%").limit(5).execute()
print("Exemplars:")
print(ex.data)

