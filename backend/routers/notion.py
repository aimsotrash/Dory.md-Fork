"""
Notion integration router.

Supports two modes via NOTION_AUTH_MODE env var:
  internal  — user provides their own integration token + page IDs directly.
              No OAuth, no approval needed. Built first.
  oauth     — full OAuth consent flow (add during Day 2 polish).

Internal mode endpoints:
  POST /api/notion/import   { token, page_ids }

OAuth mode endpoints (stubbed — implement when NOTION_AUTH_MODE=oauth):
  GET  /auth/notion           → redirect to consent
  GET  /auth/notion/callback  → token exchange
  GET  /api/notion/pages      → list pages
  POST /api/notion/import     → import selected pages (token from session)
  DELETE /auth/notion         → revoke
"""

import os

from fastapi import APIRouter, BackgroundTasks, HTTPException, Request, Response
from fastapi.responses import RedirectResponse
from notion_client import Client as NotionClient

from core import chunker, complexity
from core.embeddings import embed_texts
from database.db import DEFAULT_USER_ID, delete_oauth_token, get_oauth_token, insert_chunk, store_oauth_token
from models.schemas import NotionImportRequest, NotionImportResponse, NotionPage
from parsers.notion_blocks import blocks_to_markdown
from services.category_service import classify_and_store
from services.chroma_service import add_chunks

router = APIRouter()

AUTH_MODE = os.getenv("NOTION_AUTH_MODE", "internal").lower()


def _ingest_markdown(text: str, source_name: str, background_tasks: BackgroundTasks) -> int:
    """Shared ingestion pipeline for Notion markdown content."""
    chunks = chunker.chunk_text(text)
    if not chunks:
        return 0
    scores = [complexity.score(c) for c in chunks]
    embeddings = embed_texts(chunks)
    chunk_ids = []
    for c, s, e in zip(chunks, scores, embeddings):
        cid = insert_chunk(content=c, source_file=source_name, complexity_score=s, user_id=DEFAULT_USER_ID)
        chunk_ids.append(cid)
    metadatas = [{"user_id": DEFAULT_USER_ID, "chunk_id": cid, "source_file": source_name} for cid in chunk_ids]
    add_chunks(chunk_ids, embeddings, metadatas)
    for cid, c in zip(chunk_ids, chunks):
        background_tasks.add_task(classify_and_store, cid, c)
    return len(chunk_ids)


def _fetch_page_blocks(notion: NotionClient, page_id: str) -> list[dict]:
    results = []
    cursor = None
    while True:
        kwargs = {"block_id": page_id}
        if cursor:
            kwargs["start_cursor"] = cursor
        resp = notion.blocks.children.list(**kwargs)
        results.extend(resp.get("results", []))
        if not resp.get("has_more"):
            break
        cursor = resp.get("next_cursor")
    return results


def _page_title(page: dict) -> str:
    props = page.get("properties", {})
    for key in ("title", "Name", "Title"):
        if key in props:
            rt = props[key].get("title", [])
            return "".join(t.get("plain_text", "") for t in rt) or page["id"]
    return page["id"]


# ── Internal mode ──────────────────────────────────────────────────────────────

@router.post("/api/notion/import", response_model=NotionImportResponse)
async def import_notion_pages(body: NotionImportRequest, background_tasks: BackgroundTasks):
    token = body.token or get_oauth_token(DEFAULT_USER_ID)
    if not token:
        raise HTTPException(
            status_code=401,
            detail="No Notion token provided. Pass 'token' in the request body or connect via OAuth.",
        )

    notion = NotionClient(auth=token)
    total_pages = 0
    total_chunks = 0

    for page_id in body.page_ids:
        try:
            page = notion.pages.retrieve(page_id=page_id)
            title = _page_title(page)
            blocks = _fetch_page_blocks(notion, page_id)
            markdown = blocks_to_markdown(blocks)
            if markdown.strip():
                n = _ingest_markdown(markdown, f"Notion: {title}", background_tasks)
                total_chunks += n
            total_pages += 1
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to fetch page {page_id}: {e}")

    return NotionImportResponse(pages_imported=total_pages, chunks_created=total_chunks)


@router.get("/api/notion/pages", response_model=list[NotionPage])
def list_notion_pages(token: str | None = None):
    t = token or get_oauth_token(DEFAULT_USER_ID)
    if not t:
        raise HTTPException(status_code=401, detail="No Notion token.")
    notion = NotionClient(auth=t)
    resp = notion.search(filter={"property": "object", "value": "page"}, page_size=50)
    pages = []
    for p in resp.get("results", []):
        pages.append(NotionPage(id=p["id"], title=_page_title(p)))
    return pages


# ── OAuth mode stubs (implement when NOTION_AUTH_MODE=oauth) ──────────────────

@router.get("/auth/notion")
def notion_auth_start():
    if AUTH_MODE != "oauth":
        raise HTTPException(status_code=501, detail="Set NOTION_AUTH_MODE=oauth to enable OAuth flow.")
    client_id = os.getenv("NOTION_CLIENT_ID", "")
    redirect_uri = os.getenv("NOTION_REDIRECT_URI", "")
    url = (
        f"https://api.notion.com/v1/oauth/authorize"
        f"?client_id={client_id}&response_type=code&owner=user&redirect_uri={redirect_uri}"
    )
    return RedirectResponse(url)


@router.get("/auth/notion/callback")
async def notion_auth_callback(request: Request, response: Response):
    if AUTH_MODE != "oauth":
        raise HTTPException(status_code=501, detail="Set NOTION_AUTH_MODE=oauth to enable OAuth flow.")
    code = request.query_params.get("code")
    if not code:
        raise HTTPException(status_code=400, detail="Missing OAuth code.")

    import base64
    import httpx

    client_id = os.getenv("NOTION_CLIENT_ID", "")
    client_secret = os.getenv("NOTION_CLIENT_SECRET", "")
    redirect_uri = os.getenv("NOTION_REDIRECT_URI", "")
    credentials = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://api.notion.com/v1/oauth/token",
            headers={"Authorization": f"Basic {credentials}", "Content-Type": "application/json"},
            json={"grant_type": "authorization_code", "code": code, "redirect_uri": redirect_uri},
        )
        data = resp.json()

    if "access_token" not in data:
        raise HTTPException(status_code=400, detail=f"OAuth token exchange failed: {data}")

    store_oauth_token(
        user_id=DEFAULT_USER_ID,
        access_token=data["access_token"],
        workspace_id=data.get("workspace_id", ""),
        bot_id=data.get("bot_id", ""),
    )
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    return RedirectResponse(f"{frontend_url}?notion_connected=true")


@router.delete("/auth/notion")
def revoke_notion():
    delete_oauth_token(DEFAULT_USER_ID)
    return {"message": "Notion integration revoked."}
