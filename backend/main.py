import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from core.embeddings import warm_model
from database.db import init_db
from routers import fading, health, ingest, notion, quiz, review, search, stats

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    warm_model()
    yield

app = FastAPI(title="Dory.md API", version="1.0.0", lifespan=lifespan)

frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url, "http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ingest.router, prefix="/api")
app.include_router(fading.router, prefix="/api")
app.include_router(search.router, prefix="/api")
app.include_router(health.router, prefix="/api")
app.include_router(review.router, prefix="/api")
app.include_router(stats.router, prefix="/api")
app.include_router(quiz.router, prefix="/api")
app.include_router(notion.router)

@app.get("/")
def root():
    return {"status": "ok", "service": "Dory.md"}
