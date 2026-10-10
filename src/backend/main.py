import logging
import time
import uuid
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.concurrency import run_in_threadpool
from database import supabase
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers.auth import router as auth_router
from routers.livros import router as livros_router
from routers.categorias import router as categorias_router
from routers.generos import router as generos_router
from routers.admins import router as admins_router
from routers.usuarios import router as usuarios_router
from routers.emprestimos import router as emprestimos_router
from routers.dashboard import router as dashboard_router
from routers.emails import router as emails_router
from routers.backup import router as backup_router
from routers.ano_letivo import router as ano_letivo_router
from routers.autores import router as autores_router
from routers.ia import router as ia_router
from routers.capas import router as capas_router
from routers.ficha_catalografica import router as ficha_catalografica_router
from routers.relatorios import router as relatorios_router
from routers.professor import router as professor_router

def _split_env_list(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


def get_cors_origins() -> list[str]:
    configured_origins = _split_env_list(os.getenv("CORS_ORIGINS", ""))
    if configured_origins:
        return configured_origins

    return [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_origin_regex=os.getenv("CORS_ALLOW_ORIGIN_REGEX"),
    allow_methods=["*"],
    allow_headers=["*"],
)

ROUTERS = [
    auth_router,
    livros_router,
    categorias_router,
    generos_router,
    autores_router,
    admins_router,
    usuarios_router,
    emprestimos_router,
    dashboard_router,
    emails_router,
    backup_router,
    ano_letivo_router,
    ia_router,
    capas_router,
    ficha_catalografica_router,
    relatorios_router,
    professor_router,
]


def register_routes(prefix: str = "") -> None:
    for router in ROUTERS:
        app.include_router(router, prefix=prefix)


# Local development keeps the original paths (/login, /livros, ...).
# Vercel rewrites /api/* to api/index.py, so the same routes are also
# exposed under /api/* for production deployments.
register_routes()
register_routes(prefix="/api")

@app.get("/")
def root():
    return {"status": "ok"}


@app.get("/api")
def api_root():
    return {"status": "ok"}

logger=logging.getLogger('biblioteca.api')
_log_cache={'ate':0.0,'ativo':True}


def _log_api_ativo():
    if time.monotonic()>=_log_cache['ate']:
        try:
            r=supabase.table('Configuracoes').select('valor').eq('chave','log_api').limit(1).execute().data
            _log_cache['ativo']=not r or r[0]['valor']=='true'
        except Exception: pass
        _log_cache['ate']=time.monotonic()+60
    return _log_cache['ativo']


@app.middleware('http')
async def rastrear_request(request,call_next):
    request.state.request_id=uuid.uuid4().hex
    inicio=time.monotonic()
    response=await call_next(request)
    response.headers['X-Request-ID']=request.state.request_id
    if await run_in_threadpool(_log_api_ativo):
        rota=getattr(request.scope.get('route'),'path','desconhecida')
        logger.info('request id=%s method=%s route=%s status=%s ms=%d',request.state.request_id,request.method,rota,response.status_code,int((time.monotonic()-inicio)*1000))
    return response


@app.exception_handler(RequestValidationError)
async def erro_validacao(request,exc):
    erros=[{k:v for k,v in e.items() if k in ('loc','msg','type')} for e in exc.errors()]
    return JSONResponse(status_code=422,content={'detail':erros,'request_id':getattr(request.state,'request_id',None)})


@app.exception_handler(Exception)
async def erro_interno(request,exc):
    identificador=getattr(request.state,'request_id',uuid.uuid4().hex)
    logger.error('error id=%s type=%s',identificador,type(exc).__name__)
    return JSONResponse(status_code=503,content={'detail':'Serviço temporariamente indisponível','request_id':identificador},headers={'X-Request-ID':identificador})
