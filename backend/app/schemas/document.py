from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class DocumentInfo(BaseModel):
    file_name: str
    original_file_name: str
    chunks_count: int
    uploaded_at: datetime
    mode: Literal["replace", "append"]


class UploadResponse(BaseModel):
    success: bool
    chunks_count: int
    file_name: str
    original_file_name: str
    total_documents: int
    total_chunks: int
    mode: str
    message: str
    filename: str
    size: int


class StatusResponse(BaseModel):
    success: bool
    is_ready: bool
    documents_count: int
    total_chunks: int
    has_retriever: bool
    has_model: bool
    ai_provider: str
    documents: list[dict]


class DocumentsListResponse(BaseModel):
    success: bool
    documents: list[DocumentInfo]
    total_documents: int
    total_chunks: int


class ResetResponse(BaseModel):
    success: bool
    message: str
