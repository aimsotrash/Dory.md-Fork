"""
ChunkLike Protocol
==================

Defines the typing Protocol for chunk-shaped objects.
This keeps intelligence modules decoupled from Person 1's SQLAlchemy models.
Any object with these fields can be used where ChunkLike is expected.
"""

from typing import Protocol, runtime_checkable
from datetime import datetime


@runtime_checkable
class ChunkLike(Protocol):
    """Protocol matching the Chunk JSON contract agreed upon by all 3 persons.

    Fields:
        id: Unique chunk identifier (e.g. 'chk_8a3f...')
        content: Chunk text, 200-500 chars
        source_type: How the chunk was ingested ('file', 'notion', etc.)
        source_name: Original filename or source identifier
        category: One of 'technical', 'personal', 'reference', 'general'
        created_at: ISO 8601 datetime when chunk was created
        last_accessed: ISO 8601 datetime of last access/review
        access_count: Number of times chunk has been accessed/reviewed
        stability_S: Decay stability parameter (increases with reviews)
        complexity_k: Complexity modifier (technical content decays faster)
    """

    id: str
    content: str
    source_type: str
    source_name: str
    category: str
    created_at: str  # ISO 8601 datetime string
    last_accessed: str  # ISO 8601 datetime string
    access_count: int
    stability_S: float
    complexity_k: float


class SimpleChunk:
    """Concrete implementation of ChunkLike for testing and demo data.

    Use this when you need to create chunk objects without Person 1's
    SQLAlchemy models (e.g., in tests, demo data loading, scripts).
    """

    def __init__(
        self,
        id: str,
        content: str,
        source_type: str = "file",
        source_name: str = "unknown",
        category: str = "general",
        created_at: str = "",
        last_accessed: str = "",
        access_count: int = 0,
        stability_S: float = 7.0,
        complexity_k: float = 1.0,
    ):
        self.id = id
        self.content = content
        self.source_type = source_type
        self.source_name = source_name
        self.category = category
        self.created_at = created_at or datetime.utcnow().isoformat() + "Z"
        self.last_accessed = last_accessed or self.created_at
        self.access_count = access_count
        self.stability_S = stability_S
        self.complexity_k = complexity_k

    def __repr__(self) -> str:
        return (
            f"SimpleChunk(id='{self.id}', category='{self.category}', "
            f"S={self.stability_S}, k={self.complexity_k}, "
            f"access_count={self.access_count})"
        )

    @classmethod
    def from_dict(cls, d: dict) -> "SimpleChunk":
        """Create a SimpleChunk from a dictionary (e.g., from demo_chunks.json)."""
        return cls(
            id=d["id"],
            content=d["content"],
            source_type=d.get("source_type", "file"),
            source_name=d.get("source_name", "unknown"),
            category=d.get("category", "general"),
            created_at=d.get("created_at", ""),
            last_accessed=d.get("last_accessed", ""),
            access_count=d.get("access_count", 0),
            stability_S=d.get("stability_S", 7.0),
            complexity_k=d.get("complexity_k", 1.0),
        )
