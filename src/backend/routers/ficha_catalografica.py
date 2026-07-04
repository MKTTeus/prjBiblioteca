import json
import os
from datetime import datetime
from typing import Optional, List
import httpx
from fastapi import APIRouter, Depends, HTTPException
from google import genai
from google.genai import types
from database import supabase
from core import get_admin, executar_em_paralelo
from routers.livros import enriquecer_livros
from schemas import FichaCatalograficaUpdate

router = APIRouter()

MODEL = "gemini-2.5-flash"
def _get_client() -> genai.Client:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="GEMINI_API_KEY não configurada no servidor.",
        )
    return genai.Client(api_key=api_key)

def int_to_roman(n: int) -> str:
    val = [10, 9, 5, 4, 1]
    syb = ["X", "IX", "V", "IV", "I"]
    roman_num = ''
    i = 0
    while n > 0:
        for _ in range(n // val[i]):
            roman_num += syb[i]
            n -= val[i]
        i += 1
    return roman_num

def converter_para_abnt(nome: str) -> str:
    if not nome:
        return ""
    nome = nome.strip()
    partes = nome.split()
    if len(partes) == 1:
        return nome
    sufixos = {"filho", "junior", "neto", "sobrinho", "júnior", "neta", "sobrinha"}
    if len(partes) > 2 and partes[-1].lower() in sufixos:
        sobrenome = partes[-2] + " " + partes[-1]
        nomes_restantes = partes[:-2]
    else:
        sobrenome = partes[-1]
        nomes_restantes = partes[:-1]
    return f"{sobrenome}, {' '.join(nomes_restantes)}"

def buscar_cdd_externo(isbn: str) -> Optional[str]:
    if not isbn:
        return None
    isbn_clean = "".join(filter(str.isdigit, isbn))
    if not isbn_clean:
        return None
    try:
        url = f"https://brasilapi.com.br/api/isbn/v1/{isbn_clean}"
        with httpx.Client(timeout=3.0) as client:
            resp = client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                if "cdd" in data and data["cdd"]:
                    return str(data["cdd"])
                if "classificacao" in data and data["classificacao"]:
                    return str(data["classificacao"])
    except Exception as e:
        print("Erro ao buscar no BrasilAPI:", e)
    return None

def sugerir_cdd_ia(livro_data: dict) -> str:
    client = _get_client()
    prompt = (
        "Você é um classificador bibliográfico profissional de uma biblioteca escolar.\n"
        "Com base nos dados do livro fornecidos, sugira o código CDD (Classificação Decimal de Dewey) mais exato.\n\n"
        f"Título: {livro_data.get('livTitulo')}\n"
        f"Subtítulo: {livro_data.get('livSubtitulo') or ''}\n"
        f"Descrição: {livro_data.get('livDescricao') or ''}\n"
        f"Categoria: {livro_data.get('livCategoria') or ''}\n"
        f"Gênero: {livro_data.get('livGenero') or ''}\n"
        f"Palavras-chave: {livro_data.get('livPalavrasChave') or ''}\n\n"
        "Regras:\n"
        "- Retorne apenas o código CDD como uma string simples (ex.: 823.914 ou 005.133), sem nenhuma pontuação extra ou explicação."
    )
    try:
        resp = client.models.generate_content(
            model=MODEL,
            contents=prompt,
        )
        if resp.text:
            return resp.text.strip()
    except Exception as e:
        print("Erro Gemini sugerir_cdd_ia:", e)
    return "000"

def sugerir_assuntos_ia(livro_data: dict) -> List[str]:
    client = _get_client()
    prompt = (
        "Você é um catalogador bibliográfico profissional de uma biblioteca escolar.\n"
        "Com base nos dados do livro fornecidos, sugira de 3 a 5 assuntos (tópicos/temas de catalogação, em português) mais relevantes.\n\n"
        f"Título: {livro_data.get('livTitulo')}\n"
        f"Subtítulo: {livro_data.get('livSubtitulo') or ''}\n"
        f"Descrição: {livro_data.get('livDescricao') or ''}\n"
        f"Categoria do sistema: {livro_data.get('livCategoria') or ''}\n"
        f"Gênero do sistema: {livro_data.get('livGenero') or ''}\n"
        f"Palavras-chave: {livro_data.get('livPalavrasChave') or ''}\n\n"
        "Regras:\n"
        "- Priorize as categorias, gêneros e palavras-chave já existentes.\n"
        "- Responda APENAS com um array JSON de strings contendo de 3 a 5 assuntos (ex.: [\"Fantasia\", \"Literatura inglesa\", \"Magia\"]), sem texto explicativo."
    )
    try:
        resp = client.models.generate_content(
            model=MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            )
        )
        if resp.text:
            items = json.loads(resp.text)
            if isinstance(items, list):
                return [str(i).strip().capitalize() for i in items[:5]]
    except Exception as e:
        print("Erro Gemini sugerir_assuntos_ia:", e)
    fallback = []
    if livro_data.get("livCategoria"):
        fallback.append(livro_data["livCategoria"])
    if livro_data.get("livGenero"):
        fallback.append(livro_data["livGenero"])
    if livro_data.get("livPalavrasChave"):
        pcs = [x.strip() for x in livro_data["livPalavrasChave"].split(",")]
        fallback.extend(pcs)
    return [x.capitalize() for x in fallback[:5]] if fallback else ["Geral"]

