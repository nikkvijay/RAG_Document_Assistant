from fastapi import Request

from app.services.rag_service import RAGService


def get_rag_service(request: Request) -> RAGService:
    return request.app.state.rag_service
