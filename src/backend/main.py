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

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(livros_router)
app.include_router(categorias_router)
app.include_router(generos_router)
app.include_router(admins_router)
app.include_router(usuarios_router)
app.include_router(emprestimos_router)
app.include_router(dashboard_router)

@app.get("/")
def root():
    return {"status": "ok"}