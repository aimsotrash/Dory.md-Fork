"""
Tests for the Embedder + ChromaDB module.
"""

import json
import os
import shutil
import tempfile

import numpy as np
import pytest


# Use a temp ChromaDB path for tests
@pytest.fixture(autouse=True)
def _use_temp_chroma(tmp_path, monkeypatch):
    """Use a temporary ChromaDB directory for all tests."""
    import intelligence.embedder as embedder_mod

    monkeypatch.setattr(embedder_mod, "CHROMA_DB_PATH", str(tmp_path / "chroma_test"))
    monkeypatch.setattr(embedder_mod, "_CHROMA_CLIENT", None)
    monkeypatch.setattr(embedder_mod, "_COLLECTION", None)
    yield


class TestEmbedChunks:
    """Tests for embed_chunks()."""

    def test_empty_list(self):
        from intelligence.embedder import embed_chunks

        result = embed_chunks([])
        assert isinstance(result, np.ndarray)
        assert result.shape == (0, 384)

    def test_single_text(self):
        from intelligence.embedder import embed_chunks

        result = embed_chunks(["Hello world, this is a test chunk."])
        assert result.shape == (1, 384)
        assert result.dtype == np.float32

    def test_multiple_texts(self):
        from intelligence.embedder import embed_chunks

        texts = [
            "Python async patterns and coroutines.",
            "Coffee shop with great WiFi in downtown.",
            "HTTP status code 404 means Not Found.",
        ]
        result = embed_chunks(texts)
        assert result.shape == (3, 384)

    def test_embeddings_are_normalized(self):
        from intelligence.embedder import embed_chunks

        result = embed_chunks(["This is a test sentence for normalization."])
        norm = np.linalg.norm(result[0])
        assert abs(norm - 1.0) < 0.01, f"Embedding not normalized: norm={norm}"


class TestEmbedQuery:
    """Tests for embed_query()."""

    def test_query_shape(self):
        from intelligence.embedder import embed_query

        result = embed_query("python async patterns")
        assert result.shape == (384,)
        assert result.dtype == np.float32

    def test_query_is_normalized(self):
        from intelligence.embedder import embed_query

        result = embed_query("test query")
        norm = np.linalg.norm(result)
        assert abs(norm - 1.0) < 0.01


class TestCosineSimilarity:
    """Tests for cosine_similarity_batch()."""

    def test_identical_vectors(self):
        from intelligence.embedder import cosine_similarity_batch

        vec = np.random.randn(384).astype(np.float32)
        vec /= np.linalg.norm(vec)
        chunk_embs = np.array([vec, vec])
        sims = cosine_similarity_batch(vec, chunk_embs)
        assert len(sims) == 2
        assert all(abs(s - 1.0) < 0.01 for s in sims)

    def test_empty_chunks(self):
        from intelligence.embedder import cosine_similarity_batch

        vec = np.random.randn(384).astype(np.float32)
        chunk_embs = np.zeros((0, 384), dtype=np.float32)
        sims = cosine_similarity_batch(vec, chunk_embs)
        assert len(sims) == 0


class TestChromaDBIntegration:
    """Tests for store_embeddings and query_embeddings."""

    def test_store_and_query(self):
        from intelligence.embedder import (
            embed_chunks,
            embed_query,
            store_embeddings,
            query_embeddings,
            get_collection_stats,
        )

        # Create test chunks as dicts
        chunks = [
            {"id": "chk_test_001", "content": "Python asyncio gather runs coroutines concurrently",
             "category": "technical", "source_type": "file", "source_name": "test.md"},
            {"id": "chk_test_002", "content": "Coffee shop in Capitol Hill with great espresso",
             "category": "personal", "source_type": "file", "source_name": "notes.md"},
            {"id": "chk_test_003", "content": "HTTP 404 status code means resource not found",
             "category": "reference", "source_type": "file", "source_name": "ref.md"},
        ]

        # Embed and store
        embeddings = embed_chunks([c["content"] for c in chunks])
        store_embeddings(chunks, embeddings)

        # Check stats
        stats = get_collection_stats()
        assert stats["count"] == 3

        # Query — searching for "python coroutines" should return the async chunk
        q_emb = embed_query("python coroutines async")
        results = query_embeddings(q_emb, top_k=3)
        assert len(results) > 0

        # The first result should be the python async chunk
        top_id = results[0][0]
        assert top_id == "chk_test_001", f"Expected async chunk, got {top_id}"

    def test_upsert_no_duplicates(self):
        from intelligence.embedder import (
            embed_chunks,
            store_embeddings,
            get_collection_stats,
        )

        chunk = [{"id": "chk_upsert", "content": "Test upsert deduplication",
                  "category": "general", "source_type": "file", "source_name": "test.md"}]
        emb = embed_chunks(["Test upsert deduplication"])

        store_embeddings(chunk, emb)
        store_embeddings(chunk, emb)  # second store should upsert

        stats = get_collection_stats()
        assert stats["count"] == 1  # no duplicate

    def test_empty_collection_query(self):
        from intelligence.embedder import embed_query, query_embeddings

        q_emb = embed_query("test query")
        results = query_embeddings(q_emb, top_k=5)
        assert results == []
