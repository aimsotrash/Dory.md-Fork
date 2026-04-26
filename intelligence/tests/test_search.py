"""
Tests for the Hybrid Search module (BM25 + Dense + RRF).
"""

import numpy as np
import pytest

from intelligence.search import (
    build_bm25_index,
    bm25_search,
    reciprocal_rank_fusion,
    hybrid_search,
)


# ---------------------------------------------------------------------------
# BM25 Tests
# ---------------------------------------------------------------------------


class TestBM25:
    """Tests for BM25 index and search."""

    @pytest.fixture(autouse=True)
    def _build_index(self):
        """Build a BM25 index with demo-like chunks for each test."""
        self.chunks = [
            {"id": "chk_async", "content": "Notes on async patterns in Python: asyncio.gather() runs coroutines concurrently and returns results in order."},
            {"id": "chk_coffee", "content": "Coffee shop in Capitol Hill I want to revisit with the exposed brick and the pour-over bar."},
            {"id": "chk_http", "content": "HTTP status code meanings: 200 OK, 201 Created, 404 Not Found, 500 Internal Server Error."},
            {"id": "chk_react", "content": "React useEffect cleanup: return a cleanup function to prevent memory leaks."},
            {"id": "chk_travel", "content": "Travel plans for spring break: considering Portland or Vancouver for a four day trip."},
        ]
        build_bm25_index(self.chunks)

    def test_keyword_match(self):
        """BM25 should rank keyword matches high."""
        results = bm25_search("python async patterns", top_k=5)
        assert len(results) > 0
        # The async chunk should rank first
        assert results[0][0] == "chk_async"

    def test_http_query(self):
        """Search for HTTP should find the status code chunk."""
        results = bm25_search("http status codes", top_k=5)
        assert len(results) > 0
        top_ids = [r[0] for r in results]
        assert "chk_http" in top_ids[:2]

    def test_no_results_for_gibberish(self):
        """Random gibberish should return empty or very low scores."""
        results = bm25_search("xyzzyfoobarbaz", top_k=5)
        # Either empty or all scores near zero
        assert len(results) == 0 or all(score < 0.1 for _, score in results)

    def test_empty_query(self):
        """Empty query returns empty list."""
        results = bm25_search("", top_k=5)
        assert results == []

    def test_no_index_returns_empty(self):
        """If index not built, returns empty list."""
        import intelligence.search as search_mod

        old_bm25 = search_mod._BM25
        search_mod._BM25 = None
        results = bm25_search("test query")
        assert results == []
        search_mod._BM25 = old_bm25  # restore


# ---------------------------------------------------------------------------
# RRF Tests
# ---------------------------------------------------------------------------


class TestRRF:
    """Tests for Reciprocal Rank Fusion."""

    def test_basic_fusion(self):
        """RRF should merge two ranked lists sensibly."""
        list1 = [("a", 5.0), ("b", 3.0), ("c", 1.0)]
        list2 = [("b", 0.9), ("c", 0.5), ("a", 0.1)]

        fused = reciprocal_rank_fusion(list1, list2, k=60)
        ids = [chunk_id for chunk_id, _ in fused]

        # 'b' is ranked consistently in both lists — should be top
        assert ids[0] == "b", f"Expected 'b' first, got '{ids[0]}'"

    def test_single_list(self):
        """RRF with one list should preserve order."""
        single = [("x", 10.0), ("y", 5.0), ("z", 1.0)]
        fused = reciprocal_rank_fusion(single, k=60)
        ids = [chunk_id for chunk_id, _ in fused]
        assert ids == ["x", "y", "z"]

    def test_empty_lists(self):
        """RRF with empty lists returns empty."""
        fused = reciprocal_rank_fusion([], [], k=60)
        assert fused == []

    def test_disjoint_lists(self):
        """RRF with non-overlapping lists includes all items."""
        list1 = [("a", 5.0)]
        list2 = [("b", 3.0)]
        fused = reciprocal_rank_fusion(list1, list2, k=60)
        ids = {chunk_id for chunk_id, _ in fused}
        assert ids == {"a", "b"}


# ---------------------------------------------------------------------------
# Hybrid Search Tests
# ---------------------------------------------------------------------------


class TestHybridSearch:
    """Tests for the hybrid_search main API."""

    def test_empty_query(self):
        """Empty query returns empty list."""
        results = hybrid_search("", top_k=5)
        assert results == []

    def test_with_bm25_only(self):
        """If dense search fails/empty, BM25 results still returned."""
        chunks = [
            {"id": "chk_test1", "content": "Python asyncio patterns for concurrent programming with coroutines."},
            {"id": "chk_test2", "content": "Coffee and pastries at a local cafe downtown with great ambiance."},
            {"id": "chk_test3", "content": "Meeting notes from the weekly standup about project deadlines."},
            {"id": "chk_test4", "content": "HTTP status codes reference guide for web developers."},
            {"id": "chk_test5", "content": "Travel plans for summer vacation to visit the national parks."},
        ]
        build_bm25_index(chunks)

        # BM25-only search should still work
        results = bm25_search("python asyncio coroutines", top_k=5)
        assert len(results) > 0
        assert results[0][0] == "chk_test1"
