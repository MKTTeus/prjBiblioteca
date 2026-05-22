# prjBiblioteca

Projeto de biblioteca escolar com frontend em React e backend em Python/FastAPI.

## Visão geral

- Frontend: React + Create React App
- Backend: Python + FastAPI
- Banco/serviços: Supabase
- Deploy target: Vercel / API em serverless, mas localmente executa `uvicorn`

## Pré-requisitos

- Node.js + npm
- Python 3.10+ (ou versão compatível)
- pip
- Git

## Configuração de ambiente

1. Copie o arquivo de exemplo:

```powershell
copy .env.example .env
```

2. Preencha os valores reais em `.env`.

3. Para desenvolvimento local, ajuste `REACT_APP_API_URL` para o endpoint do backend local:

```dotenv
REACT_APP_API_URL=http://localhost:5000
```

4. O backend Python carrega as variáveis usando `python-dotenv`. Coloque `.env` em `src/backend/` ou execute o servidor a partir desse diretório.

> O arquivo `.env` não deve ser commitado. Use apenas `.env.example` para compartilhar os nomes das variáveis.

## Backend (Python / FastAPI)

```powershell
cd src\backend
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

# Se der erro de permissão no PowerShell, rode isso:
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force


Crie o arquivo `.env` em `src/backend/` com as variáveis necessárias e execute:

```powershell
uvicorn main:app --reload --port 5000
```

O backend ficará disponível em:

- `http://localhost:5000`

## Frontend (React)

No diretório raiz do projeto:

```powershell
npm install
npm start
```

O frontend será aberto em:

- `http://localhost:3000`

## Variáveis de ambiente usadas

No frontend:

- `REACT_APP_API_URL` - URL base da API do backend

No backend:

- `SECRET_KEY` - chave secreta para JWT
- `CORS_ORIGINS` - origens permitidas para CORS
- `CORS_ALLOW_ORIGIN_REGEX` - regex de origens permitidas
- `SUPABASE_URL` - URL do projeto Supabase
- `SUPABASE_KEY` - chave Supabase

## Estrutura de pastas relevante

- `src/` - código frontend React
- `src/backend/` - código backend FastAPI
- `public/` - arquivos públicos do React
- `.env.example` - template de variáveis de ambiente
- `.gitignore` - exclusões de arquivos sensíveis e de build

## Observações

- Não comite o arquivo `.env` real.
- Não versionar `node_modules/`, `venv/`, `.vscode/`, `.idea/` ou arquivos temporários.
- `package-lock.json` deve permanecer versionado para builds reproduzíveis.

## Links úteis

- React: https://reactjs.org/
- FastAPI: https://fastapi.tiangolo.com/
- Supabase: https://supabase.com/
- Uvicorn: https://www.uvicorn.org/
