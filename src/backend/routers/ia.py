import json
import os
import re

from fastapi import APIRouter, Depends, HTTPException

from core import get_admin
from schemas import CompletarIARequest
from gemini_client import create_gemini_client, generate_content_with_fallback

router = APIRouter()

# O Groq atende primeiro o fluxo frequente de enriquecimento; Gemini fica como reserva.
MODEL = os.getenv("GEMINI_BOOK_MODEL", "gemini-3.5-flash-lite")
FALLBACK_MODEL = os.getenv("GEMINI_BOOK_FALLBACK_MODEL", "gemini-2.5-flash")
PRIMARY_PROVIDER = os.getenv("BOOK_AI_PRIMARY_PROVIDER", "groq").lower()

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

# A consulta individual recebe somente uma propriedade de saída. Nenhum outro
# campo do formulário é alterado, mesmo se o modelo tentar sugerir mais dados.
CAMPOS_INDIVIDUAIS = {
    "livTitulo": "titulo", "livSubtitulo": "subtitulo", "livAutor": "autor_principal",
    "autorAnoNascimento": "autor_ano_nascimento", "autorAnoFalecimento": "autor_ano_falecimento",
    "livEditora": "editora", "livAnoPublicacao": "ano_publicacao", "livPaginas": "paginas",
    "livDescricao": "descricao", "idGenero": "genero_sugerido", "livIdioma": "idioma",
    "livFaixaEtaria": "faixa_etaria", "livPalavrasChave": "palavras_chave",
    "livEdicao": "edicao", "livIlustrado": "ilustrado", "ediCidade": "editora_cidade",
    "ediEstado": "editora_estado", "ediPais": "editora_pais",
    "livCDD": "cdd", "livAlturaCm": "altura_cm", "livLarguraCm": "largura_cm",
    "livCapaURL": "url_capa", "exemplarISBN": "isbn_sugerido",
}

EXTRA_PROPERTIES = {
    "cdd": {"type": "string", "description": "Classificação Decimal de Dewey verificada; omita se incerta."},
    "altura_cm": {"type": "string", "description": "Altura desta edição em centímetros; omita se incerta."},
    "largura_cm": {"type": "string", "description": "Largura desta edição em centímetros; omita se incerta."},
    "url_capa": {"type": "string", "description": "URL real e verificável da capa; jamais invente um endereço."},
    "isbn_sugerido": {"type": "string", "description": "ISBN desta edição exata; omita se não souber com segurança."},
}

# Nomes próprios e títulos oficiais podem permanecer no idioma original da obra.
# Os demais textos criados pela IA devem ser apresentados em português.
CAMPOS_TEXTO_PT = {"subtitulo", "descricao", "genero_sugerido", "palavras_chave", "faixa_etaria", "idioma", "editora_pais"}
PALAVRAS_INGLESAS = {
    "the", "and", "with", "from", "this", "that", "these", "those", "their",
    "which", "while", "when", "where", "who", "whose", "about", "through",
    "between", "after", "before", "becomes", "finds", "discovers", "must",
    "her", "his", "she", "they", "them", "are", "was", "were", "has", "have",
}
TERMOS_INGLES_ISOLADOS = {
    "fantasy", "thriller", "adventure", "fiction", "romance novel", "young adult",
    "children", "english", "spanish", "french", "science fiction", "mystery",
    "historical fiction", "coming of age", "self help", "nonfiction",
    "love", "friendship", "family", "magic", "history", "science", "travel",
    "education", "nature", "childhood", "biography", "poetry",
}


def _texto_em_ingles(valor):
    if isinstance(valor, list):
        return any(_texto_em_ingles(item) for item in valor)
    if not isinstance(valor, str):
        return False
    texto = valor.casefold().strip()
    if texto in TERMOS_INGLES_ISOLADOS:
        return True
    palavras = re.findall(r"[a-z]+", texto)
    indicadores = sum(palavra in PALAVRAS_INGLESAS for palavra in palavras)
    return indicadores >= 2 or (len(palavras) >= 8 and indicadores >= 1)


def _campos_em_ingles(resultado):
    return [campo for campo in CAMPOS_TEXTO_PT if campo in resultado and _texto_em_ingles(resultado[campo])]


