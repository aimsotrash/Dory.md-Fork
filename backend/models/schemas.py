from datetime import datetime
from typing import Optional

from pydantic import BaseModel


# ── Ingest ────────────────────────────────────────────────────────────────────

class IngestResponse(BaseModel):
    chunks_created: int
    source: str
    message: str = "Ingestion complete. Category classification running in background."


# ── Chunk / Fading Feed ───────────────────────────────────────────────────────

class ChunkOut(BaseModel):
    chunk_id: str
    content: str
    source_file: str
    category: Optional[str]
    retention: float
    status: str  # strong | fading | weak | critical
    last_accessed: str
    access_count: int


class FadingResponse(BaseModel):
    chunks: list[ChunkOut]
    total_fading: int


# ── Health / Time Machine ─────────────────────────────────────────────────────

class CategoryHealth(BaseModel):
    name: str
    avg_retention: float
    strong: int
    fading: int
    weak: int
    critical: int
    total: int


class HealthResponse(BaseModel):
    categories: list[CategoryHealth]
    forgotten_count: int
    total_chunks: int
    avg_retention: float
    projected_date: str
    time_offset_hours: float


# ── Search / Discovery ────────────────────────────────────────────────────────

class SearchRequest(BaseModel):
    context: str
    limit: int = 5


class SearchResult(BaseModel):
    chunk_id: str
    content: str
    source_file: str
    category: Optional[str]
    retention: float
    status: str
    relevance_score: float
    is_discovery: bool = False
    time_ago: str


class SearchResponse(BaseModel):
    results: list[SearchResult]
    discovery: Optional[SearchResult] = None


# ── Review ────────────────────────────────────────────────────────────────────

class ReviewResponse(BaseModel):
    chunk_id: str
    new_retention: float
    access_count: int
    message: str


# ── Stats ─────────────────────────────────────────────────────────────────────

class StatsResponse(BaseModel):
    total_chunks: int
    avg_retention: float
    strong: int
    fading: int
    weak: int
    critical: int


# ── Quiz ─────────────────────────────────────────────────────────────────────

class QuizQuestion(BaseModel):
    chunk_id: str
    question: str
    options: list[str]
    correct_index: int
    retention: float
    source_file: str


class QuizStartResponse(BaseModel):
    session_id: str
    questions: list[QuizQuestion]


class QuizAnswerRequest(BaseModel):
    session_id: str
    chunk_id: str
    selected_index: int
    correct_index: int


class QuizAnswerResponse(BaseModel):
    correct: bool
    correct_index: int
    new_retention: float
    message: str


# ── Notion ────────────────────────────────────────────────────────────────────

class NotionImportRequest(BaseModel):
    token: Optional[str] = None  # used in internal mode
    page_ids: list[str]


class NotionImportResponse(BaseModel):
    pages_imported: int
    chunks_created: int


class NotionPage(BaseModel):
    id: str
    title: str
