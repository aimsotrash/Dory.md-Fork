"""
Embedder + ChromaDB
===================

BGE-small embedding pipeline that stores vectors in ChromaDB
and supports semantic search by query.

Model: BAAI/bge-small-en-v1.5 (384-dim, ~133MB)

Usage:
    from intelligence.embedder import embed_chunks, embed_query, store_embeddings
    embeddings = embed_chunks(["some text", "another text"])
    store_embeddings(chunks, embeddings)
"""

import logging
import time

import numpy as np

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# BGE-small model (loaded lazily on first use)
# ---------------------------------------------------------------------------

_MODEL = None
QUERY_INSTRUCTION = "Represent this sentence for searching relevant passages: "


def _get_model():
    """Lazy-load the SentenceTransformer model on first use."""
    global _MODEL
    if _MODEL is None:
        from sentence_transformers import SentenceTransformer

        logger.info("Loading BGE-small model (first call)...")
        _MODEL = SentenceTransformer("BAAI/bge-small-en-v1.5")
        _MODEL.max_seq_length = 256  # chunks are short, speeds inference
        logger.info("BGE-small model loaded.")
    return _MODEL


# ---------------------------------------------------------------------------
# ChromaDB (persistent client, lazy init)
# ---------------------------------------------------------------------------

_CHROMA_CLIENT = None
_COLLECTION = None
CHROMA_DB_PATH = "./chroma_db"
COLLECTION_NAME = "dory_chunks"


def _get_collection():
    """Get or create the ChromaDB collection (lazy init)."""
    global _CHROMA_CLIENT, _COLLECTION
    if _COLLECTION is None:
        import chromadb
        from chromadb.config import Settings

        _CHROMA_CLIENT = chromadb.PersistentClient(
            path=CHROMA_DB_PATH,
            settings=Settings(anonymized_telemetry=False),
        )
        try:
            _COLLECTION = _CHROMA_CLIENT.get_or_create_collection(
                name=COLLECTION_NAME,
                metadata={"hnsw:space": "cosine"},
            )
        except Exception as e:
            # If collection exists with different settings, use existing
            logger.warning(
                f"ChromaDB collection config mismatch, using existing: {e}"
            )
            _COLLECTION = _CHROMA_CLIENT.get_collection(name=COLLECTION_NAME)
    return _COLLECTION


# ---------------------------------------------------------------------------
# Embedding functions
# ---------------------------------------------------------------------------


def embed_chunks(texts: list[str]) -> np.ndarray:
    """Encode a list of chunk texts into embeddings.

    Args:
        texts: List of chunk content strings.

    Returns:
        np.ndarray of shape (len(texts), 384). L2-normalized.
        Empty list returns shape (0, 384).
    """
    if not texts:
        return np.zeros((0, 384), dtype=np.float32)

    model = _get_model()
    embeddings = model.encode(
        texts,
        batch_size=32,
        normalize_embeddings=True,
        show_progress_bar=False,
    )
    return np.array(embeddings, dtype=np.float32)


def embed_query(query: str) -> np.ndarray:
    """Encode a single query string with the BGE instruction prefix.

    Args:
        query: The search query string.

    Returns:
        np.ndarray of shape (384,). L2-normalized.
    """
    model = _get_model()
    embedding = model.encode(
        [QUERY_INSTRUCTION + query],
        normalize_embeddings=True,
        show_progress_bar=False,
    )
    return np.array(embedding[0], dtype=np.float32)


def cosine_similarity_batch(
    query_emb: np.ndarray,  # shape (384,)
    chunk_embs: np.ndarray,  # shape (N, 384)
) -> np.ndarray:
    """Compute cosine similarity between a query and multiple chunk embeddings.

    Since embeddings are L2-normalized, this is just a dot product.

    Args:
        query_emb: Query embedding, shape (384,).
        chunk_embs: Chunk embeddings, shape (N, 384).

    Returns:
        np.ndarray of shape (N,) with similarity values in [-1, 1].
    """
    if chunk_embs.shape[0] == 0:
        return np.array([], dtype=np.float32)
    return chunk_embs @ query_emb


