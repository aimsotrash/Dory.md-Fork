"""
LLM-based category classifier with in-memory cache.

Runs as a BackgroundTask after ingestion so uploads return immediately.
Cache key: SHA-256 of chunk content (collision-resistant, cheap to compute).
"""

import hashlib

from database.db import update_chunk_category
from services.llm_service import get_llm

CATEGORIES = ["Computer Science", "Design", "Personal", "Mathematics", "Research", "Other"]

_cache: dict[str, str] = {}

SYSTEM_PROMPT = (
    "You are a knowledge classifier. "
    "Given a text chunk, return ONLY a JSON object with one key 'category' "
    f"whose value is exactly one of: {CATEGORIES}. "
    "No explanation, no markdown, just the JSON."
)


def _hash(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()


def classify_all_uncategorized() -> None:
    """Classify every chunk that has no category. Safe to call from a background thread at startup."""
    from database.db import get_all_chunks
    rows = get_all_chunks()
    uncategorized = [r for r in rows if not r["category"]]
    for row in uncategorized:
        try:
            classify_and_store(row["id"], row["content"])
        except Exception:
            pass


def classify_and_store(chunk_id: str, content: str) -> None:
    key = _hash(content)
    if key in _cache:
        update_chunk_category(chunk_id, _cache[key])
        return

    llm = get_llm()
    result = llm.complete_json(
        prompt=f"Classify this text:\n\n{content[:800]}",
        system=SYSTEM_PROMPT,
        fallback={"category": "Other"},
    )
    category = result.get("category", "Other")
    if category not in CATEGORIES:
        category = "Other"

    _cache[key] = category
    update_chunk_category(chunk_id, category)
