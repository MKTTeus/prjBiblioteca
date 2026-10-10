# prjBiblioteca

Biblioteca escolar com React/Vite, FastAPI e Supabase. O frontend usa rotas por hash; no Vercel, `/api/*` é encaminhado à função Python.

## Execução local

Requisitos: Node 22.12+ e Python 3.12. Na raiz:

```bash
npm ci
python -m venv .venv
. .venv/bin/activate
python -m pip install -r requirements-dev.txt
cp .env.example .env
```

Preencha `.env` com as credenciais do seu ambiente local/homologação. Nunca publique esse arquivo. Use uma chave service_role somente no backend. Em banco vazio, aplique os SQL timestampados em `supabase/migrations`, em ordem, e execute `python scripts/criar_gestor.py` para cadastrar o primeiro gestor com senha individual. Os arquivos em `legacy_migrations` ficam preservados para consulta histórica.

Em dois terminais:

```bash
uvicorn main:app --app-dir src/backend --reload --port 5000
npm start
```

Frontend: `http://localhost:3000`; API: `http://localhost:5000/api`. A variável pública `REACT_APP_API_URL` pode ficar vazia para esse padrão ou indicar a origem da API. No deploy, vazia usa a própria origem. Secrets não devem receber o prefixo `REACT_APP_`.

## Validação

```bash
python -m pytest -q src/backend/tests
npm test -- --runInBand
npm run test:db
npm run build
npm audit
```

`test:db` aplica todas as migrations em PostgreSQL embarcado e descartável. A CI também executa `scripts/test-concurrency.py` num PostgreSQL 16 vazio chamado `biblioteca_test`; esse script não deve ser apontado a um banco de aplicação.

## Implantação e operação

- [Registro dos 26 itens corrigidos e limites conhecidos](docs/CORRECOES_AUDITORIA.md)
- [Ensaio, migrations, variáveis, jobs e implantação coordenada](docs/APLICACAO_MIGRATIONS.md)

O build é `dist`; `vercel.json` configura Vite, API, cabeçalhos e jobs diários. O workflow de circulação exige secrets próprios e só agenda na branch padrão. Senhas provisórias precisam ser trocadas; usuários importados usam recuperação de senha individual. O backup da aplicação está na versão 3, com snapshot consistente e recuperação atômica; arquivos antigos exigem conversão ensaiada.
