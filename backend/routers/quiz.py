import json
from datetime import datetime, timezone

from fastapi import APIRouter

from core.decay_engine import calculate_retention
from database.db import (
    DEFAULT_USER_ID,
    create_quiz_session,
    get_lowest_retention_chunks,
    update_chunk_access_by,
)
from models.schemas import (
    QuizAnswerRequest,
    QuizAnswerResponse,
    QuizQuestion,
    QuizStartResponse,
)
from services.llm_service import get_llm

router = APIRouter()

# Fallback questions used if LLM is unavailable
_FALLBACK_QUESTIONS = [
    {
        "question": "What is the primary purpose of spaced repetition?",
        "options": [
            "To memorize information faster in one session",
            "To review information at increasing intervals to strengthen memory",
            "To organize notes by topic",
            "To summarize long documents automatically",
        ],
        "correct_index": 1,
    },
    {
        "question": "According to Ebbinghaus, how much information is forgotten after one week without review?",
        "options": ["~10%", "~25%", "~75%", "~99%"],
        "correct_index": 2,
    },
    {
        "question": "What does the stability factor S represent in the decay formula?",
        "options": [
            "The size of the document",
            "How often a chunk was reviewed (durability of memory)",
            "The complexity of the content",
            "The time since the note was created",
        ],
        "correct_index": 1,
    },
    {
        "question": "Which retention score range is classified as 'Critical' in Dory.md?",
        "options": ["0.8 – 1.0", "0.5 – 0.8", "0.2 – 0.5", "0.0 – 0.2"],
        "correct_index": 3,
    },
    {
        "question": "What does the Time Machine slider project?",
        "options": [
            "The history of your notes",
            "Future knowledge retention using the decay formula",
            "Your weekly study schedule",
            "The similarity between documents",
        ],
        "correct_index": 1,
    },
]

_MCQ_SYSTEM = (
    "You are a quiz generator. Given a text chunk, generate exactly 1 multiple-choice question "
    "that tests understanding of the content. Return ONLY valid JSON with this exact structure: "
    '{"question": "...", "options": ["A. ...", "B. ...", "C. ...", "D. ..."], "correct_index": 0} '
    "where correct_index is 0-based. No markdown, no explanation."
)


def _generate_question(chunk_id: str, content: str, access_count: int, complexity_score: float, source_file: str, fallback_q: dict) -> QuizQuestion:
    last_accessed = datetime.now(tz=timezone.utc)
    r = calculate_retention(last_accessed, access_count, complexity_score)

    llm = get_llm()
    result = llm.complete_json(
        prompt=f"Generate a quiz question for this text:\n\n{content[:600]}",
        system=_MCQ_SYSTEM,
        fallback=fallback_q,
    )

    question = result.get("question", fallback_q["question"])
    options = result.get("options", fallback_q["options"])
    correct_index = int(result.get("correct_index", fallback_q["correct_index"]))

    # Validate structure
    if not isinstance(options, list) or len(options) < 2:
        options = fallback_q["options"]
        correct_index = fallback_q["correct_index"]
    correct_index = max(0, min(correct_index, len(options) - 1))

    return QuizQuestion(
        chunk_id=chunk_id,
        question=question,
        options=options,
        correct_index=correct_index,
        retention=round(r, 4),
        source_file=source_file,
    )


@router.post("/quiz/start", response_model=QuizStartResponse)
def start_quiz():
    rows = get_lowest_retention_chunks(DEFAULT_USER_ID, limit=5)
    session_id = create_quiz_session(DEFAULT_USER_ID, total=len(rows) or 5)

    if not rows:
        # No content yet — return pure fallback questions
        questions = [
            QuizQuestion(
                chunk_id=f"fallback-{i}",
                question=q["question"],
                options=q["options"],
                correct_index=q["correct_index"],
                retention=0.3,
                source_file="demo",
            )
            for i, q in enumerate(_FALLBACK_QUESTIONS)
        ]
        return QuizStartResponse(session_id=session_id, questions=questions)

    questions = []
    for i, row in enumerate(rows):
        fallback = _FALLBACK_QUESTIONS[i % len(_FALLBACK_QUESTIONS)]
        q = _generate_question(
            chunk_id=row["id"],
            content=row["content"],
            access_count=row["access_count"],
            complexity_score=row["complexity_score"],
            source_file=row["source_file"],
            fallback_q=fallback,
        )
        questions.append(q)

    return QuizStartResponse(session_id=session_id, questions=questions)


@router.post("/quiz/answer", response_model=QuizAnswerResponse)
def submit_answer(body: QuizAnswerRequest):
    correct = body.selected_index == body.correct_index
    if correct and not body.chunk_id.startswith("fallback-"):
        updated = update_chunk_access_by(body.chunk_id, delta=2, source="quiz")
        last_accessed = datetime.now(tz=timezone.utc)
        new_r = calculate_retention(last_accessed, updated["access_count"], updated["complexity_score"])
    else:
        new_r = 0.0

    return QuizAnswerResponse(
        correct=correct,
        correct_index=body.correct_index,
        new_retention=round(new_r, 4),
        message="Memory revived!" if correct else "Keep reviewing — you'll get it next time.",
    )