def formatar_ficha_html(
    autor_abnt: str,
    titulo: str,
    publicacao: str,
    descricao_fisica: str,
    isbn: str,
    assuntos: List[str],
    entradas: List[str],
    cdd: str
) -> str:
    assuntos_html = ""
    for i, ass in enumerate(assuntos, 1):
        assuntos_html += f"{i}. {ass}. "
    entradas_html = " ".join(entradas)
    # Quando a entrada é pelo título (mais de 3 autores), não há linha de
    # autor no topo da ficha.
    autor_html = (
        f'<div style="font-weight: bold; margin-bottom: 12px;">{autor_abnt}</div>'
        if autor_abnt else ""
    )
    # ISBN e a linha de assuntos/entradas voltam para a margem da 1ª letra do
    # sobrenome do autor (sem indentação). Só o bloco título / publicação /
    # descrição física fica recuado, com o título iniciando abaixo da 4ª
    # letra do sobrenome (hanging indent) — conforme a NBR 14724/2005.
    isbn_block = f'<div class="ficha-item" style="margin-bottom: 12px;">{isbn}</div>' if isbn else ''
    html = f"""
<style>
  /* Tamanho padrão da ficha catalográfica impressa: 7,5 cm x 12,5 cm
     (NBR 14724/2005), aplicado só na impressão para não prejudicar a
     legibilidade da pré-visualização em tela. */
  @media print {{
    .ficha-catalografica-container {{
      width: 12.5cm;
      height: 7.5cm;
      max-width: 12.5cm;
      max-height: 7.5cm;
      font-size: 8pt;
      line-height: 1.3;
      padding: 0.35cm;
      margin: 0;
      overflow: hidden;
      box-shadow: none;
      border-radius: 0;
    }}
  }}
</style>
<div class="ficha-catalografica-container" style="border: 2px solid var(--surface-border, #333); padding: 25px; font-family: 'Courier New', Courier, monospace; font-size: 13.5px; line-height: 1.6; max-width: 550px; margin: 15px auto; background-color: var(--surface-bg, #fff); color: var(--text-default, #111); border-radius: 8px; box-shadow: var(--shadow-soft, 0 4px 12px rgba(0,0,0,0.1));">
  {autor_html}
  <div style="margin-left: 30px; text-indent: -15px; margin-bottom: 8px; text-align: justify;">
    {titulo}
  </div>
  <div style="margin-left: 30px; margin-bottom: 8px; text-align: justify;">
    {publicacao}
  </div>
  <div style="margin-left: 30px; margin-bottom: 12px;">
    {descricao_fisica}
  </div>
  {isbn_block}
  <div style="margin-bottom: 12px; text-align: justify;">
    {assuntos_html} {entradas_html}
  </div>
  <div style="font-weight: bold; margin-top: 15px;">
    CDD {cdd}
  </div>
</div>
"""
    return html.strip()

