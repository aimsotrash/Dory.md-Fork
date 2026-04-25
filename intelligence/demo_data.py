"""
Demo Dataset Generator
======================

Produces a realistic backdated dataset for the Time Machine slider demo.
Generates ~80-100 chunks distributed across 4 categories with varied
timestamps, access counts, and stability values spanning the past 60 days.

Usage:
    from intelligence.demo_data import generate_demo_chunks, write_demo_dataset_to_file
    chunks = generate_demo_chunks(count=90, seed=42)
    write_demo_dataset_to_file('demo_chunks.json')
"""

import json
import uuid
import random
from datetime import datetime, timedelta
from typing import Optional


# ---------------------------------------------------------------------------
# Content templates per category
# ---------------------------------------------------------------------------

TECHNICAL_TEMPLATES = [
    (
        "Notes on async patterns in Python: asyncio.gather() runs coroutines "
        "concurrently and returns results in order. Use asyncio.create_task() "
        "for fire-and-forget. Always handle CancelledError in long-running tasks. "
        "The event loop is single-threaded, so CPU-bound work blocks everything."
    ),
    (
        "PostgreSQL performance tuning: EXPLAIN ANALYZE is your best friend. "
        "Create indexes on columns used in WHERE and JOIN clauses. Use VACUUM "
        "ANALYZE regularly. Connection pooling with pgbouncer reduces overhead. "
        "Partial indexes save space when you only query a subset of rows."
    ),
    (
        "React useEffect cleanup: return a cleanup function to prevent memory "
        "leaks. The cleanup runs before the next effect and on unmount. Common "
        "mistake: forgetting to cancel fetch requests or clear timers. Use "
        "AbortController for fetch cleanup: signal.abort() in the return function."
    ),
    (
        "Docker volume mounting: use -v host_path:container_path for bind mounts. "
        "Named volumes persist data between container restarts. Use docker-compose "
        "volumes section for multi-container setups. Never store state in the "
        "container filesystem — it gets wiped on rebuild."
    ),
    (
        "TypeScript generics let you write reusable, type-safe functions. "
        "Example: function identity<T>(arg: T): T { return arg; } "
        "Use extends for constraints: <T extends HasLength>. "
        "Mapped types like Partial<T> and Required<T> transform existing types."
    ),
    (
        "Git rebase vs merge: rebase rewrites history for a clean linear timeline, "
        "merge preserves the full branch history. Use rebase for feature branches "
        "before merging to main. Never rebase shared branches. Interactive rebase "
        "(git rebase -i) lets you squash, edit, or reorder commits."
    ),
    (
        "WebSocket connection handling: always implement heartbeat/ping-pong to "
        "detect stale connections. Use exponential backoff for reconnection. "
        "Send a close frame before disconnecting. In Python, use websockets "
        "library with async for msg in ws pattern for clean consumption."
    ),
    (
        "Kubernetes pod lifecycle: Pending -> Running -> Succeeded/Failed. "
        "Use readiness probes to control traffic routing and liveness probes "
        "to restart unhealthy containers. Init containers run before app "
        "containers. Resource limits prevent noisy neighbor problems."
    ),
    (
        "Python dataclasses reduce boilerplate for data containers. Use "
        "@dataclass(frozen=True) for immutable objects. Field(default_factory=list) "
        "for mutable defaults. __post_init__ for validation. Slots=True in "
        "Python 3.10+ reduces memory usage significantly."
    ),
    (
        "REST API design: use nouns for resources (/users, /posts), HTTP verbs "
        "for actions (GET, POST, PUT, DELETE). Return 201 for creation, 204 for "
        "deletion. Use pagination for large collections. HATEOAS adds links to "
        "related resources in responses for discoverability."
    ),
    (
        "Redis caching strategies: cache-aside (lazy loading) is simplest — check "
        "cache first, fetch from DB on miss, write to cache. Write-through updates "
        "cache on every write. TTL prevents stale data. Use hash types for "
        "structured objects. Monitor hit rate with INFO stats."
    ),
    (
        "CSS Grid vs Flexbox: Grid is 2D (rows + columns), Flexbox is 1D (row OR "
        "column). Use Grid for page layouts, Flexbox for component alignment. "
        "grid-template-areas gives named regions. fr unit distributes remaining "
        "space. minmax() prevents overflow on small screens."
    ),
]

