import unicodedata
from typing import Any, Optional

from pydantic import BaseModel, Field, field_validator


class QueryRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=1000)

    @field_validator("question")
    @classmethod
    def _sanitize(cls, v: str) -> str:
        # Strip control characters (keep newline/tab for readability)
        cleaned = "".join(
            ch for ch in v
            if unicodedata.category(ch)[0] != "C" or ch in ("\n", "\t")
        )
        return cleaned.strip()


class SourceDocument(BaseModel):
    page_content: str
    metadata: dict[str, Any]


class SourceBreakdown(BaseModel):
    document: str
    chunks_used: int
    chunk_indices: list[int]


class QueryMetadata(BaseModel):
    question: str
    timestamp: str
    sources_count: int
    documents_used: int
    document_sources: list[str]
    source_breakdown: list[SourceBreakdown]
    total_documents_available: int
    # Self-healing loop fields
    critique_verdict: Optional[str] = None   # "grounded" | "hallucinated" | "insufficient"
    critique_reason: Optional[str] = None
    iterations_used: Optional[int] = None
    is_safe_fallback: Optional[bool] = None


class QueryResponse(BaseModel):
    success: bool
    answer: str
    source_documents: list[SourceDocument]
    metadata: QueryMetadata
