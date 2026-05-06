from fastapi import APIRouter, Depends, Request
from loguru import logger

from app.core.limiter import limiter
from app.dependencies import get_rag_service
from app.schemas.chat import QueryRequest, QueryResponse
from app.services.rag_service import RAGService

router = APIRouter()


@router.post("/query", response_model=QueryResponse)
@limiter.limit("100/15minutes")
async def query_documents(
    request: Request,
    body: QueryRequest,
    rag_service: RAGService = Depends(get_rag_service),
) -> QueryResponse:
    logger.info(f"Query received ({len(body.question)} chars)")
    return await rag_service.query(body.question)
