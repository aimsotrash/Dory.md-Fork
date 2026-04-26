"""
Quiz Generator
==============

Generates multiple-choice questions from fading chunks using Groq LLM.
Returns questions with 4 options each, one correct answer.

Uses llama-3.3-70b-versatile with parallel inference via asyncio.gather().

Usage:
    from intelligence.quiz import generate_quiz_questions, generate_quiz_questions_sync
    questions = await generate_quiz_questions(chunks, target_count=5)
    # or synchronously:
    questions = generate_quiz_questions_sync(chunks, target_count=5)
"""

import asyncio
import json
import logging
import os

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Module-level setup
# ---------------------------------------------------------------------------

_CLIENT = None
_MODEL = "llama-3.3-70b-versatile"

QUIZ_SYSTEM_PROMPT = """You are creating a recall quiz to help someone remember \
what they wrote. Given a chunk of text, generate ONE multiple-choice question \
that tests whether the reader remembers the key fact or insight in the chunk.

Rules:
1. The question must be answerable from the chunk content alone
2. Provide exactly 4 options labeled A, B, C, D
3. Exactly ONE option is correct (must be derivable from the chunk)
4. The other three options must be PLAUSIBLE but WRONG — same domain, similar \
form, but factually incorrect for this chunk
5. Do not write "According to the chunk..." — write the question directly
6. Keep the question under 25 words

Respond with ONLY a JSON object:
{"question": "...", "options": ["A. ...", "B. ...", "C. ...", "D. ..."], "correct_index": 0}
where correct_index is 0-based (0=A, 1=B, 2=C, 3=D). No markdown, no explanation."""


def _get_client():
    """Lazy-init the async Groq client."""
    global _CLIENT
    if _CLIENT is None:
        from groq import AsyncGroq

        api_key = os.environ.get("GROQ_API_KEY", "")
        if not api_key:
            logger.warning("GROQ_API_KEY not set. Quiz generator will fail.")
        _CLIENT = AsyncGroq(api_key=api_key)
    return _CLIENT


# ---------------------------------------------------------------------------
# Per-chunk question generation
# ---------------------------------------------------------------------------


async def _generate_one_question(
    chunk_id: str,
    content: str,
) -> dict | None:
    """Generate one MCQ for a single chunk.

    Args:
        chunk_id: The chunk's ID.
        content: The chunk's text content.

    Returns:
        A question dict or None if generation failed.
    """
    client = _get_client()

    user_msg = f"Chunk:\n{content[:600]}\n\nGenerate one MCQ."

    try:
        response = await client.chat.completions.create(
            model=_MODEL,
            messages=[
                {"role": "system", "content": QUIZ_SYSTEM_PROMPT},
                {"role": "user", "content": user_msg},
            ],
            temperature=0.3,  # slight variety, mostly deterministic
            max_tokens=300,
        )

        raw = response.choices[0].message.content or ""
        raw = raw.strip()

        # Strip markdown code fences if present
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
            raw = raw.strip()

        parsed = json.loads(raw)

        # Validate structure
        question = parsed.get("question", "")
        options = parsed.get("options", [])
        correct_index = parsed.get("correct_index", 0)

        if not question or not isinstance(question, str):
            logger.warning(f"Invalid question for chunk {chunk_id}")
            return None

        if not isinstance(options, list) or len(options) != 4:
            logger.warning(
                f"Invalid options for chunk {chunk_id}: expected 4, got {len(options) if isinstance(options, list) else 'non-list'}"
            )
            return None

        if not all(isinstance(o, str) and o.strip() for o in options):
            logger.warning(f"Empty option strings for chunk {chunk_id}")
            return None

        if not isinstance(correct_index, int) or correct_index < 0 or correct_index > 3:
            logger.warning(
                f"Invalid correct_index {correct_index} for chunk {chunk_id}, clamping"
            )
            correct_index = max(0, min(int(correct_index), 3))

        return {
            "chunk_id": chunk_id,
            "question": question,
            "options": options,
            "correct_index": correct_index,
        }

    except json.JSONDecodeError as e:
        logger.warning(f"Groq returned invalid JSON for chunk {chunk_id}: {e}")
        return None
    except Exception as e:
        logger.warning(f"Groq API error for chunk {chunk_id}: {e}")
        return None


# ---------------------------------------------------------------------------
# Main quiz generation
# ---------------------------------------------------------------------------


async def generate_quiz_questions(
    chunks: list,
    target_count: int = 5,
) -> list[dict]:
    """Generate multiple-choice questions from chunks using Groq LLM.

    Runs all generations in parallel via asyncio.gather() for speed
    (5 questions in ~1-2 seconds instead of 5-10 sequentially).

    Args:
        chunks: List of ChunkLike objects or dicts.
        target_count: Number of questions to generate (default 5).

    Returns:
        List of question dicts:
        [
            {
                'chunk_id': str,
                'question': str,
                'options': list[str] (length 4),
                'correct_index': int (0-3)
            },
            ...
        ]
    """
    if not chunks:
        return []

    # Take min(target_count, len(chunks)) chunks
    selected = chunks[:min(target_count, len(chunks))]

    # Extract chunk_id and content
    tasks = []
    for c in selected:
        if isinstance(c, dict):
            chunk_id = c["id"]
            content = c["content"]
        else:
            chunk_id = c.id
            content = c.content
        tasks.append(_generate_one_question(chunk_id, content))

    # Run all in parallel
    results = await asyncio.gather(*tasks, return_exceptions=True)

    # Collect successful results
    questions = []
    for result in results:
        if isinstance(result, Exception):
            logger.warning(f"Question generation exception: {result}")
            continue
        if result is not None:
            questions.append(result)

    logger.info(
        f"Generated {len(questions)}/{len(selected)} quiz questions."
    )
    return questions


# ---------------------------------------------------------------------------
# Sync wrapper
# ---------------------------------------------------------------------------


def generate_quiz_questions_sync(
    chunks: list,
    target_count: int = 5,
) -> list[dict]:
    """Synchronous wrapper for generate_quiz_questions.

    Uses asyncio.run() to run the async version.
    Safe to call from Person 1's BackgroundTask (runs in thread pool).

    Args:
        chunks: List of ChunkLike objects or dicts.
        target_count: Number of questions to generate.

    Returns:
        List of question dicts.
    """
    return asyncio.run(generate_quiz_questions(chunks, target_count))


if __name__ == "__main__":
    # Quick test with sample chunks
    import sys
    import os

    sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

    from intelligence.demo_data import generate_demo_chunks

    demo = generate_demo_chunks(count=10, seed=42)
    questions = generate_quiz_questions_sync(demo[:5])

    print(f"\nGenerated {len(questions)} questions:\n")
    for i, q in enumerate(questions, 1):
        print(f"  Q{i}: {q['question']}")
        for j, opt in enumerate(q["options"]):
            marker = " ✓" if j == q["correct_index"] else ""
            print(f"      {opt}{marker}")
        print()