@router.get("/livros/{idLivro}/ficha-catalografica")
def obter_ficha_catalografica(idLivro: int):
    # Buscar ficha catalográfica no banco
    ficha_resp = supabase.table("FichaCatalografica").select("*").eq("idLivro", idLivro).execute()
    if not ficha_resp.data:
        raise HTTPException(
            status_code=404,
            detail="Ficha catalográfica não cadastrada para este livro."
        )
    ficha = ficha_resp.data[0]
    # Buscar livro e enriquecer
    livro_resp = supabase.table("Livro").select("*").eq("idLivro", idLivro).execute()
    if not livro_resp.data:
        raise HTTPException(status_code=404, detail="Livro não encontrado.")
    livro = enriquecer_livros(livro_resp.data)[0]
    # Resolver autores
    autores_resp = supabase.table("LivroAutor").select("idLivro, Autor(idAutor, autNome, autABNT)").eq("idLivro", idLivro).execute()
    autores_list = []
    if autores_resp.data:
        for r in autores_resp.data:
            if r.get("Autor"):
                autores_list.append(r["Autor"])
    autor_principal = autores_list[0] if autores_list else None
    autor_abnt = ""
    if autor_principal and len(autores_list) <= 3:
        autor_abnt = autor_principal.get("autABNT") or converter_para_abnt(autor_principal["autNome"])
    # Reconstruir fichaJson
    assuntos = []
    linhas = [l.strip() for l in ficha["ficTexto"].split("\n") if l.strip()]
    for linha in linhas:
        if len(linha) > 2 and linha[0].isdigit() and linha[1] == ".":
            partes = linha.split(".", 1)
            if len(partes) > 1:
                assuntos.append(partes[1].strip().rstrip("."))
    entradas_secundarias = []
    for linha in linhas:
        if "I." in linha or "II." in linha:
            entradas_secundarias.append(linha)
    ficha_json = {
        "autorPrincipalABNT": autor_abnt,
        "titulo": livro["livTitulo"] + (f" : {livro['livSubtitulo']}" if livro.get("livSubtitulo") else ""),
        "publicacao": f"{livro.get('ediCidade') or '[S.l.]'} : {livro.get('livEditora') or '[s.n.]'}, {livro.get('livAnoPublicacao') or '[s.d.]'}.",
        "descricaoFisica": f"{livro.get('livPaginas')} p." + (f" : il." if livro.get("livIlustrado") else "") + (f" ; {livro.get('livAlturaCm')} cm." if livro.get("livAlturaCm") else ""),
        "isbn": f"ISBN {livro['livISBN']}" if livro.get("livISBN") else "",
        "assuntos": assuntos,
        "entradasSecundarias": entradas_secundarias,
        "cdd": ficha["ficCDD"]
    }
    return {
        "fichaTexto": ficha["ficTexto"],
        "fichaHtml": ficha["ficHtml"],
        "fichaJson": ficha_json,
        "geradaPorIA": ficha["ficGeradaPorIA"],
        "classificacaoSugerida": ficha["ficCDDOrigem"] == "ia"
    }
    