PERSONAL_TEMPLATES = [
    (
        "Coffee shop in Capitol Hill I want to revisit — the one with the exposed "
        "brick and the pour-over bar. They had a single-origin Ethiopian that was "
        "incredible. Open until 8pm weekdays. Good WiFi, not too crowded on "
        "Tuesday afternoons. Perfect study spot."
    ),
    (
        "Recipe ideas for meal prep this week: overnight oats with banana and "
        "cinnamon, sheet pan chicken with roasted vegetables, black bean tacos "
        "with avocado crema. Need to buy: chicken thighs, sweet potatoes, "
        "black beans, oats, fresh cilantro."
    ),
    (
        "Books to read this quarter: 'Designing Data-Intensive Applications' "
        "by Martin Kleppmann (technical), 'The Design of Everyday Things' by "
        "Don Norman (design thinking), 'Atomic Habits' by James Clear (productivity). "
        "Start with DDIA since it's most relevant to work."
    ),
    (
        "Workout routine update: switch to push/pull/legs split. Monday: bench, "
        "overhead press, tricep dips. Wednesday: deadlift, rows, bicep curls. "
        "Friday: squats, lunges, calf raises. Add 5 lbs every two weeks. "
        "Rest days: active recovery or light cardio."
    ),
    (
        "Travel plans for spring break: considering Portland or Vancouver. "
        "Portland has Powell's Books and great food scene. Vancouver has Stanley "
        "Park and dim sum. Budget about $800 for 4 days including Airbnb. "
        "Book flights at least 3 weeks ahead for best prices."
    ),
    (
        "Birthday gift ideas for Mom: she mentioned wanting a nice journal, "
        "maybe a Leuchtturm1917. Also considering a cooking class subscription "
        "or a nice scarf for winter. Budget: $50-75. Her birthday is May 12th. "
        "Order by May 5th for shipping."
    ),
    (
        "Apartment checklist for lease renewal: negotiate rent (comparable units "
        "are $100/month cheaper), ask about parking spot, report the leaky faucet "
        "in bathroom BEFORE signing. Lease expires June 30. Start looking at "
        "alternatives by May 1 if they won't negotiate."
    ),
    (
        "Side project ideas: build a CLI tool for tracking reading notes, "
        "contribute to an open source project (maybe FastAPI or Pydantic), "
        "start a blog about distributed systems learnings. Pick ONE and commit "
        "for 30 days. Don't spread thin."
    ),
]

REFERENCE_TEMPLATES = [
    (
        "NumPy broadcasting rules: (1) arrays with different ndim are padded "
        "with 1s on the left, (2) arrays with size 1 along any axis are stretched "
        "to match, (3) if sizes disagree and neither is 1, raise error. "
        "Example: (3,1) + (1,4) -> (3,4). Common gotcha: (3,) + (3,1) works."
    ),
    (
        "HTTP status code meanings: 200 OK, 201 Created, 204 No Content, "
        "301 Moved Permanently, 304 Not Modified, 400 Bad Request, "
        "401 Unauthorized (really means unauthenticated), 403 Forbidden, "
        "404 Not Found, 429 Too Many Requests, 500 Internal Server Error, "
        "502 Bad Gateway, 503 Service Unavailable."
    ),
    (
        "Git commands I always forget: git stash -u (include untracked), "
        "git log --oneline --graph (visual branch history), "
        "git reflog (recover lost commits), git cherry-pick <hash> (copy one commit), "
        "git bisect start/bad/good (binary search for bug introduction)."
    ),
    (
        "Regex cheat sheet: \\d digit, \\w word char, \\s whitespace, . any char, "
        "* 0+, + 1+, ? 0 or 1, {n,m} n to m times, ^ start, $ end, "
        "(?:...) non-capturing group, (?=...) lookahead, (?<=...) lookbehind, "
        "\\b word boundary. Python: use re.compile() for reuse."
    ),
    (
        "SQL JOIN types: INNER JOIN (matching rows only), LEFT JOIN (all from left + "
        "matching from right), RIGHT JOIN (opposite), FULL OUTER JOIN (all rows from "
        "both), CROSS JOIN (cartesian product). Use LEFT JOIN when you want to keep "
        "all records from the primary table even without matches."
    ),
    (
        "Big O complexity reference: O(1) constant — hash lookup. O(log n) — binary "
        "search. O(n) — linear scan. O(n log n) — merge sort, heap sort. O(n^2) — "
        "bubble sort, nested loops. O(2^n) — recursive fibonacci. Space complexity "
        "matters too: merge sort is O(n) space, quicksort is O(log n)."
    ),
    (
        "Python string formatting: f-strings are fastest (f'{x:.2f}'). "
        "Format spec: :< left align, :> right align, :^ center, :, comma separator, "
        ":.nf n decimal places, :% percentage, :b binary. "
        "Datetime: f\"{dt:%Y-%m-%d %H:%M}\". Debug: f\"{expr=}\" prints expr=value."
    ),
    (
        "Linux file permissions: rwxrwxrwx = owner/group/other. chmod 755 = "
        "rwxr-xr-x (owner full, others read+execute). chmod 644 = rw-r--r-- "
        "(owner read+write, others read). Octal: r=4, w=2, x=1. "
        "chown user:group file. umask sets default permissions."
    ),
]

