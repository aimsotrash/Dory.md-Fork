"""
Groq Classifier
===============

Classifies chunk texts into categories using Groq LLM.
Categories: technical, personal, reference, general.

Uses llama-3.3-70b-versatile with batched requests.

Usage:
    from intelligence.classifier import classify_chunks, classify_chunks_sync
    categories = await classify_chunks(["some text", "another text"])
    # or synchronously:
    categories = classify_chunks_sync(["some text", "another text"])
"""

import asyncio
import json
import logging
import os
import time

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Module-level setup
# ---------------------------------------------------------------------------

_CLIENT = None
_MODEL = "llama-3.3-70b-versatile"
_CATEGORIES = ["technical", "personal", "reference", "general"]

SYSTEM_PROMPT = """You are a text classifier. Categorize each text chunk into \
ONE of exactly four categories:
- technical: code, programming concepts, technical documentation, software architecture
- personal: personal notes, plans, preferences, life events, relationships
- reference: facts, definitions, lookup info, cheat sheets, formulas
- general: meeting notes, miscellaneous thoughts, anything that doesn't clearly fit above

Respond with ONLY a JSON array of category strings, one per chunk, in the same \
order as the input. No explanation. No other text. Example: ["technical", "personal", "general"]"""


def _get_client():
    """Lazy-init the async Groq client."""
    global _CLIENT
    if _CLIENT is None:
        from groq import AsyncGroq

        api_key = os.environ.get("GROQ_API_KEY", "")
        if not api_key:
            logger.warning("GROQ_API_KEY not set. Classifier will return defaults.")
        _CLIENT = AsyncGroq(api_key=api_key)
    return _CLIENT


# ---------------------------------------------------------------------------
# Core classification
# ---------------------------------------------------------------------------


async def classify_chunks(
    texts: list[str],
    batch_size: int = 10,
) -> list[str]:
    """Classify a list of chunk texts into categories using Groq LLM.

    Processes in batches to stay within context window and rate limits.

    Args:
        texts: List of chunk content strings to classify.
        batch_size: Number of chunks per Groq API call (default 10).

    Returns:
        List of category strings, one per text, in same order.
        Each is one of: 'technical', 'personal', 'reference', 'general'.
    """
    if not texts:
        return []

    client = _get_client()
    all_categories = []

    for batch_start in range(0, len(texts), batch_size):
        batch_end = min(batch_start + batch_size, len(texts))
        batch = texts[batch_start:batch_end]

        # Build the user message with numbered chunks
        numbered_chunks = []
        for i, text in enumerate(batch, 1):
            # Truncate to first 200 chars for classification
            truncated = text[:200].strip()
            numbered_chunks.append(f"[{i}] {truncated}")

        user_msg = "Classify these chunks:\n\n" + "\n\n".join(numbered_chunks)

        try:
            response = await client.chat.completions.create(
                model=_MODEL,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_msg},
                ],
                temperature=0,
                max_tokens=200,
            )

            raw = response.choices[0].message.content or ""
            raw = raw.strip()

            # Strip markdown code fences if present
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
                raw = raw.strip()

            # Parse the JSON array
            parsed = json.loads(raw)

            if isinstance(parsed, list):
                # Validate each category
                batch_categories = []
                for cat in parsed:
                    if isinstance(cat, str) and cat.lower() in _CATEGORIES:
                        batch_categories.append(cat.lower())
                    else:
                        batch_categories.append("general")

                # Pad or truncate to match batch size
                while len(batch_categories) < len(batch):
                    batch_categories.append("general")
                batch_categories = batch_categories[: len(batch)]

                all_categories.extend(batch_categories)
            else:
                logger.warning(f"Groq returned non-array: {type(parsed)}")
                all_categories.extend(["general"] * len(batch))

        except json.JSONDecodeError as e:
            logger.warning(f"Groq returned invalid JSON: {e}")
            all_categories.extend(["general"] * len(batch))
        except Exception as e:
            logger.warning(f"Groq API error: {e}")
            all_categories.extend(["general"] * len(batch))

        # Rate limit: 0.5s sleep between batches (Groq free tier ~30 req/min)
        if batch_end < len(texts):
            await asyncio.sleep(0.5)

    return all_categories


# ---------------------------------------------------------------------------
# Sync wrapper for Person 1's BackgroundTask
# ---------------------------------------------------------------------------


def classify_chunks_sync(texts: list[str]) -> list[str]:
    """Synchronous wrapper for classify_chunks.

    Uses asyncio.run() to run the async version.
    Safe to call from Person 1's BackgroundTask (runs in thread pool).

    Args:
        texts: List of chunk content strings.

    Returns:
        List of category strings.
    """
    return asyncio.run(classify_chunks(texts))


if __name__ == "__main__":
    # Quick test with sample texts
    test_texts = [
        "Python asyncio.gather() runs coroutines concurrently and returns results in order.",
        "Coffee shop in Capitol Hill with great pour-over and WiFi.",
        "HTTP status codes: 200 OK, 404 Not Found, 500 Internal Server Error.",
        "Meeting notes from standup: backend team blocked on auth middleware.",
    ]
    results = classify_chunks_sync(test_texts)
    for text, cat in zip(test_texts, results):
        print(f"  [{cat:10s}] {text[:60]}...")
