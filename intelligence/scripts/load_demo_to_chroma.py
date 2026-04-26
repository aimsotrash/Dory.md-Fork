"""
Load Demo Dataset into ChromaDB
================================

Bulk-loads demo_chunks.json into ChromaDB for the search module.
Run this once to populate the vector store.

Usage:
    python -m intelligence.scripts.load_demo_to_chroma
"""

import json
import os
import sys
import time

# Add project root to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from intelligence.chunk_protocol import SimpleChunk
from intelligence.demo_data import generate_demo_chunks
from intelligence.embedder import (
    embed_chunks,
    store_embeddings,
    embed_query,
    query_embeddings,
    get_collection_stats,
)
from intelligence.search import build_bm25_index


def main():
    # 1. Load or generate demo chunks
    demo_path = os.path.join(os.path.dirname(__file__), "..", "..", "demo_chunks.json")
    if os.path.exists(demo_path):
        print(f"Loading demo chunks from {demo_path}...")
        with open(demo_path, "r", encoding="utf-8") as f:
            demo_chunks = json.load(f)
    else:
        print("demo_chunks.json not found, generating...")
        demo_chunks = generate_demo_chunks(count=90, seed=42)
        with open(demo_path, "w", encoding="utf-8") as f:
            json.dump(demo_chunks, f, indent=2, ensure_ascii=False)
        print(f"Wrote {len(demo_chunks)} chunks to {demo_path}")

    print(f"Loaded {len(demo_chunks)} chunks.")

    # 2. Create SimpleChunk objects
    chunks = [SimpleChunk.from_dict(d) for d in demo_chunks]
    print(f"Created {len(chunks)} SimpleChunk objects.")

    # 3. Embed all chunks
    print("Embedding all chunks (this may take a moment on first run)...")
    start = time.perf_counter()
    texts = [c.content for c in chunks]
    embeddings = embed_chunks(texts)
    embed_time = time.perf_counter() - start
    print(f"  Embedded {len(texts)} chunks in {embed_time:.2f}s ({len(texts)/embed_time:.0f} chunks/sec)")

    # 4. Store in ChromaDB
    print("Storing embeddings in ChromaDB...")
    store_embeddings(chunks, embeddings)
    stats = get_collection_stats()
    print(f"  ChromaDB collection: {stats['count']} chunks stored.")

    # 5. Build BM25 index
    print("Building BM25 index...")
    build_bm25_index(chunks)
    print("  BM25 index built.")

    # 6. Run sample queries
    print("\n--- Sample queries ---")
    test_queries = [
        "python async patterns",
        "coffee shop",
        "HTTP status codes",
        "react hooks cleanup",
        "travel plans spring",
    ]

    for query in test_queries:
        q_emb = embed_query(query)
        results = query_embeddings(q_emb, top_k=3)
        print(f"\n  Query: '{query}'")
        for rank, (chunk_id, sim, content) in enumerate(results, 1):
            print(f"    #{rank} [{sim:.3f}] {chunk_id}: {content[:80]}...")

    print(f"\n{'='*60}")
    print(f"Demo dataset loaded successfully!")
    print(f"  ChromaDB: {stats['count']} chunks")
    print(f"  BM25: index built")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
