from pathlib import Path

import aiofiles
from fastapi import APIRouter, Depends, File, Form, Request, UploadFile
from loguru import logger

from app.config import get_settings
from app.core.exceptions import AppError
from app.core.limiter import limiter
from app.dependencies import get_rag_service
from app.services.rag_service import RAGService
from app.utils.file_utils import unique_stored_name

router = APIRouter()


@router.post("/upload")
@limiter.limit("100/15minutes")
async def upload_document(
    request: Request,
    document: UploadFile = File(...),
    mode: str = Form("replace"),
    rag_service: RAGService = Depends(get_rag_service),
) -> dict:
    settings = get_settings()

    if document.content_type != "application/pdf":
        raise AppError("Only PDF files are allowed", 400)

    if mode not in ("replace", "append"):
        raise AppError('Invalid mode. Use "replace" or "append"', 400)

    content = await document.read()
    if len(content) > settings.max_file_size:
        raise AppError(
            f"File too large. Maximum size is {settings.max_file_size // 1_048_576} MB", 400
        )

    stored_name = unique_stored_name(document.filename or "upload.pdf")
    file_path = Path(settings.upload_dir) / stored_name

    async with aiofiles.open(file_path, "wb") as f:
        await f.write(content)

    logger.info(f"Saved upload: {stored_name} ({len(content)} bytes, mode={mode})")

    result = await rag_service.process_document(file_path, mode=mode)

    return {
        **result,
        "filename": document.filename,
        "size": len(content),
    }


@router.get("/status")
@limiter.limit("100/15minutes")
async def get_status(
    request: Request,
    rag_service: RAGService = Depends(get_rag_service),
) -> dict:
    return {"success": True, **rag_service.get_status()}


@router.get("/")
@limiter.limit("100/15minutes")
async def list_documents(
    request: Request,
    rag_service: RAGService = Depends(get_rag_service),
) -> dict:
    docs = rag_service.documents
    return {
        "success": True,
        "documents": [d.model_dump() for d in docs],
        "total_documents": len(docs),
        "total_chunks": sum(d.chunks_count for d in docs),
    }


@router.post("/reset")
@limiter.limit("100/15minutes")
async def reset_system(
    request: Request,
    rag_service: RAGService = Depends(get_rag_service),
) -> dict:
    return rag_service.reset()