@router.post("/livros/{idLivro}/ficha-catalografica/gerar")
def gerar_ficha_catalografica(idLivro: int, admin=Depends(get_admin)):
    livro_resp = supabase.table("Livro").select("*").eq("idLivro", idLivro).execute()
    if not livro_resp.data:
        raise HTTPException(status_code=404, detail="Livro não encontrado.")
    livro = enriquecer_livros(livro_resp.data)[0]
    autores_resp = supabase.table("LivroAutor").select("idLivro, Autor(idAutor, autNome, autABNT)").eq("idLivro", idLivro).execute()
    autores_list = []
    if autores_resp.data:
        for r in autores_resp.data:
            if r.get("Autor"):
                autores_list.append(r["Autor"])
    if not autores_list:
        raise HTTPException(
            status_code=400,
            detail="O livro precisa ter pelo menos um autor cadastrado para gerar a ficha catalográfica."
        )
    total_autores = len(autores_list)
    nomes_autores = [a["autNome"] for a in autores_list]

    # Regra dos modelos do PDF: até 3 autores, a entrada principal é pelo
    # primeiro (os demais só aparecem como entrada secundária no corpo).
    # Mais de 3 autores: a entrada principal passa a ser pelo título — não
    # há linha de autor no topo, a indicação de responsabilidade cita só o
    # primeiro nome seguido de "[et al.]", e TODOS os autores (não apenas
    # os demais) entram como entrada secundária.
    if total_autores > 3:
        autor_abnt = ""
        autores_statement = f"{nomes_autores[0]}... [et al.]"
        nomes_entrada_secundaria = nomes_autores
    else:
        autor_principal = autores_list[0]
        autor_abnt = autor_principal.get("autABNT") or converter_para_abnt(autor_principal["autNome"])
        autores_statement = ", ".join(nomes_autores)
        nomes_entrada_secundaria = nomes_autores[1:]

    titulo_cat = livro["livTitulo"]
    if livro.get("livSubtitulo"):
        titulo_cat += f" : {livro['livSubtitulo']}"
    titulo_cat += f" / {autores_statement}."
    cidade = livro.get("ediCidade") or "[S.l.]"
    editora = livro.get("livEditora") or "[s.n.]"
    ano = str(livro.get("livAnoPublicacao")) if livro.get("livAnoPublicacao") else "[s.d.]"
    publicacao = f"{cidade} : {editora}, {ano}."
    paginas = f"{livro['livPaginas']} p."
    desc_fisica = paginas
    detalhes_fisicos = []
    if livro.get("livIlustrado"):
        detalhes_fisicos.append("il.")
    if livro.get("livAlturaCm"):
        altura = livro["livAlturaCm"]
        altura_str = f"{int(altura)}" if float(altura).is_integer() else f"{altura}"
        detalhes_fisicos.append(f"{altura_str} cm")
    if detalhes_fisicos:
        if "il." in detalhes_fisicos:
            desc_fisica += " : il."
            if any("cm" in x for x in detalhes_fisicos):
                desc_fisica += f" ; {next(x for x in detalhes_fisicos if 'cm' in x)}."
            else:
                desc_fisica += "."
        else:
            desc_fisica += f" ; {detalhes_fisicos[0]}."
    isbn = f"ISBN {livro['livISBN']}" if livro.get("livISBN") else ""
    cdd = livro.get("livCDD")
    cdd_origem = "database"
    if not cdd:
        cdd = buscar_cdd_externo(livro.get("livISBN"))
        if cdd:
            cdd_origem = "api"
            supabase.table("Livro").update({"livCDD": cdd, "livCDDSugerida": False}).eq("idLivro", idLivro).execute()
    if not cdd:
        cdd = sugerir_cdd_ia(livro)
        cdd_origem = "ia"
        supabase.table("Livro").update({"livCDD": cdd, "livCDDSugerida": True}).eq("idLivro", idLivro).execute()
    assuntos = sugerir_assuntos_ia(livro)
    entradas = list(nomes_entrada_secundaria)
    entradas.append("Título")
    entradas_formatadas = []
    for i, ent in enumerate(entradas, 1):
        roman = int_to_roman(i)
        entradas_formatadas.append(f"{roman}. {ent}.")
    texto_linhas = []
    if autor_abnt:
        texto_linhas.append(autor_abnt)
    texto_linhas.append(titulo_cat)
    texto_linhas.append(publicacao)
    texto_linhas.append(desc_fisica)
    if isbn:
        texto_linhas.append(isbn)
    assuntos_texto = "\n".join(f"{i}. {assunto}." for i, assunto in enumerate(assuntos, 1))
    texto_linhas.append(assuntos_texto)
    entradas_texto = " ".join(entradas_formatadas)
    texto_linhas.append(entradas_texto)
    texto_linhas.append(f"CDD {cdd}")
    ficTexto = "\n\n".join(texto_linhas)
    ficHtml = formatar_ficha_html(autor_abnt, titulo_cat, publicacao, desc_fisica, isbn, assuntos, entradas_formatadas, cdd)
    ex_ficha = supabase.table("FichaCatalografica").select("idFicha, ficVersao").eq("idLivro", idLivro).execute()
    payload_ficha = {
        "idLivro": idLivro,
        "ficTexto": ficTexto,
        "ficHtml": ficHtml,
        "ficCDD": cdd,
        "ficCDDOrigem": cdd_origem,
        "ficGeradaPorIA": (cdd_origem == "ia"),
        "ficRevisada": False,
        "ficDataGeracao": datetime.utcnow().isoformat(),
        "ficDataRevisao": None,
    }
    if ex_ficha.data:
        id_ficha = ex_ficha.data[0]["idFicha"]
        versao = ex_ficha.data[0]["ficVersao"] + 1
        payload_ficha["ficVersao"] = versao
        ficha_db = supabase.table("FichaCatalografica").update(payload_ficha).eq("idFicha", id_ficha).execute()
    else:
        ficha_db = supabase.table("FichaCatalografica").insert(payload_ficha).execute()
    return {
        "fichaTexto": ficTexto,
        "fichaHtml": ficHtml,
        "fichaJson": {
            "autorPrincipalABNT": autor_abnt,
            "titulo": livro["livTitulo"] + (f" : {livro['livSubtitulo']}" if livro.get("livSubtitulo") else ""),
            "publicacao": publicacao,
            "descricaoFisica": desc_fisica,
            "isbn": isbn,
            "assuntos": assuntos,
            "entradasSecundarias": entradas_formatadas,
            "cdd": cdd
        },
        "geradaPorIA": (cdd_origem == "ia"),
        "classificacaoSugerida": (cdd_origem == "ia")
    }
    
