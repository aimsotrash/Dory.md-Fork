"""
End-to-End Integration Test for Search
======================================

Tests the entire search pipeline (Embedder + BM25 + Hybrid Search)
using the actual demo dataset.

Follows Prompt 14 of the build guide.
"""

import json
import os
import sys

# Add project root to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from intelligence.chunk_protocol import SimpleChunk
from intelligence.embedder import embed_chunks, store_embeddings
from intelligence.search import build_bm25_index, hybrid_search


def run_end_to_end_search():
    # 1. Load demo_chunks.json
    demo_path = os.path.join(os.path.dirname(__file__), "..", "..", "demo_chunks.json")
    if not os.path.exists(demo_path):
        from intelligence.demo_data import generate_demo_chunks
        demo_chunks = generate_demo_chunks(count=90, seed=42)
        with open(demo_path, "w", encoding="utf-8") as f:
            json.dump(demo_chunks, f, indent=2, ensure_ascii=False)
    else:
        with open(demo_path, "r", encoding="utf-8") as f:
            demo_chunks = json.load(f)

    chunks = [SimpleChunk.from_dict(d) for d in demo_chunks]
    
    # 2. Embed all chunks -> store in ChromaDB
    texts = [c.content for c in chunks]
    embeddings = embed_chunks(texts)
    store_embeddings(chunks, embeddings)
    
    # 3. Build BM25 index from same chunks
    build_bm25_index(chunks)
    
    # Create a mapping for quick content lookup
    chunk_map = {c.id: c.content for c in chunks}
    
    # 4. For 5 hand-picked queries, run hybrid_search and print top 3 results
    queries = [
        "asyncio python",       # expect technical chunks about async
        "coffee shop",          # expect personal chunk about Capitol Hill cafe
        "http status codes",    # expect reference chunk
        "react hooks",          # expect technical chunk
        "travel plans"          # expect personal chunk
    ]
    
    print("\n--- End-to-End Search Test ---")
    for query in queries:
        print(f"\nQuery: '{query}'")
        results = hybrid_search(query, top_k=3)
        for i, (chunk_id, score) in enumerate(results, 1):
            content = chunk_map.get(chunk_id, "Unknown chunk")
            print(f"  #{i} [{score:.4f}] {content[:100]}...")


if __name__ == "__main__":
    run_end_to_end_search()
