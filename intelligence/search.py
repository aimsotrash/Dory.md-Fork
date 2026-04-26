"""
Hybrid Search (BM25 + Dense + RRF)
===================================

Single hybrid_search() function that runs BM25 and dense retrieval
in parallel and fuses results via Reciprocal Rank Fusion.

+13-26% recall improvement over dense-only (per research).

Usage:
    from intelligence.search import hybrid_search, build_bm25_index
    build_bm25_index(chunks)  # call once at startup
    results = hybrid_search("python async", top_k=10)
"""

import logging
from collections import defaultdict

from rank_bm25 import BM25Okapi

from intelligence.embedder import embed_query, query_embeddings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Module-level BM25 state
# ---------------------------------------------------------------------------

_BM25: BM25Okapi | None = None
_CHUNK_IDS: list[str] = []
_CHUNK_CONTENTS: list[str] = []


# ---------------------------------------------------------------------------
# BM25 index management
# ---------------------------------------------------------------------------


def _tokenize(text: str) -> list[str]:
    """Simple lowercase split tokenizer (no stemming, fast)."""
    return text.lower().split()


def build_bm25_index(chunks: list) -> None:
    """Build the BM25 index from a list of chunks.

    Should be called once at startup or after bulk ingest.

    Args:
        chunks: List of ChunkLike objects or dicts with 'id' and 'content'.
    """
    global _BM25, _CHUNK_IDS, _CHUNK_CONTENTS

    if not chunks:
        _BM25 = None
        _CHUNK_IDS = []
        _CHUNK_CONTENTS = []
        return

    _CHUNK_IDS = []
    _CHUNK_CONTENTS = []
    tokenized_corpus = []

    for c in chunks:
        if isinstance(c, dict):
            _CHUNK_IDS.append(c["id"])
            content = c["content"]
        else:
            _CHUNK_IDS.append(c.id)
            content = c.content

        _CHUNK_CONTENTS.append(content)
        tokens = _tokenize(content)
        tokenized_corpus.append(tokens)

    _BM25 = BM25Okapi(tokenized_corpus)
    logger.info(f"BM25 index built with {len(_CHUNK_IDS)} chunks.")


def bm25_search(query: str, top_k: int = 50) -> list[tuple[str, float]]:
    """Search using BM25 keyword matching.

    Args:
        query: Search query string.
        top_k: Number of results to return.

    Returns:
        List of (chunk_id, score) tuples sorted by score descending.
        Returns [] if BM25 index not built.
    """
    if _BM25 is None:
        logger.warning("BM25 index not built. Call build_bm25_index() first.")
        return []

    if not query.strip():
        return []

    query_tokens = _tokenize(query)
    scores = _BM25.get_scores(query_tokens)

    # Get top_k indices sorted by score descending
    top_indices = scores.argsort()[::-1][:top_k]

    results = []
    for idx in top_indices:
        score = float(scores[idx])
        if score > 0:  # only include non-zero scores
            results.append((_CHUNK_IDS[idx], score))

    return results


def update_bm25_index(new_chunks: list) -> None:
    """Rebuild BM25 index with new chunks added.

    BM25Okapi doesn't support incremental updates, so we rebuild
    from scratch. Fine for hackathon scale (< 10K chunks).

    Args:
        new_chunks: New chunks to add. Combined with existing content
                    from ChromaDB if available.
    """
    # Try to get all existing chunks from ChromaDB
    try:
        from intelligence.embedder import _get_collection

        collection = _get_collection()
        if collection.count() > 0:
            all_data = collection.get(include=["documents"])
            # Build combined chunk list as dicts
            existing = [
                {"id": cid, "content": doc}
                for cid, doc in zip(all_data["ids"], all_data["documents"])
            ]
            # Add new chunks (avoid duplicates by ID)
            existing_ids = set(all_data["ids"])
            for c in new_chunks:
                cid = c["id"] if isinstance(c, dict) else c.id
                if cid not in existing_ids:
                    content = c["content"] if isinstance(c, dict) else c.content
                    existing.append({"id": cid, "content": content})
            build_bm25_index(existing)
            return
    except Exception as e:
        logger.warning(f"Could not rebuild from ChromaDB: {e}")

    # Fallback: just build from new_chunks
    build_bm25_index(new_chunks)


