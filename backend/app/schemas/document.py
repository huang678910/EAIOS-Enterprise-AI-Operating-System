"""文档相关 Pydantic 模型"""
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel


class DocumentResponse(BaseModel):
    id: UUID
    workspace_id: UUID
    filename: str
    file_type: str
    file_size: int
    status: str
    chunk_count: int
    error_message: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class DocumentListResponse(BaseModel):
    documents: list[DocumentResponse]
    total: int


class UploadResponse(BaseModel):
    id: str
    filename: str
    status: str
    message: str
