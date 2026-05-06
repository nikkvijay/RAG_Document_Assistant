import time
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Request

from app.core.limiter import limiter
from app.dependencies import get_rag_service
from app.services.rag_service import RAGService

router = APIRouter()

_START_TIME = time.time()


@router.get("/")
@limiter.limit("100/15minutes")
async def health_check(
    request: Request,
    rag_service: RAGService = Depends(get_rag_service),
) -> dict:
    try:
        rag_status = rag_service.get_status()
        return {
            "success": True,
            "status": "healthy",
            "timestamp": datetime.now(tz=timezone.utc).isoformat(),
            "uptime_seconds": round(time.time() - _START_TIME, 2),
            "rag_status": rag_status,
        }
    except Exception as exc:
        return {
            "success": False,
            "status": "unhealthy",
            "error": str(exc),
        }
