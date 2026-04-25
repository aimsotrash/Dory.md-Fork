"""
Inspect Demo Dataset
====================

Loads demo_chunks.json and prints summary statistics for eyeball verification.
"""

import json
import random
import sys
import os
from datetime import datetime
from collections import Counter

# Add project root to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from intelligence.demo_data import generate_demo_chunks, write_demo_dataset_to_file


def inspect():
    # Generate and write the file
    output_path = os.path.join(os.path.dirname(__file__), "..", "..", "demo_chunks.json")
    write_demo_dataset_to_file(output_path, count=90)

    # Load it back
    with open(output_path, "r", encoding="utf-8") as f:
        chunks = json.load(f)

    print(f"\n{'='*60}")
    print(f"DEMO DATASET INSPECTION")
    print(f"{'='*60}")

    # 1. Count per category
    cat_counts = Counter(c["category"] for c in chunks)
    print(f"\n--- Chunks per category ({len(chunks)} total) ---")
    for cat in ["technical", "personal", "reference", "general"]:
        count = cat_counts.get(cat, 0)
        pct = count / len(chunks) * 100
        print(f"  {cat:12s}: {count:3d} ({pct:.0f}%)")

    # 2. Date range
    dates = [datetime.strptime(c["created_at"], "%Y-%m-%dT%H:%M:%SZ") for c in chunks]
    print(f"\n--- Date range ---")
    print(f"  Oldest: {min(dates).strftime('%Y-%m-%d %H:%M')}")
    print(f"  Newest: {max(dates).strftime('%Y-%m-%d %H:%M')}")
    print(f"  Span:   {(max(dates) - min(dates)).days} days")

    # 3. Random samples
    print(f"\n--- 3 Random samples ---")
    rng = random.Random(123)
    samples = rng.sample(chunks, 3)
    for i, chunk in enumerate(samples, 1):
        print(f"\n  Sample {i}:")
        print(f"    ID:       {chunk['id']}")
        print(f"    Category: {chunk['category']}")
        print(f"    Source:   {chunk['source_name']}")
        print(f"    Created:  {chunk['created_at']}")
        print(f"    Accessed: {chunk['last_accessed']}")
        print(f"    Access#:  {chunk['access_count']}")
        print(f"    S={chunk['stability_S']}, k={chunk['complexity_k']}")
        print(f"    Content:  {chunk['content'][:120]}...")

    # 4. Access count distribution
    access_counts = Counter(c["access_count"] for c in chunks)
    print(f"\n--- Access count distribution ---")
    for ac in sorted(access_counts.keys()):
        count = access_counts[ac]
        bar = "#" * count
        print(f"  access_count={ac}: {count:3d} {bar}")

    # 5. Stability distribution
    print(f"\n--- Stability (S) distribution ---")
    stabilities = [c["stability_S"] for c in chunks]
    print(f"  Min:  {min(stabilities):.1f}")
    print(f"  Max:  {max(stabilities):.1f}")
    print(f"  Mean: {sum(stabilities)/len(stabilities):.1f}")

    print(f"\n{'='*60}")
    print(f"Dataset looks good! Ready for Phase 2 (Decay Engine).")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    inspect()
