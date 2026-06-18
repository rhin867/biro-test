from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import extract

app = FastAPI(title="Biro Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"ok": True, "service": "biro-backend"}


app.include_router(extract.router, prefix="/api")
