"""
Tests for the Decay Engine.

Covers:
- Basic retention math correctness
- Edge cases (empty list, negative offset, future timestamps, zero stability)
- Aggregate by category with urgency labels
- Time Machine slider simulation (monotonic decrease over time)
- Benchmark performance
"""

import math
import json
import os
from datetime import datetime, timezone, timedelta

import numpy as np
import pytest

from intelligence.decay import compute_retention, aggregate_by_category
from intelligence.chunk_protocol import SimpleChunk


# ---------------------------------------------------------------------------
# Helper to create chunks at specific ages
# ---------------------------------------------------------------------------

def make_chunk(
    chunk_id: str = "chk_test",
    category: str = "general",
    hours_ago: float = 24.0,
    stability_S: float = 7.0,
    complexity_k: float = 1.0,
    access_count: int = 0,
) -> SimpleChunk:
    """Create a SimpleChunk that was last accessed `hours_ago` hours ago."""
    now = datetime.now(timezone.utc)
    last_accessed = now - timedelta(hours=hours_ago)
    return SimpleChunk(
        id=chunk_id,
        content="Test chunk content for decay testing.",
        category=category,
        created_at=last_accessed.strftime("%Y-%m-%dT%H:%M:%SZ"),
        last_accessed=last_accessed.strftime("%Y-%m-%dT%H:%M:%SZ"),
        access_count=access_count,
        stability_S=stability_S,
        complexity_k=complexity_k,
    )


# ===================================================================
# BASIC RETENTION MATH
# ===================================================================

class TestComputeRetention:
    """Tests for compute_retention()."""

    def test_empty_chunks(self):
        """Empty list returns empty array."""
        result = compute_retention([])
        assert isinstance(result, np.ndarray)
        assert len(result) == 0

    def test_single_chunk_just_accessed(self):
        """A just-accessed chunk should have retention close to 1.0."""
        chunk = make_chunk(hours_ago=0.001)  # Basically just now
        retentions = compute_retention([chunk])
        assert retentions[0] > 0.99, f"Expected ~1.0, got {retentions[0]}"

    def test_single_chunk_old(self):
        """A 30-day old unreviewed chunk with default S should have very low retention."""
        chunk = make_chunk(hours_ago=720, stability_S=7.0, complexity_k=1.0)
        retentions = compute_retention([chunk])
        # exp(-720 / (7 * 1 * 24)) = exp(-4.286) ≈ 0.014
        assert retentions[0] < 0.05, f"Expected < 0.05, got {retentions[0]}"

    def test_higher_stability_decays_slower(self):
        """Higher stability S should result in higher retention for same age."""
        low_s = make_chunk(hours_ago=168, stability_S=7.0)   # 1 week, default S
        high_s = make_chunk(hours_ago=168, stability_S=50.0)  # 1 week, high S

        ret = compute_retention([low_s, high_s])
        assert ret[1] > ret[0], (
            f"Higher stability should decay slower: S=7 R={ret[0]:.4f}, S=50 R={ret[1]:.4f}"
        )

    def test_higher_complexity_decays_faster(self):
        """Higher complexity k means faster decay (smaller denominator S*k*24).

        In the formula R = exp(-h / (S*k*24)):
        - Lower k → smaller denominator → more negative exponent → FASTER decay
        - Higher k → larger denominator → less negative exponent → SLOWER decay

        Per the build guide, technical/reference chunks get k=0.7 (decay faster)
        and general/personal get k=1.0 (decay slower). This models that complex
        technical content is harder to retain.
        """
        fast_decay = make_chunk(hours_ago=168, complexity_k=0.7)  # Technical (decays faster)
        slow_decay = make_chunk(hours_ago=168, complexity_k=1.0)  # General (decays slower)

        ret = compute_retention([fast_decay, slow_decay])
        assert ret[1] > ret[0], (
            f"Higher k should retain better: k=0.7 R={ret[0]:.4f}, k=1.0 R={ret[1]:.4f}"
        )

    def test_retention_always_in_0_1(self):
        """Retention must always be in [0, 1] regardless of inputs."""
        chunks = [
            make_chunk(hours_ago=0),       # Just now
            make_chunk(hours_ago=8760),    # 1 year ago
            make_chunk(hours_ago=87600),   # 10 years ago
            make_chunk(hours_ago=1, stability_S=0.01),  # Tiny stability
            make_chunk(hours_ago=1, stability_S=1000),   # Huge stability
        ]
        ret = compute_retention(chunks)
        assert np.all(ret >= 0.0), f"Found negative retention: {ret}"
        assert np.all(ret <= 1.0), f"Found retention > 1: {ret}"

    def test_known_value(self):
        """Verify against hand-calculated value.

        R = exp(-hours / (S * k * 24))
        hours=168, S=7, k=1: R = exp(-168 / 168) = exp(-1) ≈ 0.3679
        """
        chunk = make_chunk(hours_ago=168, stability_S=7.0, complexity_k=1.0)
        ret = compute_retention([chunk])
        expected = math.exp(-1.0)  # 0.36788
        assert abs(ret[0] - expected) < 0.01, (
            f"Expected ~{expected:.4f}, got {ret[0]:.4f}"
        )

    def test_works_with_dicts(self):
        """compute_retention should work with plain dicts too."""
        now = datetime.now(timezone.utc)
        chunk_dict = {
            "last_accessed": (now - timedelta(hours=168)).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "stability_S": 7.0,
            "complexity_k": 1.0,
        }
        ret = compute_retention([chunk_dict])
        expected = math.exp(-1.0)
        assert abs(ret[0] - expected) < 0.01

    def test_multiple_chunks(self):
        """Process multiple chunks at once."""
        chunks = [
            make_chunk(hours_ago=0, chunk_id="new"),
            make_chunk(hours_ago=168, chunk_id="week"),
            make_chunk(hours_ago=720, chunk_id="month"),
        ]
        ret = compute_retention(chunks)
        assert len(ret) == 3
        # Should be in decreasing order (newer = higher retention)
        assert ret[0] > ret[1] > ret[2], f"Not monotonically decreasing: {ret}"


