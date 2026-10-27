"""Consulta paginada dos títulos associados a um cadastro auxiliar."""

from database import supabase


def listar_livros_vinculados(tabela, campo, identificador, pagina, tamanho=20):
    inicio = (pagina - 1) * tamanho
    resultado = (
        supabase.table(tabela)
        .select("idLivro", count="exact")
        .eq(campo, identificador)
        .order("idLivro")
        .range(inicio, inicio + tamanho - 1)
        .execute()
    )
    ids = [vinculo["idLivro"] for vinculo in (resultado.data or [])]
    livros = []
    if ids:
        resposta = (
            supabase.table("Livro")
            .select("idLivro,livTitulo,livAtivo")
            .in_("idLivro", ids)
            .execute()
        )
        por_id = {livro["idLivro"]: livro for livro in (resposta.data or [])}
        livros = [por_id[id_livro] for id_livro in ids if id_livro in por_id]
    return {"livros": livros, "total": resultado.count or 0, "pagina": pagina}
