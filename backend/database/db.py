import os
import sqlite3
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

DB_PATH = Path(__file__).parent.parent / "data" / "dory.db"
SCHEMA_PATH = Path(__file__).parent / "schema.sql"

DEFAULT_USER_ID = "default"


def _connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def _migrate(conn: sqlite3.Connection) -> None:
    chunk_cols = {row[1] for row in conn.execute("PRAGMA table_info(chunks)").fetchall()}
    if "folder" not in chunk_cols:
        conn.execute("ALTER TABLE chunks ADD COLUMN folder TEXT DEFAULT NULL")

    user_cols = {row[1] for row in conn.execute("PRAGMA table_info(users)").fetchall()}
    if "name" not in user_cols:
        conn.execute("ALTER TABLE users ADD COLUMN name TEXT")
    if "password_hash" not in user_cols:
        conn.execute("ALTER TABLE users ADD COLUMN password_hash TEXT")
    conn.commit()


def init_db() -> None:
    conn = _connect()
    conn.executescript(SCHEMA_PATH.read_text())
    _migrate(conn)
    # Ensure the default demo user exists
    conn.execute(
        "INSERT OR IGNORE INTO users (id, email, name) VALUES (?, ?, ?)",
        (DEFAULT_USER_ID, "demo@dory.md", "Demo User"),
    )
    conn.commit()
    conn.close()


def get_connection() -> sqlite3.Connection:
    return _connect()


# ---------------------------------------------------------------------------
# User / auth helpers
# ---------------------------------------------------------------------------

def get_user_by_email(email: str) -> Optional[sqlite3.Row]:
    conn = _connect()
    row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    conn.close()
    return row


def create_user(email: str, name: str, password_hash: str) -> str:
    user_id = str(uuid.uuid4())
    conn = _connect()
    conn.execute(
        "INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?)",
        (user_id, email, name, password_hash),
    )
    conn.commit()
    conn.close()
    return user_id


def set_user_password_hash(user_id: str, password_hash: str) -> None:
    conn = _connect()
    conn.execute("UPDATE users SET password_hash = ? WHERE id = ?", (password_hash, user_id))
    conn.commit()
    conn.close()


# ---------------------------------------------------------------------------
# Chunk helpers
# ---------------------------------------------------------------------------

