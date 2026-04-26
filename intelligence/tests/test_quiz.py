"""
Tests for the Quiz Generator module.
"""

import asyncio
import pytest

from intelligence.quiz import generate_quiz_questions, generate_quiz_questions_sync


class TestGenerateQuizQuestions:
    """Tests for generate_quiz_questions()."""

    def test_empty_chunks(self):
        """Empty input returns empty output."""
        result = asyncio.run(generate_quiz_questions([]))
        assert result == []

    @pytest.mark.skipif(
        not __import__("os").environ.get("GROQ_API_KEY"),
        reason="GROQ_API_KEY not set",
    )
    def test_generates_questions(self):
        """Test that questions are generated with correct structure."""
        chunks = [
            {
                "id": "chk_quiz_001",
                "content": (
                    "Python asyncio.gather() runs coroutines concurrently and returns "
                    "results in order. Use asyncio.create_task() for fire-and-forget. "
                    "Always handle CancelledError in long-running tasks. The event loop "
                    "is single-threaded, so CPU-bound work blocks everything."
                ),
            },
            {
                "id": "chk_quiz_002",
                "content": (
                    "PostgreSQL performance tuning: EXPLAIN ANALYZE is your best friend. "
                    "Create indexes on columns used in WHERE and JOIN clauses. Use VACUUM "
                    "ANALYZE regularly. Connection pooling with pgbouncer reduces overhead."
                ),
            },
        ]

        questions = generate_quiz_questions_sync(chunks, target_count=2)

        # Should generate at least 1 question (LLM might fail on one)
        assert len(questions) >= 1

        for q in questions:
            # Validate structure
            assert "chunk_id" in q
            assert "question" in q
            assert "options" in q
            assert "correct_index" in q

            # Validate values
            assert isinstance(q["question"], str)
            assert len(q["question"]) > 0
            assert isinstance(q["options"], list)
            assert len(q["options"]) == 4
            assert all(isinstance(o, str) and len(o) > 0 for o in q["options"])
            assert isinstance(q["correct_index"], int)
            assert 0 <= q["correct_index"] <= 3

    @pytest.mark.skipif(
        not __import__("os").environ.get("GROQ_API_KEY"),
        reason="GROQ_API_KEY not set",
    )
    def test_respects_target_count(self):
        """Should not generate more questions than target_count."""
        chunks = [
            {"id": f"chk_tc_{i}", "content": f"Test content about topic {i} " * 20}
            for i in range(10)
        ]

        questions = generate_quiz_questions_sync(chunks, target_count=3)
        assert len(questions) <= 3

    def test_sync_wrapper(self):
        """generate_quiz_questions_sync should work and return a list."""
        result = generate_quiz_questions_sync([])
        assert isinstance(result, list)
        assert len(result) == 0