# ---------------------------------------------------------------------------
# ChromaDB storage & retrieval
# ---------------------------------------------------------------------------


def store_embeddings(
    chunks: list,
    embeddings: np.ndarray,
) -> None:
    """Store chunk embeddings in ChromaDB.

    Uses upsert to handle both new and existing chunks.

    Args:
        chunks: List of ChunkLike objects with .id, .content, .category,
                .source_type, .source_name attributes (or dicts).
        embeddings: Pre-computed embeddings, shape (len(chunks), 384).
    """
    if not chunks:
        return

    collection = _get_collection()

    # Extract fields (support both objects and dicts)
    ids = []
    documents = []
    metadatas = []
    emb_list = embeddings.tolist()

    for c in chunks:
        if isinstance(c, dict):
            ids.append(c["id"])
            documents.append(c["content"])
            metadatas.append({
                "category": c.get("category", "general"),
                "source_type": c.get("source_type", "file"),
                "source_name": c.get("source_name", "unknown"),
            })
        else:
            ids.append(c.id)
            documents.append(c.content)
            metadatas.append({
                "category": getattr(c, "category", "general"),
                "source_type": getattr(c, "source_type", "file"),
                "source_name": getattr(c, "source_name", "unknown"),
            })

    # Upsert in batches (ChromaDB has a batch size limit)
    batch_size = 500
    for i in range(0, len(ids), batch_size):
        end = min(i + batch_size, len(ids))
        collection.upsert(
            ids=ids[i:end],
            embeddings=emb_list[i:end],
            documents=documents[i:end],
            metadatas=metadatas[i:end],
        )

    logger.info(f"Stored {len(ids)} embeddings in ChromaDB.")


def query_embeddings(
    query_emb: np.ndarray,  # shape (384,)
    top_k: int = 50,
) -> list[tuple[str, float, str]]:
    """Query ChromaDB for similar chunks.

    Args:
        query_emb: Query embedding, shape (384,).
        top_k: Number of results to return.

    Returns:
        List of (chunk_id, similarity, content) tuples, sorted by
        similarity descending. Similarity = 1 - distance (cosine space).
    """
    collection = _get_collection()
    count = collection.count()
    if count == 0:
        return []

    results = collection.query(
        query_embeddings=[query_emb.tolist()],
        n_results=min(top_k, count),
        include=["distances", "documents"],
    )

    ids = results["ids"][0]
    distances = results["distances"][0]
    documents = results["documents"][0]

    # ChromaDB cosine distance: distance = 1 - similarity
    output = []
    for chunk_id, dist, doc in zip(ids, distances, documents):
        similarity = 1.0 - dist
        output.append((chunk_id, similarity, doc))

    return output


def get_collection_stats() -> dict:
    """Return basic stats about the ChromaDB collection.

    Returns:
        Dict with 'count' key.
    """
    collection = _get_collection()
    return {"count": collection.count()}


# ---------------------------------------------------------------------------
# Benchmark
# ---------------------------------------------------------------------------


def benchmark_embed(n: int = 100) -> None:
    """Benchmark embedding throughput.

    Args:
        n: Number of random strings to embed.
    """
    import random
    import string

    rng = random.Random(42)
    texts = [
        "".join(rng.choices(string.ascii_lowercase + " ", k=200))
        for _ in range(n)
    ]

    # Warmup
    embed_chunks(texts[:5])

    start = time.perf_counter()
    embed_chunks(texts)
    elapsed = time.perf_counter() - start

    throughput = n / elapsed
    print(f"Benchmark: embed_chunks({n} texts)")
    print(f"  Total time: {elapsed:.2f}s")
    print(f"  Throughput: {throughput:.1f} chunks/sec")
    print(f"  Per chunk: {elapsed / n * 1000:.1f} ms")


if __name__ == "__main__":
    benchmark_embed()
