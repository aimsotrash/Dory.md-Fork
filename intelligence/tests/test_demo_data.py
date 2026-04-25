"""
Tests for demo dataset generator.
"""

import math
from datetime import datetime, timedelta

from intelligence.demo_data import generate_demo_chunks


def test_chunk_count():
    """Verify the generator produces the correct number of chunks."""
    chunks = generate_demo_chunks(count=90, seed=42)
    assert len(chunks) == 90, f"Expected 90 chunks, got {len(chunks)}"


def test_required_fields_present():
    """Verify all required fields are present in every chunk."""
    required_fields = [
        "id", "content", "source_type", "source_name", "category",
        "created_at", "last_accessed", "access_count",
        "stability_S", "complexity_k",
    ]
    chunks = generate_demo_chunks(count=90, seed=42)
    for chunk in chunks:
        for field in required_fields:
            assert field in chunk, f"Missing field '{field}' in chunk {chunk['id']}"


def test_category_distribution():
    """Verify chunks are distributed across all 4 categories."""
    chunks = generate_demo_chunks(count=90, seed=42)
    categories = set(c["category"] for c in chunks)
    expected = {"technical", "personal", "reference", "general"}
    assert categories == expected, f"Missing categories: {expected - categories}"

    # Check rough distribution (allow some variance)
    counts = {}
    for c in chunks:
        counts[c["category"]] = counts.get(c["category"], 0) + 1

    assert counts["technical"] >= 25, f"Too few technical chunks: {counts['technical']}"
    assert counts["personal"] >= 15, f"Too few personal chunks: {counts['personal']}"
    assert counts["reference"] >= 10, f"Too few reference chunks: {counts['reference']}"
    assert counts["general"] >= 15, f"Too few general chunks: {counts['general']}"


def test_valid_categories():
    """Verify all categories are from the allowed set."""
    valid = {"technical", "personal", "reference", "general"}
    chunks = generate_demo_chunks(count=90, seed=42)
    for chunk in chunks:
        assert chunk["category"] in valid, (
            f"Invalid category '{chunk['category']}' in chunk {chunk['id']}"
        )


def test_chunk_ids_unique():
    """Verify all chunk IDs are unique."""
    chunks = generate_demo_chunks(count=90, seed=42)
    ids = [c["id"] for c in chunks]
    assert len(ids) == len(set(ids)), "Duplicate chunk IDs found"


def test_chunk_ids_format():
    """Verify chunk IDs follow the expected format."""
    chunks = generate_demo_chunks(count=90, seed=42)
    for chunk in chunks:
        assert chunk["id"].startswith("chk_"), (
            f"Chunk ID '{chunk['id']}' doesn't start with 'chk_'"
        )


def test_timestamps_are_in_past():
    """Verify all timestamps are in the past."""
    now = datetime.utcnow()
    chunks = generate_demo_chunks(count=90, seed=42)
    for chunk in chunks:
        created = datetime.strptime(chunk["created_at"], "%Y-%m-%dT%H:%M:%SZ")
        assert created <= now, f"Chunk {chunk['id']} has future created_at"


def test_stability_values():
    """Verify stability values are reasonable."""
    chunks = generate_demo_chunks(count=90, seed=42)
    for chunk in chunks:
        S = chunk["stability_S"]
        assert 0.1 <= S <= 365, f"Stability {S} out of range for chunk {chunk['id']}"

        # If no access, stability should be default 7.0
        if chunk["access_count"] == 0:
            assert S == 7.0, (
                f"Chunk {chunk['id']} has access_count=0 but stability_S={S}"
            )


def test_complexity_values():
    """Verify complexity values match category rules."""
    chunks = generate_demo_chunks(count=90, seed=42)
    for chunk in chunks:
        k = chunk["complexity_k"]
        if chunk["category"] in ("technical", "reference"):
            assert k == 0.7, (
                f"Chunk {chunk['id']} ({chunk['category']}) should have k=0.7, got {k}"
            )
        else:
            assert k == 1.0, (
                f"Chunk {chunk['id']} ({chunk['category']}) should have k=1.0, got {k}"
            )


def test_retention_math_sanity():
    """Verify the decay formula gives sensible values for demo data.

    For an old chunk (e.g. 30 days) with access_count=0, S=7.0, k=1.0:
    R(t) = exp(-hours / (S * k * 24)) = exp(-720 / 168) = exp(-4.29) ~ 0.014
    This should be noticeably below 1.0.
    """
    chunks = generate_demo_chunks(count=90, seed=42)

    # Find an old chunk with no access
    old_chunks = [
        c for c in chunks
        if c["access_count"] == 0
    ]
    assert len(old_chunks) > 0, "No unaccessed chunks found"

    now = datetime.utcnow()
    for chunk in old_chunks[:5]:  # Check 5 old chunks
        created = datetime.strptime(chunk["created_at"], "%Y-%m-%dT%H:%M:%SZ")
        hours = (now - created).total_seconds() / 3600
        S = chunk["stability_S"]
        k = chunk["complexity_k"]

        retention = math.exp(-hours / (S * k * 24))

        # Any chunk more than a few days old should have noticeable decay
        if hours > 48:  # More than 2 days old
            assert retention < 0.95, (
                f"Chunk {chunk['id']} is {hours:.0f}h old but retention={retention:.3f} "
                f"(too high). S={S}, k={k}"
            )


def test_reproducibility():
    """Verify the same seed produces identical data."""
    chunks1 = generate_demo_chunks(count=50, seed=42)
    chunks2 = generate_demo_chunks(count=50, seed=42)
    assert chunks1 == chunks2, "Same seed produced different data"


def test_content_not_empty():
    """Verify all chunks have non-empty content of reasonable length."""
    chunks = generate_demo_chunks(count=90, seed=42)
    for chunk in chunks:
        assert len(chunk["content"]) >= 100, (
            f"Chunk {chunk['id']} content too short: {len(chunk['content'])} chars"
        )
        assert len(chunk["content"]) <= 600, (
            f"Chunk {chunk['id']} content too long: {len(chunk['content'])} chars"
        )
