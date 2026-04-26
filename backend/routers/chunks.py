import os
from datetime import datetime, timezone

from fastapi import APIRouter, Query

from core.decay_engine import calculate_retention, classify_retention
from database.db import DEFAULT_USER_ID, get_all_chunks
from models.schemas import ChunkOut, ChunksResponse

router = APIRouter()


def _parse_dt(s: str) -> datetime:
    dt = datetime.fromisoformat(s)
    return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt


def _time_ago(dt: datetime) -> str:
    now = datetime.now(tz=timezone.utc)
    delta = now - dt
    days = delta.days
    if days == 0:
        hours = delta.seconds // 3600
        return f"{hours}h ago" if hours else "just now"
    if days < 30:
        return f"{days}d ago"
    months = days // 30
    return f"{months}mo ago"


def _basename(path: str) -> str:
    return os.path.basename(path) if path else path


@router.get("/chunks", response_model=ChunksResponse)
def get_chunks(
    limit: int = Query(default=2000, ge=1, le=5000),
    sort: str = Query(default="retention", pattern="^(retention|recent|access)$"),
):
    """Return ALL chunks (not filtered by retention), for Library and Calendar views."""
    rows = get_all_chunks(DEFAULT_USER_ID)
    results: list[ChunkOut] = []

    for row in rows:
        last_accessed = _parse_dt(row["last_accessed"])
        r = calculate_retention(last_accessed, row["access_count"], row["complexity_score"])
        results.append(
            ChunkOut(
                chunk_id=row["id"],
                content=row["content"][:300],
                source_file=row["source_file"],
                category=row["category"],
                retention=round(r, 4),
                status=classify_retention(r),
                last_accessed=_time_ago(last_accessed),
                last_accessed_iso=last_accessed.isoformat(),
                access_count=row["access_count"],
            )
        )

    if sort == "retention":
        results.sort(key=lambda x: x.retention)
    elif sort == "recent":
        results.sort(key=lambda x: x.last_accessed, reverse=True)
    elif sort == "access":
        results.sort(key=lambda x: x.access_count, reverse=True)

    return ChunksResponse(chunks=results[:limit], total=len(results))
