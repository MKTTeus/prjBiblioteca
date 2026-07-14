import json
import os

from fastapi import APIRouter, Depends, HTTPException
from google import genai
from google.genai import types
from google.genai.errors import APIError

from core import get_admin
from schemas import CompletarIARequest

router = APIRouter()

# Gemini 2.5 Flash: modelo estável (não-preview) com tier gratuito no Google AI Studio
# (sem cartão de crédito, cota diária generosa o suficiente para cadastro de livros).
# Verifique limites atuais em https://ai.google.dev/gemini-api/docs/rate-limits
MODEL = "gemini-2.5-flash"

COMPLETAR_LIVRO_SCHEMA = {
    "type": "object",
    "properties": {
        "titulo": {
            "type": "string",
            "description": "Título completo do livro (mantenha o já informado se estiver correto).",
        },
        "subtitulo": {"type": "string"},
        "autor_principal": {
            "type": "string",
            "description": (
                "Nome completo do(s) autor(es), formato usual (não ABNT). Se a obra tiver "
                "mais de um autor, liste TODOS os nomes completos separados por vírgula "
                "(ex.: 'Fulano de Tal, Ciclana Pereira') — nunca use 'e' ou '&' para "
                "juntar nomes, pois cada nome vira um autor cadastrado separadamente."
            ),
        },
        "autor_ano_nascimento": {
            "type": "integer",
            "description": (
                "Ano de nascimento do autor principal. Preencha apenas se souber com "
                "segurança que se trata de uma pessoa real (não preencha para autores "
                "fictícios, pseudônimos de identidade desconhecida ou obras institucionais)."
            ),
        },
        "autor_ano_falecimento": {
            "type": "integer",
            "description": (
                "Ano de falecimento do autor principal, se já tiver falecido e você "
                "souber com segurança. Deixe de fora se o autor estiver vivo ou você não tiver certeza."
            ),
        },
        "editora": {"type": "string"},
        "ano_publicacao": {"type": "integer"},
        "paginas": {"type": "integer"},
        "idioma": {"type": "string", "description": "Ex.: Português, Inglês, Espanhol."},
        "descricao": {
            "type": "string",
            "description": "Sinopse objetiva de 2 a 4 frases, sem spoilers do final.",
        },
        "categoria_sugerida": {
            "type": "string",
            "description": "Categoria bibliotecária ampla (ex.: Fantasia, Romance, História, Ciências).",
        },
        "genero_sugerido": {
            "type": "string",
            "description": "Gênero literário (ex.: Aventura, Suspense, Poesia).",
        },
        "palavras_chave": {
            "type": "array",
            "items": {"type": "string"},
            "description": "3 a 6 palavras-chave/assuntos relevantes para catalogação.",
        },
        "faixa_etaria": {
            "type": "string",
            "description": "Ex.: Infantil, Juvenil, Adulto, Livre.",
        },
        "edicao": {
            "type": "integer",
            "description": (
                "Número da edição desta publicação (ex.: 2 para uma 2ª edição). "
                "Preencha apenas se souber com razoável segurança."
            ),
        },
        "ilustrado": {
            "type": "boolean",
            "description": (
                "Se esta obra contém ilustrações (comum em livros infantis, "
                "juvenis, quadrinhos ou didáticos). Preencha apenas se tiver confiança."
            ),
        },
        "editora_cidade": {
            "type": "string",
            "description": "Cidade da sede da editora (ex.: São Paulo). Preencha só se souber.",
        },
        "editora_estado": {
            "type": "string",
            "description": "Estado da sede da editora, sigla ou nome (ex.: SP). Preencha só se souber.",
        },
        "editora_pais": {
            "type": "string",
            "description": "País da sede da editora (ex.: Brasil). Preencha só se souber.",
        },
        "confianca_geral": {
            "type": "string",
            "enum": ["alta", "media", "baixa"],
            "description": "Alta: reconhece a obra com segurança. Media: reconhece parcialmente. Baixa: está apenas inferindo pelo padrão de título/gênero.",
        },
        "campos_incertos": {
            "type": "array",
            "items": {"type": "string"},
            "description": "Nomes dos campos acima em que a confiança é baixa ou o valor é um chute.",
        },
    },
    "required": ["titulo", "confianca_geral"],
}


def _get_client() -> genai.Client:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="GEMINI_API_KEY não configurada no servidor.",
        )
    return genai.Client(api_key=api_key)


