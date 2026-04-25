"""
Singleton SentenceTransformer wrapper.

The model is loaded once at application startup (via warm_model() called in
main.py lifespan) so the first real request is never cold.
"""

from sentence_transformers import SentenceTransformer

_model: SentenceTransformer | None = None
MODEL_NAME = "all-MiniLM-L6-v2"


def warm_model() -> None:
    global _model
    if _model is None:
        _model = SentenceTransformer(MODEL_NAME)


def get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        warm_model()
    return _model


def embed_texts(texts: list[str]) -> list[list[float]]:
    """Batch-encode a list of strings. Returns a list of 384-dim float vectors."""
    model = get_model()
    return model.encode(texts, batch_size=32, show_progress_bar=False).tolist()


def embed_query(text: str) -> list[float]:
    """Encode a single query string."""
    return get_model().encode([text], show_progress_bar=False)[0].tolist()
