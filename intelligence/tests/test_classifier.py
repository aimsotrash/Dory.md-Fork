"""
Tests for the Groq Classifier module.
"""

import asyncio
import pytest

from intelligence.classifier import classify_chunks, classify_chunks_sync


class TestClassifyChunks:
    """Tests for classify_chunks()."""

    def test_empty_list(self):
        """Empty input returns empty output."""
        result = asyncio.run(classify_chunks([]))
        assert result == []

    @pytest.mark.skipif(
        not __import__("os").environ.get("GROQ_API_KEY"),
        reason="GROQ_API_KEY not set",
    )
    def test_basic_classification(self):
        """Test classification of clearly-categorized texts."""
        texts = [
            "Python asyncio.gather() runs coroutines concurrently and returns results in order. Use asyncio.create_task() for fire-and-forget.",
            "Coffee shop in Capitol Hill I want to revisit — exposed brick and pour-over bar. Great WiFi, not too crowded on Tuesday afternoons.",
            "HTTP status codes: 200 OK, 201 Created, 204 No Content, 400 Bad Request, 401 Unauthorized, 404 Not Found, 500 Internal Server Error.",
            "Meeting notes from standup: backend team is blocked on the auth middleware refactor. Sprint ends Friday.",
        ]
        categories = classify_chunks_sync(texts)

        assert len(categories) == 4

        # Each must be a valid category
        valid = {"technical", "personal", "reference", "general"}
        for cat in categories:
            assert cat in valid, f"Invalid category: {cat}"

        # Check expected classifications (LLM should get these right)
        assert categories[0] == "technical", f"Expected technical, got {categories[0]}"
        assert categories[1] == "personal", f"Expected personal, got {categories[1]}"
        assert categories[2] == "reference", f"Expected reference, got {categories[2]}"
        assert categories[3] == "general", f"Expected general, got {categories[3]}"

    @pytest.mark.skipif(
        not __import__("os").environ.get("GROQ_API_KEY"),
        reason="GROQ_API_KEY not set",
    )
    def test_batch_classification(self):
        """Test that batching works with more texts than batch_size."""
        # 15 texts with batch_size=5 should produce 3 batches
        texts = [
            "Python dataclasses reduce boilerplate for data containers.",
            "Recipe ideas for meal prep this week: overnight oats.",
            "Big O complexity: O(1) constant, O(n) linear, O(n^2) quadratic.",
            "Random thoughts about productivity and focus.",
            "Docker volume mounting for persistent data.",
        ] * 3  # 15 texts

        categories = classify_chunks_sync(texts)
        assert len(categories) == 15

        valid = {"technical", "personal", "reference", "general"}
        for cat in categories:
            assert cat in valid

    def test_sync_wrapper(self):
        """classify_chunks_sync should work and return a list."""
        result = classify_chunks_sync([])
        assert isinstance(result, list)
        assert len(result) == 0