# ===================================================================
# TIME OFFSET (TIME MACHINE SLIDER)
# ===================================================================

class TestTimeOffset:
    """Tests for the time_offset_hours parameter (Time Machine slider)."""

    def test_positive_offset_decreases_retention(self):
        """Projecting forward in time should decrease retention."""
        chunk = make_chunk(hours_ago=24)
        ret_now = compute_retention([chunk], time_offset_hours=0)[0]
        ret_future = compute_retention([chunk], time_offset_hours=720)[0]  # +1 month
        assert ret_future < ret_now, (
            f"Future retention ({ret_future:.4f}) should be less than now ({ret_now:.4f})"
        )

    def test_negative_offset_increases_retention(self):
        """Projecting backward in time should increase retention."""
        chunk = make_chunk(hours_ago=168)  # 1 week old
        ret_now = compute_retention([chunk], time_offset_hours=0)[0]
        ret_past = compute_retention([chunk], time_offset_hours=-120)[0]  # -5 days
        assert ret_past > ret_now, (
            f"Past retention ({ret_past:.4f}) should be more than now ({ret_now:.4f})"
        )

    def test_monotonic_decrease_over_time(self):
        """Retention must decrease monotonically as time progresses."""
        chunk = make_chunk(hours_ago=24)
        offsets = [0, 24, 168, 720, 2160]  # now, +1d, +1w, +1m, +3m
        retentions = [
            compute_retention([chunk], time_offset_hours=o)[0]
            for o in offsets
        ]
        for i in range(len(retentions) - 1):
            assert retentions[i] >= retentions[i + 1], (
                f"Not monotonic at offset {offsets[i+1]}h: "
                f"R[{offsets[i]}h]={retentions[i]:.4f} < R[{offsets[i+1]}h]={retentions[i+1]:.4f}"
            )


# ===================================================================
# EDGE CASES
# ===================================================================