GENERAL_TEMPLATES = [
    (
        "Meeting notes from standup: backend team is blocked on the auth "
        "middleware refactor. Frontend is ahead of schedule on the dashboard. "
        "Action items: review PR #142 by EOD, schedule design review for "
        "Thursday. Sprint ends Friday — 3 stories still in progress."
    ),
    (
        "Random thought: the best tools disappear into the workflow. You don't "
        "think about the hammer, you think about the nail. Most productivity "
        "apps fail because they make you think about the app instead of the "
        "work. Simplicity is the ultimate sophistication."
    ),
    (
        "Half-formed idea about knowledge management: what if notes had an "
        "expiration date? Not deletion, but a gentle fade. You'd be forced to "
        "revisit and decide: is this still relevant? Archive or refresh. "
        "Active curation > passive hoarding."
    ),
    (
        "Article summary — 'The Bitter Lesson' by Rich Sutton: general methods "
        "that leverage computation ultimately win over methods that leverage "
        "human knowledge. Search and learning scale with compute. Hand-crafted "
        "features always lose to learned features given enough data."
    ),
    (
        "Podcast notes — Lex Fridman episode on memory: human memory is "
        "reconstructive, not reproductive. Each recall slightly modifies the "
        "memory. Sleep consolidation moves memories from hippocampus to "
        "neocortex. Spaced repetition works because it triggers reconsolidation."
    ),
    (
        "Team retrospective notes: what went well — fast iteration on the API. "
        "What didn't — merge conflicts from parallel work on the same files. "
        "Action: adopt trunk-based development with feature flags. Also: "
        "standups are running too long, cap at 10 minutes."
    ),
    (
        "Conference talk ideas: 'Building Search Systems That Forget' — about "
        "decay-weighted retrieval. Could be a lightning talk (5 min) or full "
        "session (30 min). Target PyCon 2027 or a local meetup first. "
        "Need to build a working demo and collect benchmarks."
    ),
    (
        "Interesting paper: 'Retrieval-Augmented Generation for Knowledge-Intensive "
        "NLP Tasks' (Lewis et al., 2020). RAG combines retrieval with generation. "
        "Key insight: retrieved context grounds the LLM, reducing hallucination. "
        "Used DPR for retrieval + BART for generation."
    ),
    (
        "Weekly review — things I learned this week: (1) Python match/case "
        "statements support guard clauses, (2) Chrome DevTools has a coverage "
        "tab for finding unused CSS/JS, (3) the Pomodoro technique works better "
        "in 40-min blocks for deep work instead of 25."
    ),
    (
        "Brainstorm — how to make documentation less painful: auto-generate from "
        "code where possible, use ADRs (Architecture Decision Records) for 'why' "
        "decisions, keep docs next to code not in a wiki, review docs in PRs "
        "just like code. Documentation is a feature, not a chore."
    ),
]

