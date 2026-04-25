"""
Decay Engine
============

NumPy-vectorized retention computation using modified Ebbinghaus forgetting curve.
Powers the dashboard and Time Machine slider.

Formula: R(t) = exp(-hours_since_access / (S * k * 24))

Where:
    - hours_since_access = (now - last_accessed) in hours + time_offset_hours
    - S = stability_S (chunk attribute, increases with reviews)
    - k = complexity_k (chunk attribute, complexity modifier)
    - Multiplying by 24 converts S (in days) to hours

Target performance: under 1ms for 2,300 chunks.

Usage:
    from intelligence.decay import compute_retention, aggregate_by_category
    retentions = compute_retention(chunks, time_offset_hours=0)
    health = aggregate_by_category(chunks, retentions)
"""

import calendar
import time
from datetime import datetime, timezone

import numpy as np


def _fast_parse_iso_z(s: str) -> float:
    """Fast parse of ISO 8601 timestamp with Z suffix to Unix timestamp.

    Handles format: '2026-04-25T10:00:00Z'
    ~3x faster than datetime.fromisoformat() for known-format strings.
    """
    # Manual parse: "YYYY-MM-DDTHH:MM:SSZ"
    return calendar.timegm((
        int(s[0:4]),   # year
        int(s[5:7]),   # month
        int(s[8:10]),  # day
        int(s[11:13]), # hour
        int(s[14:16]), # minute
        int(s[17:19]), # second
        0, 0, -1,
    ))


def compute_retention(
    chunks: list,
    time_offset_hours: float = 0,
) -> np.ndarray:
    """Compute retention R(t) for every chunk using vectorized NumPy.

    Args:
        chunks: List of ChunkLike objects (must have last_accessed, stability_S,
                complexity_k attributes or dict keys).
        time_offset_hours: Hours to project forward (positive) or backward
                          (negative) in time. Used by the Time Machine slider.

    Returns:
        np.ndarray of shape (len(chunks),) with values clamped to [0, 1].
    """
    if not chunks:
        return np.array([], dtype=np.float64)

    now_ts = time.time()  # Faster than datetime.now().timestamp()

    # Fast path: all dicts with string timestamps (common case)
    first = chunks[0]
    if isinstance(first, dict):
        S_arr = np.array(
            [c.get("stability_S", 7.0) for c in chunks], dtype=np.float64
        )
        k_arr = np.array(
            [c.get("complexity_k", 1.0) for c in chunks], dtype=np.float64
        )
        last_accessed_ts = np.array(
            [_fast_parse_iso_z(c["last_accessed"]) if (
                c["last_accessed"].endswith("Z") and len(c["last_accessed"]) == 20
            ) else datetime.fromisoformat(
                c["last_accessed"][:-1] + "+00:00" if c["last_accessed"].endswith("Z")
                else c["last_accessed"]
            ).timestamp()
            for c in chunks],
            dtype=np.float64,
        )
    else:
        # Object path
        S_arr = np.array(
            [getattr(c, "stability_S", 7.0) for c in chunks], dtype=np.float64
        )
        k_arr = np.array(
            [getattr(c, "complexity_k", 1.0) for c in chunks], dtype=np.float64
        )
        la_list = []
        for c in chunks:
            la = c.last_accessed
            if isinstance(la, str):
                if la.endswith("Z") and len(la) == 20:
                    la_list.append(_fast_parse_iso_z(la))
                else:
                    if la.endswith("Z"):
                        la = la[:-1] + "+00:00"
                    la_list.append(datetime.fromisoformat(la).timestamp())
            elif isinstance(la, datetime):
                la_list.append(la.timestamp())
            else:
                la_list.append(now_ts)
        last_accessed_ts = np.array(la_list, dtype=np.float64)

    # Clamp stability to minimum 0.1 to prevent division by zero / NaN
    S_arr = np.maximum(S_arr, 0.1)
    k_arr = np.maximum(k_arr, 0.1)

    # Vectorized computation
    hours_since_access = (now_ts - last_accessed_ts) / 3600.0 + time_offset_hours

    # Chunks accessed in the future get hours_since_access < 0
    # The formula still works: exp(positive) > 1, but we clamp to [0, 1]
    retentions = np.exp(-hours_since_access / (S_arr * k_arr * 24.0))

    # Clamp to [0, 1]
    return np.clip(retentions, 0.0, 1.0)