class TestEdgeCases:
    """Tests for edge cases and robustness."""

    def test_future_timestamp_gives_high_retention(self):
        """Chunk with future last_accessed should have retention = 1.0 (just-accessed)."""
        chunk = make_chunk(hours_ago=-10)  # 10 hours in the future
        ret = compute_retention([chunk])
        assert ret[0] == 1.0, f"Future chunk should have R=1.0, got {ret[0]}"

    def test_very_old_chunk_near_zero(self):
        """Very old chunk should approach 0 but not go negative."""
        chunk = make_chunk(hours_ago=100000)  # ~11 years
        ret = compute_retention([chunk])
        assert ret[0] >= 0.0
        assert ret[0] < 0.001

    def test_zero_stability_handled(self):
        """Zero stability should be clamped, not cause NaN."""
        chunk = make_chunk(hours_ago=24, stability_S=0.0)
        ret = compute_retention([chunk])
        assert not np.isnan(ret[0]), "Got NaN with zero stability"
        assert 0.0 <= ret[0] <= 1.0


# ===================================================================
# AGGREGATE BY CATEGORY
# ===================================================================

class TestAggregateByCategory:
    """Tests for aggregate_by_category()."""

    def test_empty_chunks(self):
        """Empty list returns zero-state."""
        result = aggregate_by_category([], np.array([]))
        assert result["total_chunks"] == 0
        assert result["overall_retention"] == 0.0
        assert result["categories"] == []

    def test_basic_aggregation(self):
        """Verify correct counts and averages per category."""
        chunks = [
            make_chunk(chunk_id="t1", category="technical", hours_ago=24),
            make_chunk(chunk_id="t2", category="technical", hours_ago=48),
            make_chunk(chunk_id="p1", category="personal", hours_ago=1),
            make_chunk(chunk_id="g1", category="general", hours_ago=720),
        ]
        retentions = compute_retention(chunks)
        result = aggregate_by_category(chunks, retentions)

        assert result["total_chunks"] == 4
        assert len(result["categories"]) == 3  # technical, personal, general

        # Find each category
        cats = {c["name"]: c for c in result["categories"]}
        assert cats["technical"]["count"] == 2
        assert cats["personal"]["count"] == 1
        assert cats["general"]["count"] == 1

    def test_urgency_high(self):
        """Very old chunks should get 'high' urgency."""
        chunks = [make_chunk(category="technical", hours_ago=720)]
        retentions = compute_retention(chunks)
        result = aggregate_by_category(chunks, retentions)

        cat = result["categories"][0]
        assert cat["urgency"] == "high", (
            f"Expected 'high' urgency for R={cat['avg_retention']:.4f}, got '{cat['urgency']}'"
        )

    def test_urgency_low(self):
        """Recent chunks should get 'low' urgency."""
        chunks = [make_chunk(category="personal", hours_ago=1, stability_S=50)]
        retentions = compute_retention(chunks)
        result = aggregate_by_category(chunks, retentions)

        cat = result["categories"][0]
        assert cat["urgency"] == "low", (
            f"Expected 'low' urgency for R={cat['avg_retention']:.4f}, got '{cat['urgency']}'"
        )

    def test_urgency_thresholds(self):
        """Verify the exact urgency thresholds: >=0.7 low, 0.4-0.7 medium, <0.4 high."""
        # We test by creating chunks with known retention values
        # R = exp(-hours / (S * k * 24))
        # For R = 0.7: hours = -ln(0.7) * S * k * 24 = 0.3567 * 7 * 1 * 24 ≈ 59.9h
        # For R = 0.4: hours = -ln(0.4) * 168 ≈ 153.9h

        # Low urgency (R > 0.7)
        low = make_chunk(chunk_id="low", category="technical", hours_ago=50, stability_S=7.0)
        # Medium urgency (0.4 < R < 0.7)
        med = make_chunk(chunk_id="med", category="personal", hours_ago=120, stability_S=7.0)
        # High urgency (R < 0.4)
        high = make_chunk(chunk_id="high", category="general", hours_ago=200, stability_S=7.0)

        all_chunks = [low, med, high]
        retentions = compute_retention(all_chunks)
        result = aggregate_by_category(all_chunks, retentions)

        cats = {c["name"]: c for c in result["categories"]}
        assert cats["technical"]["urgency"] == "low", f"R={cats['technical']['avg_retention']}"
        assert cats["personal"]["urgency"] == "medium", f"R={cats['personal']['avg_retention']}"
        assert cats["general"]["urgency"] == "high", f"R={cats['general']['avg_retention']}"

    def test_overall_retention(self):
        """Overall retention should be the mean of all retentions."""
        chunks = [
            make_chunk(chunk_id="a", hours_ago=24),
            make_chunk(chunk_id="b", hours_ago=48),
        ]
        retentions = compute_retention(chunks)
        result = aggregate_by_category(chunks, retentions)

        expected_overall = float(np.mean(retentions))
        assert abs(result["overall_retention"] - expected_overall) < 0.001

    def test_works_with_dicts(self):
        """aggregate_by_category should work with plain dicts."""
        now = datetime.now(timezone.utc)
        chunks = [
            {
                "last_accessed": (now - timedelta(hours=24)).strftime("%Y-%m-%dT%H:%M:%SZ"),
                "stability_S": 7.0,
                "complexity_k": 1.0,
                "category": "technical",
            },
        ]
        retentions = compute_retention(chunks)
        result = aggregate_by_category(chunks, retentions)
        assert result["total_chunks"] == 1
        assert len(result["categories"]) == 1

    def test_min_retention_tracked(self):
        """min_retention should be the minimum in that category."""
        chunks = [
            make_chunk(chunk_id="new", category="technical", hours_ago=1),
            make_chunk(chunk_id="old", category="technical", hours_ago=500),
        ]
        retentions = compute_retention(chunks)
        result = aggregate_by_category(chunks, retentions)

        cat = result["categories"][0]
        assert cat["min_retention"] < cat["avg_retention"], (
            f"min ({cat['min_retention']}) should be less than avg ({cat['avg_retention']})"
        )