def _montar_prompt(dados: CompletarIARequest) -> str:
    conhecidos = []
    if dados.isbn:
        conhecidos.append(f"ISBN: {dados.isbn}")
    if dados.livTitulo:
        conhecidos.append(f"Título (parcial ou completo): {dados.livTitulo}")
    if dados.livAutor:
        conhecidos.append(f"Autor (parcial ou completo): {dados.livAutor}")
    if dados.livEditora:
        conhecidos.append(f"Editora (parcial ou completo): {dados.livEditora}")
    if dados.livAnoPublicacao:
        conhecidos.append(f"Ano de publicação já conhecido: {dados.livAnoPublicacao}")
    if dados.livPaginas:
        conhecidos.append(f"Páginas já conhecidas: {dados.livPaginas}")
    if dados.livDescricao:
        conhecidos.append(f"Descrição já existente: {dados.livDescricao}")
    if dados.categoriaNome:
        conhecidos.append(f"Categoria já sugerida: {dados.categoriaNome}")
    if dados.generoNome:
        conhecidos.append(f"Gênero já sugerido: {dados.generoNome}")

    bloco_conhecidos = "\n".join(f"- {c}" for c in conhecidos) or "- (nenhum dado conhecido ainda)"

    bloco_opcoes = ""
    if dados.categorias_existentes:
        bloco_opcoes += (
            "\n\nCategorias já cadastradas no sistema (prefira reaproveitar uma destas se fizer sentido, "
            "em vez de inventar uma nova): " + ", ".join(dados.categorias_existentes)
        )
    if dados.generos_existentes:
        bloco_opcoes += (
            "\n\nGêneros já cadastrados no sistema (prefira reaproveitar um destes se fizer sentido, "
            "em vez de inventar um novo): " + ", ".join(dados.generos_existentes)
        )

    return (
        "Você é um assistente de catalogação de uma biblioteca escolar. "
        "Com base nos dados conhecidos abaixo, preencha os campos que faltam para o cadastro do livro.\n\n"
        f"Dados conhecidos:\n{bloco_conhecidos}{bloco_opcoes}\n\n"
        "Regras importantes:\n"
        "- Se você reconhece esta obra com segurança, preencha os dados factuais (autor, editora, ano, páginas) "
        "com os valores reais.\n"
        "- Se você NÃO tem certeza de um dado factual específico (ano exato, número de páginas, editora exata), "
        "é preferível deixar o campo de fora a inventar um valor. Não faça isso para categoria, gênero, "
        "palavras-chave e faixa etária — para esses, sempre dê sua melhor sugestão com base no título/contexto "
        "disponível, mesmo que a obra não seja reconhecida.\n"
        "- Edição, se ilustrado, e a cidade/estado/país da editora só devem ser preenchidos se você reconhece "
        "a obra e a edição específica com segurança — nunca invente esses dados por inferência de gênero/contexto. "
        "Na dúvida, omita e liste em campos_incertos.\n"
        "- O ano de nascimento/falecimento do autor só deve ser preenchido se você tem certeza de que é uma "
        "pessoa real e sabe esses dados biográficos — nunca invente ou estime. Na dúvida, omita.\n"
        "- Se a obra tiver mais de um autor, coloque todos em autor_principal separados por vírgula "
        "(ex.: 'Fulano de Tal, Ciclana Pereira'). NUNCA use 'e' ou '&' entre os nomes.\n"
        "- Liste em campos_incertos qualquer campo que você preencheu apenas por inferência, não por reconhecer "
        "a obra.\n"
        "- Responda APENAS com o JSON no schema fornecido, sem texto adicional."
    )


@router.post("/livros/completar-com-ia")
def completar_com_ia(dados: CompletarIARequest, admin=Depends(get_admin)):
    if not any([dados.isbn, dados.livTitulo, dados.livAutor]):
        raise HTTPException(
            status_code=400,
            detail="Informe ao menos ISBN, título ou autor para a IA ter algo para trabalhar.",
        )

    client = _get_client()
    prompt = _montar_prompt(dados)

    try:
        resposta = client.models.generate_content(
            model=MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_json_schema=COMPLETAR_LIVRO_SCHEMA,
            ),
        )
    except APIError as e:
        print("Erro na API do Gemini:", e)
        raise HTTPException(status_code=502, detail=f"Erro ao consultar a IA: {str(e)}")

    if not resposta.text:
        raise HTTPException(status_code=502, detail="A IA não retornou dados estruturados.")

    try:
        return json.loads(resposta.text)
    except json.JSONDecodeError:
        print("Resposta da IA não é JSON válido:", resposta.text)
        raise HTTPException(status_code=502, detail="A IA retornou um formato inesperado.")