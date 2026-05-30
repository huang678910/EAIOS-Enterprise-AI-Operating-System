"""聊天相关 Pydantic 模型"""
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel


class ChatSessionCreate(BaseModel):
    title: str = "New Chat"


class ChatSessionResponse(BaseModel):
    id: UUID
    workspace_id: UUID
    user_id: UUID
    title: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ChatSessionListResponse(BaseModel):
    sessions: list[ChatSessionResponse]
    total: int


class MessageResponse(BaseModel):
    id: UUID
    session_id: UUID
    role: str
    content: str
    sources: list | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatStreamRequest(BaseModel):
    session_id: str
    message: str


class ChatHistoryResponse(BaseModel):
    session: ChatSessionResponse
    messages: list[MessageResponse]