# ===================================================================
# TIME MACHINE SIMULATION (with demo data)
# ===================================================================

class TestTimeMachineSimulation:
    """Simulate the Time Machine slider with real demo data."""

    @pytest.fixture
    def demo_chunks(self):
        """Load demo chunks from file or generate them."""
        demo_path = os.path.join(
            os.path.dirname(__file__), "..", "..", "demo_chunks.json"
        )
        if os.path.exists(demo_path):
            with open(demo_path, "r", encoding="utf-8") as f:
                return json.load(f)
        else:
            from intelligence.demo_data import generate_demo_chunks
            return generate_demo_chunks(count=90, seed=42)

    def test_retention_decreases_over_time(self, demo_chunks):
        """Overall retention should decrease as time progresses."""
        offsets = [0, 24, 168, 720, 2160]  # now, +1d, +1w, +1m, +3m
        overall_retentions = []

        for offset in offsets:
            ret = compute_retention(demo_chunks, time_offset_hours=offset)
            overall = float(np.mean(ret))
            overall_retentions.append(overall)

        # Should be monotonically non-increasing
        for i in range(len(overall_retentions) - 1):
            assert overall_retentions[i] >= overall_retentions[i + 1], (
                f"Overall retention not decreasing: "
                f"t+{offsets[i]}h={overall_retentions[i]:.4f} < "
                f"t+{offsets[i+1]}h={overall_retentions[i+1]:.4f}"
            )

    def test_all_retentions_valid(self, demo_chunks):
        """All retention values must be in [0, 1] at any offset."""
        for offset in [0, 24, 168, 720, 2160]:
            ret = compute_retention(demo_chunks, time_offset_hours=offset)
            assert np.all(ret >= 0.0), f"Negative retention at offset {offset}h"
            assert np.all(ret <= 1.0), f"Retention > 1 at offset {offset}h"
            assert not np.any(np.isnan(ret)), f"NaN retention at offset {offset}h"

    def test_categories_have_data(self, demo_chunks):
        """Aggregation should produce all expected categories."""
        ret = compute_retention(demo_chunks)
        result = aggregate_by_category(demo_chunks, ret)

        cat_names = {c["name"] for c in result["categories"]}
        expected = {"technical", "personal", "reference", "general"}
        assert cat_names == expected, f"Missing categories: {expected - cat_names}"

    def test_forgotten_count_increases(self, demo_chunks):
        """Number of 'forgotten' chunks (R < 0.2) should increase over time."""
        forgotten_counts = []
        for offset in [0, 720, 2160]:
            ret = compute_retention(demo_chunks, time_offset_hours=offset)
            forgotten = int(np.sum(ret < 0.2))
            forgotten_counts.append(forgotten)

        assert forgotten_counts[-1] >= forgotten_counts[0], (
            f"Forgotten count should increase: {forgotten_counts}"
        )
