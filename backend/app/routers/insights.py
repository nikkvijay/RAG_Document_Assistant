from fastapi import APIRouter, Depends, Request

from app.core.limiter import limiter
from app.dependencies import get_rag_service
from app.services.rag_service import RAGService

router = APIRouter()


@router.get("/")
@limiter.limit("100/15minutes")
async def get_insights(
    request: Request,
    rag_service: RAGService = Depends(get_rag_service),
) -> dict:
    return rag_service.get_insights()