def _get_client():
    if not os.getenv("GEMINI_API_KEY") and not os.getenv("GROQ_API_KEY"):
        raise HTTPException(status_code=500, detail="Configure GEMINI_API_KEY ou GROQ_API_KEY no servidor.")
    return create_gemini_client()


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
    if dados.generoNome:
        conhecidos.append(f"Gênero já sugerido: {dados.generoNome}")

    bloco_conhecidos = "\n".join(f"- {c}" for c in conhecidos) or "- (nenhum dado conhecido ainda)"

    bloco_opcoes = ""
    if dados.generos_existentes:
        bloco_opcoes += (
            "\n\nGêneros já cadastrados no sistema (prefira reaproveitar um destes se fizer sentido, "
            "em vez de inventar um novo): " + ", ".join(dados.generos_existentes)
        )

    alvo = CAMPOS_INDIVIDUAIS.get(dados.campo_alvo)
    instrucao_alvo = (
        f"\nSolicitação individual: sugira APENAS o campo {alvo}. "
        f"Valor atual desse campo: {dados.valor_atual or '(em branco)'}. "
        "Você pode reformular um texto, mas não invente ISBN, URL, medidas, CDD ou fatos editoriais. "
        "Se não houver base suficiente para uma sugestão segura, omita o campo. "
        "Não copie automaticamente o valor atual. Os outros dados servem só de contexto.\n"
        if alvo else ""
    )

    return (
        "Você é um assistente de catalogação de uma biblioteca escolar. "
        "Com base nos dados conhecidos abaixo, preencha os campos que faltam para o cadastro do livro.\n\n"
        f"Dados conhecidos:\n{bloco_conhecidos}{bloco_opcoes}\n{instrucao_alvo}\n"
        "Regras importantes:\n"
        "- Escreva TODOS os textos gerados em português brasileiro, mesmo que a obra, os dados de entrada "
        "ou a fonte consultada estejam em inglês. Traduza sinopse, subtítulo sugerido, gênero, palavras-chave, "
        "faixa etária, nome do idioma e país. Nunca devolva uma sinopse ou palavras-chave em inglês. "
        "Preserve apenas títulos oficiais, nomes de pessoas, editoras, URLs, ISBNs e outros identificadores "
        "próprios no idioma original. O campo idioma indica o idioma da obra, mas seu valor deve ser escrito "
        "em português (por exemplo, 'Inglês').\n"
        "- Se você reconhece esta obra com segurança, preencha os dados factuais (autor, editora, ano, páginas) "
        "com os valores reais.\n"
        "- Se você NÃO tem certeza de um dado factual específico (ano exato, número de páginas, editora exata), "
        "é preferível deixar o campo de fora a inventar um valor. Não faça isso para gênero, "
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
    from google.genai import types
    if not any([dados.isbn, dados.livTitulo, dados.livAutor]):
        raise HTTPException(
            status_code=400,
            detail="Informe ao menos ISBN, título ou autor para a IA ter algo para trabalhar.",
        )

    client = _get_client()
    prompt = _montar_prompt(dados)
    if dados.campo_alvo and dados.campo_alvo not in CAMPOS_INDIVIDUAIS:
        raise HTTPException(status_code=400, detail="Campo não disponível para sugestão individual.")
    alvo = CAMPOS_INDIVIDUAIS.get(dados.campo_alvo)
    schema = COMPLETAR_LIVRO_SCHEMA
    if alvo:
        schema = {
            "type": "object",
            "properties": {
                alvo: COMPLETAR_LIVRO_SCHEMA["properties"].get(alvo, EXTRA_PROPERTIES.get(alvo)),
            },
        }

    config = types.GenerateContentConfig(
        response_mime_type="application/json",
        response_json_schema=schema,
        system_instruction=(
            "Responda em português brasileiro em todos os textos que você gerar. "
            "Preserve nomes próprios, títulos oficiais e identificadores no idioma original."
        ),
    )

    try:
        resposta = generate_content_with_fallback(
            client,
            model=MODEL,
            fallback_model=FALLBACK_MODEL,
            primary_provider=PRIMARY_PROVIDER,
            contents=prompt,
            config=config,
        )
    except Exception as exc:
        print("Falha no provedor de IA ao completar cadastro do livro:", type(exc).__name__)
        raise HTTPException(status_code=502, detail="A IA não conseguiu completar os dados do livro agora. Confira sua conexão e as informações digitadas; você também pode preencher os campos manualmente.") from exc

    if not resposta.text:
        raise HTTPException(status_code=502, detail="A IA não retornou dados estruturados.")

    try:
        resultado = json.loads(resposta.text)
    except json.JSONDecodeError:
        print("Resposta da IA não é JSON válido:", resposta.text)
        raise HTTPException(status_code=502, detail="A IA retornou um formato inesperado.")

    if not isinstance(resultado, dict):
        raise HTTPException(status_code=502, detail="A IA retornou um formato inesperado.")

    campos_ingles = _campos_em_ingles(resultado)
    if campos_ingles:
        try:
            correcao = generate_content_with_fallback(
                client,
                model=MODEL,
                fallback_model=FALLBACK_MODEL,
                primary_provider=PRIMARY_PROVIDER,
                contents=(
                    "Corrija somente os campos textuais abaixo para português brasileiro. "
                    "Mantenha todos os dados factuais, títulos oficiais e nomes próprios iguais. "
                    "Devolva JSON conforme o mesmo schema, sem explicações.\n"
                    f"Campos a corrigir: {', '.join(campos_ingles)}\n"
                    f"Resposta anterior: {json.dumps(resultado, ensure_ascii=False)}"
                ),
                config=config,
            )
            corrigido = json.loads(correcao.text or "")
            if isinstance(corrigido, dict):
                for campo in campos_ingles:
                    if campo in corrigido and not _texto_em_ingles(corrigido[campo]):
                        resultado[campo] = corrigido[campo]
        except Exception as exc:
            print("Não foi possível corrigir o idioma da sugestão:", type(exc).__name__)
        for campo in _campos_em_ingles(resultado):
            resultado.pop(campo, None)

    return {alvo: resultado[alvo]} if alvo and alvo in resultado else ({} if alvo else resultado)
