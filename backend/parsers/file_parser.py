"""
Dispatch file bytes to the correct parser by extension/content-type.
Returns a plain UTF-8 string ready for chunking.
"""

import json
from pathlib import Path

from docx import Document
import io


def parse(filename: str, file_bytes: bytes) -> str:
    ext = Path(filename).suffix.lower()

    if ext == ".pdf":
        from parsers.pdf_parser import parse as _pdf
        return _pdf(file_bytes)

    if ext in (".html", ".htm"):
        from parsers.html_parser import parse as _html
        return _html(file_bytes)

    if ext in (".md", ".txt", ".rst"):
        return file_bytes.decode("utf-8", errors="replace")

    if ext == ".json":
        try:
            obj = json.loads(file_bytes.decode("utf-8", errors="replace"))
            return json.dumps(obj, indent=2, ensure_ascii=False)
        except json.JSONDecodeError:
            return file_bytes.decode("utf-8", errors="replace")

    if ext == ".docx":
        doc = Document(io.BytesIO(file_bytes))
        return "\n\n".join(p.text for p in doc.paragraphs if p.text.strip())

    # Fallback: try to decode as text
    return file_bytes.decode("utf-8", errors="replace")