# ---------------------------------------------------------------------------
# Reciprocal Rank Fusion
# ---------------------------------------------------------------------------


def reciprocal_rank_fusion(
    *ranked_lists: list[tuple[str, float]],
    k: int = 60,
) -> list[tuple[str, float]]:
    """Fuse multiple ranked lists using Reciprocal Rank Fusion.

    Algorithm from Cormack et al., SIGIR 2009:
        rrf_score(d) = sum(1 / (k + rank + 1)) for each list containing d

    Args:
        *ranked_lists: Variable number of (chunk_id, score) lists,
                       each sorted by score descending.
        k: RRF constant (default 60, per SIGIR 2009 paper).

    Returns:
        List of (chunk_id, rrf_score) tuples sorted by RRF score descending.
    """
    rrf_scores: dict[str, float] = defaultdict(float)

    for ranked_list in ranked_lists:
        for rank, (chunk_id, _score) in enumerate(ranked_list):
            rrf_scores[chunk_id] += 1.0 / (k + rank + 1)

    # Sort by RRF score descending
    fused = sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True)
    return fused


# ---------------------------------------------------------------------------
# Hybrid search (main API)
# ---------------------------------------------------------------------------


def hybrid_search(
    query: str,
    top_k: int = 10,
    bm25_candidates: int = 50,
    dense_candidates: int = 50,
) -> list[tuple[str, float]]:
    """Run hybrid BM25 + dense search with RRF fusion.

    This is the main function Person 1 calls from /api/search.

    Args:
        query: Search query string.
        top_k: Number of final results to return.
        bm25_candidates: Number of BM25 candidates to retrieve.
        dense_candidates: Number of dense candidates to retrieve.

    Returns:
        List of (chunk_id, rrf_score) tuples sorted by score descending.
    """
    if not query.strip():
        return []

    # 1. BM25 sparse search
    bm25_results = bm25_search(query, top_k=bm25_candidates)

    # 2. Dense search via embedder
    try:
        q_emb = embed_query(query)
        dense_raw = query_embeddings(q_emb, top_k=dense_candidates)
        dense_results = [(chunk_id, sim) for chunk_id, sim, _content in dense_raw]
    except Exception as e:
        logger.warning(f"Dense search failed: {e}")
        dense_results = []

    # 3. Handle fallback cases
    if not bm25_results and not dense_results:
        return []

    if not bm25_results:
        logger.warning("BM25 index not built, falling back to dense-only.")
        return dense_results[:top_k]

    if not dense_results:
        return bm25_results[:top_k]

    # 4. Fuse via RRF
    fused = reciprocal_rank_fusion(bm25_results, dense_results, k=60)
    return fused[:top_k]


# ---------------------------------------------------------------------------
# Benchmark
# ---------------------------------------------------------------------------


def benchmark_hybrid(n_queries: int = 10) -> None:
    """Benchmark hybrid search latency.

    Args:
        n_queries: Number of queries to run.
    """
    import time

    test_queries = [
        "python async patterns",
        "coffee shop",
        "http status codes",
        "react hooks",
        "travel plans",
        "docker volume",
        "git rebase",
        "numpy broadcasting",
        "meal prep recipes",
        "kubernetes pods",
    ]

    # Warmup
    hybrid_search(test_queries[0], top_k=5)

    times = []
    for i in range(n_queries):
        query = test_queries[i % len(test_queries)]
        start = time.perf_counter()
        hybrid_search(query, top_k=10)
        elapsed = (time.perf_counter() - start) * 1000  # ms
        times.append(elapsed)

    avg = sum(times) / len(times)
    p50 = sorted(times)[len(times) // 2]
    p95 = sorted(times)[int(len(times) * 0.95)]

    print(f"Benchmark: hybrid_search x {n_queries} queries")
    print(f"  avg: {avg:.1f} ms")
    print(f"  p50: {p50:.1f} ms")
    print(f"  p95: {p95:.1f} ms")
    print(f"  Target: < 100ms  |  Result: {'PASS' if avg < 100 else 'NEEDS OPTIMIZATION'}")


if __name__ == "__main__":
    benchmark_hybrid()
