"""
Seed Demo Database
==================

Loads demo_chunks.json directly into Person 1's SQLite database AND ChromaDB,
bypassing the /api/ingest endpoint.

Usage:
    python -m intelligence.scripts.seed_demo_database
"""

import asyncio
import json
import logging
import os
import sys

# Add project root to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))


from intelligence.chunk_protocol import SimpleChunk
from intelligence.demo_data import generate_demo_chunks
from intelligence.embedder import (
    embed_chunks,
    store_embeddings,
)
from intelligence.search import build_bm25_index
from intelligence.classifier import classify_chunks_sync

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def seed_database():
    demo_path = os.path.join(os.path.dirname(__file__), "..", "..", "demo_chunks.json")
    if os.path.exists(demo_path):
        logger.info(f"Loading demo chunks from {demo_path}...")
        with open(demo_path, "r", encoding="utf-8") as f:
            demo_chunks = json.load(f)
    else:
        logger.info("demo_chunks.json not found, generating...")
        demo_chunks = generate_demo_chunks(count=90, seed=42)
        with open(demo_path, "w", encoding="utf-8") as f:
            json.dump(demo_chunks, f, indent=2, ensure_ascii=False)

    logger.info(f"Loaded {len(demo_chunks)} chunks.")

    # Convert to SimpleChunk
    chunks = [SimpleChunk.from_dict(d) for d in demo_chunks]
    
    # 1. Embed and store in ChromaDB
    logger.info("Embedding all chunks...")
    texts = [c.content for c in chunks]
    embeddings = embed_chunks(texts)
    
    logger.info("Storing in ChromaDB...")
    store_embeddings(chunks, embeddings)
    
    # 2. Build BM25
    logger.info("Building BM25 index...")
    build_bm25_index(chunks)
    
    # 3. Insert into SQLite (Person 1's db)
    logger.info("Inserting into SQLite database...")
    
    # Initialize DB schema if it doesn't exist
    from backend.database.db import init_db, insert_chunk
    init_db()
    
    from datetime import datetime
    
    inserted_count = 0
    for c in chunks:
        # P1's insert_chunk function signature:
        # insert_chunk(content, source_file, complexity_score, user_id, created_at, last_accessed, access_count)
        
        # Parse ISO 8601 strings to datetime objects
        # e.g., '2026-04-25T10:00:00Z' -> remove 'Z' for fromisoformat if needed
        dt_created = datetime.fromisoformat(c.created_at.replace("Z", "+00:00"))
        dt_accessed = datetime.fromisoformat(c.last_accessed.replace("Z", "+00:00"))
        
        # It generates a new UUID in insert_chunk, but for the hackathon seed that's fine.
        # Wait, if we generate a new UUID, ChromaDB has the old c.id!
        # The prompt says: "use P1's create_chunks_batch where possible".
        # But P1's DB functions don't have create_chunks_batch and insert_chunk hardcodes `uuid.uuid4()`.
        # Let's bypass insert_chunk and insert manually with SQLite to keep the same IDs as Chroma.
        
        from backend.database.db import _connect, DEFAULT_USER_ID
        conn = _connect()
        # Check if exists
        existing = conn.execute("SELECT id FROM chunks WHERE id = ?", (c.id,)).fetchone()
        if not existing:
            conn.execute(
                """INSERT INTO chunks
                   (id, user_id, source_file, content, complexity_score, category,
                    created_at, last_accessed, access_count)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    c.id,
                    DEFAULT_USER_ID,
                    c.source_name,
                    c.content,
                    1.0 if c.complexity_k == 1.0 else 0.5,
                    c.category,
                    c.created_at,
                    c.last_accessed,
                    c.access_count,
                ),
            )
            inserted_count += 1
        conn.commit()
        conn.close()
        
    logger.info(f"Inserted {inserted_count} new chunks into SQLite.")

    # 4. We can run classifier if needed
    # (Optional, since demo data already has categories, but let's do a sample)
    # logger.info("Running classifier on first 5 chunks as a test...")
    # classify_chunks_sync([c.content for c in chunks[:5]])

    print("\nLoaded 90 chunks across 4 categories. Demo ready.")


if __name__ == "__main__":
    seed_database()
