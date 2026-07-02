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
    allow_origin_regex=os.getenv("CORS_ALLOW_ORIGIN_REGEX", r"https://.*\.vercel\.app"),
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