# Source filenames per category for realistic metadata
SOURCE_NAMES = {
    "technical": [
        "python_async_notes.md", "postgres_tuning.md", "react_hooks_guide.md",
        "docker_cheatsheet.md", "typescript_generics.md", "git_workflows.md",
        "websocket_patterns.md", "k8s_lifecycle.md", "python_dataclasses.md",
        "rest_api_design.md", "redis_caching.md", "css_layout.md",
    ],
    "personal": [
        "coffee_shops.md", "meal_prep.md", "reading_list.md",
        "workout_routine.md", "travel_plans.md", "gift_ideas.md",
        "apartment_notes.md", "side_projects.md",
    ],
    "reference": [
        "numpy_broadcasting.md", "http_status_codes.md", "git_commands.md",
        "regex_cheatsheet.md", "sql_joins.md", "big_o_reference.md",
        "python_formatting.md", "linux_permissions.md",
    ],
    "general": [
        "standup_notes.md", "random_thoughts.md", "ideas.md",
        "article_summaries.md", "podcast_notes.md", "retro_notes.md",
        "talk_ideas.md", "paper_notes.md", "weekly_review.md",
        "documentation_ideas.md",
    ],
}

ALL_TEMPLATES = {
    "technical": TECHNICAL_TEMPLATES,
    "personal": PERSONAL_TEMPLATES,
    "reference": REFERENCE_TEMPLATES,
    "general": GENERAL_TEMPLATES,
}


def generate_demo_chunks(count: int = 90, seed: int = 42) -> list[dict]:
    """Generate a realistic demo dataset for the Time Machine slider.

    Args:
        count: Number of chunks to generate (default 90).
        seed: Random seed for reproducibility.

    Returns:
        List of dicts matching the Chunk schema contract.
    """
    rng = random.Random(seed)
    now = datetime.utcnow()
    chunks = []

    # Category distribution: 35% technical, 25% personal, 15% reference, 25% general
    categories = (
        ["technical"] * int(count * 0.35)
        + ["personal"] * int(count * 0.25)
        + ["reference"] * int(count * 0.15)
        + ["general"] * (count - int(count * 0.35) - int(count * 0.25) - int(count * 0.15))
    )
    rng.shuffle(categories)

    for i, category in enumerate(categories):
        # Pick a content template (cycle through templates)
        templates = ALL_TEMPLATES[category]
        content = templates[i % len(templates)]

        # Add slight variation to content to avoid exact duplicates
        variation_phrases = [
            " Important to remember.",
            " Need to review this again.",
            " Key takeaway for future reference.",
            " This came up in a recent project.",
            " Useful for the upcoming deadline.",
            " Bookmarking this for later.",
            "",
            "",
            "",  # Most chunks don't get extra phrases
        ]
        content += rng.choice(variation_phrases)

        # Generate chunk ID
        chunk_id = f"chk_{uuid.UUID(int=rng.getrandbits(128)).hex[:12]}"

        # Source metadata
        source_names = SOURCE_NAMES[category]
        source_name = source_names[i % len(source_names)]

        # Backdated timestamp: random datetime in the past 60 days
        days_ago = rng.uniform(0.5, 60)
        created_at = now - timedelta(days=days_ago)

        # Last accessed: usually same as created_at, but ~30% have been re-read
        is_recently_accessed = rng.random() < 0.30
        if is_recently_accessed:
            # Accessed more recently than created
            days_since_access = rng.uniform(0, days_ago * 0.5)
            last_accessed = now - timedelta(days=days_since_access)
            access_count = rng.randint(1, 5)
        else:
            last_accessed = created_at
            access_count = 0

        # Stability: 7.0 base, boosted by reviews (capped at 365)
        if access_count > 0:
            stability_S = min(7.0 * (1.5 ** access_count), 365.0)
        else:
            stability_S = 7.0

        # Complexity: technical/reference decay faster (lower k)
        if category in ("technical", "reference"):
            complexity_k = 0.7
        else:
            complexity_k = 1.0

        chunk = {
            "id": chunk_id,
            "content": content,
            "source_type": "file",
            "source_name": source_name,
            "category": category,
            "created_at": created_at.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "last_accessed": last_accessed.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "access_count": access_count,
            "stability_S": round(stability_S, 2),
            "complexity_k": complexity_k,
        }
        chunks.append(chunk)

    return chunks


def write_demo_dataset_to_file(
    path: str = "demo_chunks.json", count: int = 90
) -> None:
    """Generate demo chunks and write to a JSON file.

    Args:
        path: Output file path.
        count: Number of chunks to generate.
    """
    chunks = generate_demo_chunks(count=count)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(chunks, f, indent=2, ensure_ascii=False)
    print(f"Wrote {len(chunks)} demo chunks to {path}")


if __name__ == "__main__":
    write_demo_dataset_to_file()
