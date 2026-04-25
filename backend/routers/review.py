from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from core.decay_engine import calculate_retention
from database.db import DEFAULT_USER_ID, get_chunk, update_chunk_access
from models.schemas import ReviewResponse

router = APIRouter()


@router.post("/review/{chunk_id}", response_model=ReviewResponse)
def review_chunk(chunk_id: str):
    row = get_chunk(chunk_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Chunk not found.")

    updated = update_chunk_access(chunk_id, user_id=DEFAULT_USER_ID, source="review")
    last_accessed = datetime.fromisoformat(updated["last_accessed"]).replace(tzinfo=timezone.utc)
    new_r = calculate_retention(last_accessed, updated["access_count"], updated["complexity_score"])

    return ReviewResponse(
        chunk_id=chunk_id,
        new_retention=round(new_r, 4),
        access_count=updated["access_count"],
        message=f"Memory revived. Retention now {new_r:.0%}.",
    )