def insert_chunk(
    content: str,
    source_file: str,
    complexity_score: float,
    user_id: str = DEFAULT_USER_ID,
    created_at: Optional[datetime] = None,
    last_accessed: Optional[datetime] = None,
    access_count: int = 0,
) -> str:
    chunk_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    conn = _connect()
    conn.execute(
        """INSERT INTO chunks
           (id, user_id, source_file, content, complexity_score,
            created_at, last_accessed, access_count)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            chunk_id,
            user_id,
            source_file,
            content,
            complexity_score,
            (created_at or datetime.utcnow()).isoformat(),
            (last_accessed or datetime.utcnow()).isoformat(),
            access_count,
        ),
    )
    conn.commit()
    conn.close()
    return chunk_id


def get_chunk(chunk_id: str) -> Optional[sqlite3.Row]:
    conn = _connect()
    row = conn.execute("SELECT * FROM chunks WHERE id = ?", (chunk_id,)).fetchone()
    conn.close()
    return row


def get_all_chunks(user_id: str = DEFAULT_USER_ID) -> list[sqlite3.Row]:
    conn = _connect()
    rows = conn.execute(
        "SELECT * FROM chunks WHERE user_id = ?", (user_id,)
    ).fetchall()
    conn.close()
    return rows


def get_lowest_retention_chunks(user_id: str = DEFAULT_USER_ID, limit: int = 5) -> list[sqlite3.Row]:
    """Return chunks sorted by oldest last_accessed + lowest access_count — proxy for low retention."""
    conn = _connect()
    rows = conn.execute(
        """SELECT * FROM chunks WHERE user_id = ?
           ORDER BY last_accessed ASC, access_count ASC
           LIMIT ?""",
        (user_id, limit),
    ).fetchall()
    conn.close()
    return rows


def update_chunk_access(chunk_id: str, user_id: str = DEFAULT_USER_ID, source: str = "manual") -> sqlite3.Row:
    conn = _connect()
    now = datetime.utcnow().isoformat()
    conn.execute(
        "UPDATE chunks SET access_count = access_count + 1, last_accessed = ? WHERE id = ?",
        (now, chunk_id),
    )
    conn.execute(
        "INSERT INTO access_log (chunk_id, user_id, accessed_at, source) VALUES (?, ?, ?, ?)",
        (chunk_id, user_id, now, source),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM chunks WHERE id = ?", (chunk_id,)).fetchone()
    conn.close()
    return row


def update_chunk_access_by(chunk_id: str, delta: int, user_id: str = DEFAULT_USER_ID, source: str = "quiz") -> sqlite3.Row:
    """Increment access_count by an arbitrary delta (used by quiz correct answers)."""
    conn = _connect()
    now = datetime.utcnow().isoformat()
    conn.execute(
        "UPDATE chunks SET access_count = access_count + ?, last_accessed = ? WHERE id = ?",
        (delta, now, chunk_id),
    )
    conn.execute(
        "INSERT INTO access_log (chunk_id, user_id, accessed_at, source) VALUES (?, ?, ?, ?)",
        (chunk_id, user_id, now, source),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM chunks WHERE id = ?", (chunk_id,)).fetchone()
    conn.close()
    return row


def update_chunk_category(chunk_id: str, category: str) -> None:
    conn = _connect()
    conn.execute("UPDATE chunks SET category = ? WHERE id = ?", (category, chunk_id))
    conn.commit()
    conn.close()


def delete_chunk(chunk_id: str) -> None:
    conn = _connect()
    conn.execute("DELETE FROM access_log WHERE chunk_id = ?", (chunk_id,))
    conn.execute("DELETE FROM chunks WHERE id = ?", (chunk_id,))
    conn.commit()
    conn.close()


def update_chunk_content(chunk_id: str, content: str) -> None:
    conn = _connect()
    conn.execute("UPDATE chunks SET content = ? WHERE id = ?", (content, chunk_id))
    conn.commit()
    conn.close()


def set_chunk_folder(chunk_id: str, folder: Optional[str]) -> None:
    conn = _connect()
    conn.execute("UPDATE chunks SET folder = ? WHERE id = ?", (folder, chunk_id))
    conn.commit()
    conn.close()


def get_folders(user_id: str = DEFAULT_USER_ID) -> list[str]:
    conn = _connect()
    rows = conn.execute(
        "SELECT DISTINCT folder FROM chunks WHERE user_id = ? AND folder IS NOT NULL AND folder != '' ORDER BY folder",
        (user_id,),
    ).fetchall()
    conn.close()
    return [row["folder"] for row in rows]


def get_chunk_full(chunk_id: str) -> Optional[sqlite3.Row]:
    conn = _connect()
    row = conn.execute("SELECT * FROM chunks WHERE id = ?", (chunk_id,)).fetchone()
    conn.close()
    return row


def count_chunks(user_id: str = DEFAULT_USER_ID) -> int:
    conn = _connect()
    count = conn.execute(
        "SELECT COUNT(*) FROM chunks WHERE user_id = ?", (user_id,)
    ).fetchone()[0]
    conn.close()
    return count


# ---------------------------------------------------------------------------
# Quiz session helpers
# ---------------------------------------------------------------------------

def create_quiz_session(user_id: str = DEFAULT_USER_ID, total: int = 5) -> str:
    session_id = str(uuid.uuid4())
    conn = _connect()
    conn.execute(
        "INSERT INTO quiz_sessions (id, user_id, total_count) VALUES (?, ?, ?)",
        (session_id, user_id, total),
    )
    conn.commit()
    conn.close()
    return session_id


def complete_quiz_session(session_id: str, correct_count: int) -> None:
    conn = _connect()
    conn.execute(
        "UPDATE quiz_sessions SET completed_at = ?, correct_count = ? WHERE id = ?",
        (datetime.utcnow().isoformat(), correct_count, session_id),
    )
    conn.commit()
    conn.close()


# ---------------------------------------------------------------------------
# Notion token helpers
# ---------------------------------------------------------------------------

def store_oauth_token(user_id: str, access_token: str, workspace_id: str = "", bot_id: str = "") -> None:
    conn = _connect()
    conn.execute(
        """INSERT OR REPLACE INTO oauth_tokens
           (user_id, provider, access_token, workspace_id, bot_id)
           VALUES (?, 'notion', ?, ?, ?)""",
        (user_id, access_token, workspace_id, bot_id),
    )
    conn.commit()
    conn.close()


def get_oauth_token(user_id: str) -> Optional[str]:
    conn = _connect()
    row = conn.execute(
        "SELECT access_token FROM oauth_tokens WHERE user_id = ? AND provider = 'notion'",
        (user_id,),
    ).fetchone()
    conn.close()
    return row["access_token"] if row else None


def delete_oauth_token(user_id: str) -> None:
    conn = _connect()
    conn.execute("DELETE FROM oauth_tokens WHERE user_id = ? AND provider = 'notion'", (user_id,))
    conn.commit()
    conn.close()