@router.put("/livros/{idLivro}/ficha-catalografica")
def atualizar_ficha_catalografica(idLivro: int, data: FichaCatalograficaUpdate, admin=Depends(get_admin)):
    ficha_resp = supabase.table("FichaCatalografica").select("*").eq("idLivro", idLivro).execute()
    if not ficha_resp.data:
        raise HTTPException(status_code=404, detail="Ficha catalográfica não encontrada para este livro.")
    ficha = ficha_resp.data[0]
    id_ficha = ficha["idFicha"]
    payload_upd = {
        "ficTexto": data.ficTexto,
        "ficRevisada": data.ficRevisada,
        "ficDataRevisao": datetime.utcnow().isoformat()
    }
    if data.ficCDD:
        payload_upd["ficCDD"] = data.ficCDD
        payload_upd["ficCDDOrigem"] = "database"
        supabase.table("Livro").update({"livCDD": data.ficCDD, "livCDDSugerida": False}).eq("idLivro", idLivro).execute()
    if data.ficGeradaPorIA is not None:
        payload_upd["ficGeradaPorIA"] = data.ficGeradaPorIA
    linhas = [l.strip() for l in data.ficTexto.split("\n\n") if l.strip()]
    # Quando a entrada é pelo título (mais de 3 autores), não existe linha de
    # autor separada — a ficha já começa pela linha "Título / Autor... [et
    # al.].", que sempre contém " / ". Detectamos isso para não desalinhar
    # os índices das linhas seguintes.
    entrada_por_titulo = bool(linhas) and " / " in linhas[0]
    if entrada_por_titulo:
        autor_abnt = ""
        titulo_cat = linhas[0] if len(linhas) > 0 else ""
        pub = linhas[1] if len(linhas) > 1 else ""
        desc = linhas[2] if len(linhas) > 2 else ""
        restantes = linhas[3:]
    else:
        autor_abnt = linhas[0] if len(linhas) > 0 else ""
        titulo_cat = linhas[1] if len(linhas) > 1 else ""
        pub = linhas[2] if len(linhas) > 2 else ""
        desc = linhas[3] if len(linhas) > 3 else ""
        restantes = linhas[4:]
    isbn_text = ""
    assuntos_entradas = ""
    cdd_text = data.ficCDD or ficha["ficCDD"]
    for r in restantes:
        if r.startswith("ISBN"):
            isbn_text = r
        elif r.startswith("CDD"):
            pass
        else:
            if assuntos_entradas:
                assuntos_entradas += " " + r
            else:
                assuntos_entradas = r
    assuntos_entradas_clean = " ".join([x.strip() for x in assuntos_entradas.split("\n") if x.strip()])
    # Mesma regra do gerador: ISBN e assuntos/entradas voltam para a margem
    # da 1ª letra do sobrenome (sem indentação); só título/publicação/
    # descrição física ficam recuados. Autor só aparece quando não é uma
    # entrada por título.
    autor_html = (
        f'<div style="font-weight: bold; margin-bottom: 12px;">{autor_abnt}</div>'
        if autor_abnt else ""
    )
    isbn_block = f'<div style="margin-bottom: 12px;">{isbn_text}</div>' if isbn_text else ''
    ficHtml = f"""
<style>
  @media print {{
    .ficha-catalografica-container {{
      width: 12.5cm;
      height: 7.5cm;
      max-width: 12.5cm;
      max-height: 7.5cm;
      font-size: 8pt;
      line-height: 1.3;
      padding: 0.35cm;
      margin: 0;
      overflow: hidden;
      box-shadow: none;
      border-radius: 0;
    }}
  }}
</style>
<div class="ficha-catalografica-container" style="border: 2px solid var(--surface-border, #333); padding: 25px; font-family: 'Courier New', Courier, monospace; font-size: 13.5px; line-height: 1.6; max-width: 550px; margin: 15px auto; background-color: var(--surface-bg, #fff); color: var(--text-default, #111); border-radius: 8px; box-shadow: var(--shadow-soft, 0 4px 12px rgba(0,0,0,0.1));">
  {autor_html}
  <div style="margin-left: 30px; text-indent: -15px; margin-bottom: 8px; text-align: justify;">
    {titulo_cat}
  </div>
  <div style="margin-left: 30px; margin-bottom: 8px; text-align: justify;">
    {pub}
  </div>
  <div style="margin-left: 30px; margin-bottom: 12px;">
    {desc}
  </div>
  {isbn_block}
  <div style="margin-bottom: 12px; text-align: justify;">
    {assuntos_entradas_clean}
  </div>
  <div style="font-weight: bold; margin-top: 15px;">
    CDD {cdd_text}
  </div>
</div>
"""
    payload_upd["ficHtml"] = ficHtml.strip()
    supabase.table("FichaCatalografica").update(payload_upd).eq("idFicha", id_ficha).execute()
    return obter_ficha_catalografica(idLivro)
