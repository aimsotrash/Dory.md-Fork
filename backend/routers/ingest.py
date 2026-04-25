from fastapi import APIRouter, BackgroundTasks, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from core import chunker, complexity
from core.embeddings import embed_texts
from database.db import DEFAULT_USER_ID, insert_chunk
from models.schemas import IngestResponse
from parsers.file_parser import parse
from services.category_service import classify_and_store
from services.chroma_service import add_chunks

router = APIRouter()

MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB


@router.post("/ingest", response_model=IngestResponse)
async def ingest_files(
    files: list[UploadFile],
    background_tasks: BackgroundTasks,
):
    if not files:
        raise HTTPException(status_code=400, detail="No files provided.")

    total_chunks = 0
    last_source = ""

    for upload in files:
        raw = await upload.read()
        if len(raw) > MAX_FILE_SIZE:
            raise HTTPException(status_code=413, detail=f"{upload.filename} exceeds 20 MB limit.")

        text = parse(upload.filename or "upload.txt", raw)
        if not text.strip():
            continue

        chunks = chunker.chunk_text(text)
        if not chunks:
            continue

        scores = [complexity.score(c) for c in chunks]
        embeddings = embed_texts(chunks)

        chunk_ids: list[str] = []
        for chunk_text, score, emb in zip(chunks, scores, embeddings):
            cid = insert_chunk(
                content=chunk_text,
                source_file=upload.filename or "upload",
                complexity_score=score,
                user_id=DEFAULT_USER_ID,
            )
            chunk_ids.append(cid)

        metadatas = [
            {"user_id": DEFAULT_USER_ID, "chunk_id": cid, "source_file": upload.filename or "upload"}
            for cid in chunk_ids
        ]
        add_chunks(chunk_ids, embeddings, metadatas)

        # Classify categories in background — upload returns immediately
        for cid, chunk_text in zip(chunk_ids, chunks):
            background_tasks.add_task(classify_and_store, cid, chunk_text)

        total_chunks += len(chunk_ids)
        last_source = upload.filename or "upload"

    return IngestResponse(chunks_created=total_chunks, source=last_source)
