from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from loguru import logger
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.config import get_settings
from app.core.exceptions import AppError, app_error_handler, generic_error_handler
from app.core.limiter import limiter
from app.core.logger import setup_logging
from app.routers import chat, documents, health, insights
from app.services.rag_service import RAGService


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    setup_logging(settings.log_dir, settings.log_level)
    app.state.rag_service = RAGService(settings)
    logger.info(f"RAG Backend started on port {settings.port} [{settings.environment}]")
    logger.info(f"API docs: http://localhost:{settings.port}/api/docs")
    yield
    logger.info("RAG Backend shutting down")


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="RAG Document Assistant API",
        description="Retrieval-Augmented Generation backend powered by Gemini",
        version="2.0.0",
        docs_url="/api/docs" if settings.is_development else None,
        redoc_url="/api/redoc" if settings.is_development else None,
        openapi_url="/api/openapi.json" if settings.is_development else None,
        lifespan=lifespan,
    )

    # Rate limiter
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.frontend_url],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Exception handlers
    app.add_exception_handler(AppError, app_error_handler)
    app.add_exception_handler(Exception, generic_error_handler)

    # Request logging middleware
    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        client = request.client.host if request.client else "unknown"
        logger.info(f"{request.method} {request.url.path} - {client}")
        response = await call_next(request)
        return response

    # Routers
    app.include_router(health.router, prefix="/api/health", tags=["Health"])
    app.include_router(documents.router, prefix="/api/documents", tags=["Documents"])
    app.include_router(chat.router,     prefix="/api/chat",     tags=["Chat"])
    app.include_router(insights.router, prefix="/api/insights", tags=["Insights"])

    return app


app = create_app()
