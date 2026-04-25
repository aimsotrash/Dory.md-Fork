import math
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from core.decay_engine import calculate_retention, classify_retention
from core.embeddings import embed_query
from database.db import DEFAULT_USER_ID, get_chunk
from models.schemas import SearchRequest, SearchResponse, SearchResult
from services.chroma_service import query_similar

router = APIRouter()


def _parse_dt(s: str) -> datetime:
    dt = datetime.fromisoformat(s)
    return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt


def _recency_bonus(created_at: str) -> float:
    dt = _parse_dt(created_at)
    days = (datetime.now(tz=timezone.utc) - dt).days
    return math.exp(-days / 30)


def _time_ago(dt: datetime) -> str:
    delta = datetime.now(tz=timezone.utc) - dt
    days = delta.days
    if days == 0:
        hours = delta.seconds // 3600
        return f"{hours}h ago" if hours else "just now"
    if days < 30:
        return f"{days}d ago"
    return f"{days // 30}mo ago"


@router.post("/search", response_model=SearchResponse)
def context_search(body: SearchRequest):
    if not body.context.strip():
        raise HTTPException(status_code=400, detail="Context cannot be empty.")

    q_emb = embed_query(body.context)
    raw = query_similar(q_emb, DEFAULT_USER_ID, n_results=50)

    if not raw["ids"]:
        return SearchResponse(results=[], discovery=None)

    scored: list[tuple[float, float, dict]] = []
    for cid, sim in zip(raw["ids"], raw["similarities"]):
        row = get_chunk(cid)
        if row is None:
            continue
        last_accessed = _parse_dt(row["last_accessed"])
        r = calculate_retention(last_accessed, row["access_count"], row["complexity_score"])
        decay_urgency = 1.0 - r
        recency = _recency_bonus(row["created_at"])
        composite = (sim * 0.4) + (decay_urgency * 0.4) + (recency * 0.2)
        scored.append((composite, r, dict(row)))

    scored.sort(key=lambda x: x[0], reverse=True)
    top = scored[: max(body.limit, 10)]

    # Discovery: chunk in top-10 with highest decay_urgency × cosine_similarity
    # (not necessarily the top composite-ranked result)
    sim_map = {cid: s for cid, s in zip(raw["ids"], raw["similarities"])}
    best_discovery_score = -1.0
    discovery_idx = None
    for i, (composite, r, row) in enumerate(top[:10]):
        du = 1.0 - r
        sim = sim_map.get(row["id"], 0.0)
        ds = du * sim
        if ds > best_discovery_score and r < 0.5:
            best_discovery_score = ds
            discovery_idx = i

    results: list[SearchResult] = []
    discovery_result: SearchResult | None = None

    for i, (composite, r, row) in enumerate(top[: body.limit]):
        last_accessed = _parse_dt(row["last_accessed"])
        is_disc = i == discovery_idx
        sr = SearchResult(
            chunk_id=row["id"],
            content=row["content"][:400],
            source_file=row["source_file"],
            category=row["category"],
            retention=round(r, 4),
            status=classify_retention(r),
            relevance_score=round(composite, 4),
            is_discovery=is_disc,
            time_ago=_time_ago(last_accessed),
        )
        results.append(sr)
        if is_disc:
            discovery_result = sr

    return SearchResponse(results=results, discovery=discovery_result)