def aggregate_by_category(
    chunks: list,
    retentions: np.ndarray,
) -> dict:
    """Aggregate retention data by category for the dashboard.

    Args:
        chunks: List of ChunkLike objects or dicts.
        retentions: np.ndarray of retention values (from compute_retention).

    Returns:
        Dict matching the /api/health response contract:
        {
            'categories': [
                {
                    'name': str,
                    'avg_retention': float,
                    'min_retention': float,
                    'count': int,
                    'urgency': 'low' | 'medium' | 'high'
                },
                ...
            ],
            'total_chunks': int,
            'overall_retention': float
        }
    """
    if not chunks:
        return {
            "categories": [],
            "total_chunks": 0,
            "overall_retention": 0.0,
        }

    # Extract categories
    categories = []
    for chunk in chunks:
        if isinstance(chunk, dict):
            categories.append(chunk.get("category", "general"))
        else:
            categories.append(getattr(chunk, "category", "general"))

    categories = np.array(categories)
    unique_cats = np.unique(categories)

    result_categories = []
    for cat in unique_cats:
        mask = categories == cat
        cat_retentions = retentions[mask]

        if len(cat_retentions) == 0:
            continue

        avg_ret = float(np.mean(cat_retentions))
        min_ret = float(np.min(cat_retentions))
        count = int(np.sum(mask))

        # Urgency mapping based on avg_retention
        if avg_ret >= 0.7:
            urgency = "low"
        elif avg_ret >= 0.4:
            urgency = "medium"
        else:
            urgency = "high"

        result_categories.append({
            "name": str(cat),
            "avg_retention": round(avg_ret, 4),
            "min_retention": round(min_ret, 4),
            "count": count,
            "urgency": urgency,
        })

    # Sort by urgency (high first) for dashboard display
    urgency_order = {"high": 0, "medium": 1, "low": 2}
    result_categories.sort(key=lambda x: urgency_order.get(x["urgency"], 3))

    overall = float(np.mean(retentions)) if len(retentions) > 0 else 0.0

    return {
        "categories": result_categories,
        "total_chunks": len(chunks),
        "overall_retention": round(overall, 4),
    }


def benchmark_decay(n: int = 2300, runs: int = 100) -> None:
    """Benchmark compute_retention performance.

    Creates n synthetic chunks, runs compute_retention `runs` times,
    prints average ms per call.

    Args:
        n: Number of synthetic chunks.
        runs: Number of iterations for timing.
    """
    import random

    # Generate synthetic chunks as dicts
    rng = random.Random(42)
    now = datetime.now(timezone.utc)
    chunks = []
    for i in range(n):
        days_ago = rng.uniform(0.5, 180)
        ts = datetime(
            now.year, now.month, now.day,
            tzinfo=timezone.utc
        ).timestamp() - days_ago * 86400
        dt = datetime.fromtimestamp(ts, tz=timezone.utc)

        chunks.append({
            "last_accessed": dt.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "stability_S": rng.uniform(1.0, 100.0),
            "complexity_k": rng.uniform(0.5, 2.0),
            "category": rng.choice(["technical", "personal", "reference", "general"]),
        })

    # Warmup
    compute_retention(chunks)

    # Benchmark
    times = []
    for _ in range(runs):
        start = time.perf_counter()
        compute_retention(chunks)
        elapsed = (time.perf_counter() - start) * 1000  # ms
        times.append(elapsed)

    avg = sum(times) / len(times)
    p50 = sorted(times)[len(times) // 2]
    p95 = sorted(times)[int(len(times) * 0.95)]
    p99 = sorted(times)[int(len(times) * 0.99)]

    print(f"Benchmark: compute_retention({n} chunks) x {runs} runs")
    print(f"  avg: {avg:.3f} ms")
    print(f"  p50: {p50:.3f} ms")
    print(f"  p95: {p95:.3f} ms")
    print(f"  p99: {p99:.3f} ms")
    print(f"  Target: < 1.0 ms  |  Result: {'PASS' if avg < 1.0 else 'NEEDS OPTIMIZATION'}")


if __name__ == "__main__":
    benchmark_decay()
