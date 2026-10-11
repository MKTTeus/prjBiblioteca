"""Ranking determinístico, sem rede, dados pessoais ou dependências de ML.

65% colaborativo / 35% conteúdo quando há ao menos dois vizinhos apoiando
um candidato. Sem evidência colaborativa, usa conteúdo e depois descoberta.
Notas: 4–5 positivas, 3 neutra, 1–2 negativas; ausência é sinal implícito fraco.
"""
from collections import Counter, defaultdict
from math import log, sqrt
import re
import unicodedata

PESO_COLABORATIVO = 0.65
MIN_VIZINHOS = 2
MIN_CONTEUDO = 0.10
STOPWORDS = set('a o as os de da do das dos e em um uma uns umas para por com que se no na nos nas ao aos sua seu suas seus sobre entre como mais'.split())


def normalizar(value):
    return ''.join(c for c in unicodedata.normalize('NFKD', str(value or '').lower())
                   if not unicodedata.combining(c))


def palavras(value):
    return [p for p in re.findall(r'[a-z0-9]+', normalizar(value)) if len(p) > 2 and p not in STOPWORDS]


def caracteristicas(livro):
    tokens = Counter(palavras(' '.join(str(livro.get(k) or '') for k in
                                     ('livTitulo', 'livSubtitulo', 'livDescricao'))))
    # Palavras-chave e descrição devem compartilhar o mesmo vocabulário.
    for p in palavras(livro.get('livPalavrasChave')):
        tokens[p] += 3
    for field in ('livCategoria', 'livGenero', 'livAutor', 'livCDD'):
        if livro.get(field):
            tokens[f'{field}:{normalizar(livro[field])}'] = 3
    for rel, nested, field in [('LivroCategoria', 'Categoria', 'catNome'), ('LivroGenero', 'Genero', 'genNome')]:
        for row in livro.get(rel, []):
            if row.get(nested):
                tokens[f'{rel}:{normalizar(row[nested][field])}'] = 3
    if livro.get('livIlustrado'):
        tokens['formato:ilustrado'] = 1
    return tokens


def vetores_catalogo(livros):
    tokens = {b['idLivro']: caracteristicas(b) for b in livros}
    frequencia = Counter(t for termos in tokens.values() for t in termos)
    result = {}
    for lid, termos in tokens.items():
        vec = {t: (1 + log(n)) * (1 + log((1 + len(livros)) / (1 + frequencia[t])))
               for t, n in termos.items()}
        norma = sqrt(sum(v * v for v in vec.values())) or 1
        result[lid] = {t: v / norma for t, v in vec.items()}
    return result


def afinidade(nota):
    return {1: -1.0, 2: -0.5, 3: 0.0, 4: 0.75, 5: 1.0}.get(nota, 0.35)


def recomendar(livros, historico, usuario_id, limite=6):
    catalogo = {b['idLivro']: b for b in livros}
    # Defesa adicional contra duplicatas: uma interação por aluno/título.
    interacoes = {(h['idUsuario'], h['idLivro']): h for h in historico}
    perfis = defaultdict(dict)
    popularidade = Counter()
    excluidos = set()
    for (uid, lid), h in interacoes.items():
        if uid == usuario_id and (h['consumido'] or h['bloqueado']):
            excluidos.add(lid)
        if h['consumido']:
            peso = afinidade(h.get('nota'))
            perfis[uid][lid] = peso
            if h['devolvido'] and peso > 0:
                popularidade[lid] += peso

    alvo = perfis.get(usuario_id, {})
    positivos = {lid: p for lid, p in alvo.items() if p > 0}
    vetores = vetores_catalogo(livros)
    perfil_conteudo = defaultdict(float)
    total = sum(abs(p) for p in alvo.values()) or 1
    for lid, peso in alvo.items():
        for token, valor in vetores.get(lid, {}).items():
            perfil_conteudo[token] += peso * valor / total

    colaborativo, apoio = Counter(), Counter()
    for uid, perfil in perfis.items():
        if uid == usuario_id:
            continue
        vizinho = {lid: p for lid, p in perfil.items() if p > 0}
        comuns = positivos.keys() & vizinho.keys()
        if not comuns:
            continue
        uniao = positivos.keys() | vizinho.keys()
        similaridade = sum(min(positivos[lid], vizinho[lid]) for lid in comuns) / sum(
            max(positivos.get(lid, 0), vizinho.get(lid, 0)) for lid in uniao)
        for lid, peso in vizinho.items():
            # Só recomenda por pares quando o vizinho efetivamente devolveu.
            if interacoes[(uid, lid)]['devolvido']:
                colaborativo[lid] += similaridade * peso
                apoio[lid] += 1
    colaborativo = {lid: p for lid, p in colaborativo.items() if apoio[lid] >= MIN_VIZINHOS}
    max_colab = max(colaborativo.values(), default=1)
    max_pop = max(popularidade.values(), default=1)
    candidatos = []
    for lid, livro in catalogo.items():
        if lid in excluidos or not livro.get('livAtivo', True) or livro.get('disponiveis', 0) <= 0:
            continue
        conteudo = sum(v * perfil_conteudo.get(t, 0) for t, v in vetores[lid].items())
        colab = colaborativo.get(lid, 0) / max_colab
        if colab > 0:
            score = PESO_COLABORATIVO * colab + (1 - PESO_COLABORATIVO) * conteudo
            estrategia = 'hibrida'
            motivo = 'Alunos com leituras em comum também leram este livro.'
        elif conteudo >= MIN_CONTEUDO:
            score, estrategia = conteudo, 'conteudo'
            motivo = 'Tem características semelhantes às suas leituras e avaliações.'
        else:
            score, estrategia = 0.05 * popularidade[lid] / max_pop + min(0, conteudo), 'descoberta'
            motivo = ('Uma leitura frequente entre os alunos.' if popularidade[lid] > 0
                      else 'Uma opção do acervo para você descobrir.')
        candidatos.append({'livro': livro, 'motivo': motivo, 'estrategia': estrategia, '_score': score})

    # Penalidade suave evita uma vitrine composta só pelo mesmo gênero.
    escolhidos, generos = [], Counter()
    while candidatos and len(escolhidos) < limite:
        def ordem(item):
            genero = item['livro'].get('livGenero')
            score = item['_score'] - (0.08 * generos[genero] if genero else 0)
            return (-score, item['livro']['idLivro'])
        vencedor = min(candidatos, key=ordem)
        candidatos.remove(vencedor)
        generos[vencedor['livro'].get('livGenero')] += 1
        escolhidos.append({k: v for k, v in vencedor.items() if k != '_score'})
    return escolhidos
