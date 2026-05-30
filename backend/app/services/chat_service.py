"""聊天服务 — 会话管理 + 消息存储"""

import uuid
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.chat_session import ChatSession
from app.models.message import Message, MessageRole
from app.core.exceptions import NotFoundException


class ChatService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_sessions(self, workspace_id: str, user_id: uuid.UUID) -> list[ChatSession]:
        result = await self.db.execute(
            select(ChatSession)
            .where(
                ChatSession.workspace_id == workspace_id,
                ChatSession.user_id == user_id,
            )
            .order_by(ChatSession.updated_at.desc())
        )
        return list(result.scalars().all())

    async def create_session(self, workspace_id: str, user_id: uuid.UUID, title: str) -> ChatSession:
        session = ChatSession(
            workspace_id=workspace_id,
            user_id=user_id,
            title=title,
        )
        self.db.add(session)
        await self.db.flush()
        return session

    async def delete_session(self, session_id: str) -> None:
        result = await self.db.execute(
            select(ChatSession).where(ChatSession.id == session_id)
        )
        session = result.scalar_one_or_none()
        if not session:
            raise NotFoundException("Chat session not found")
        await self.db.delete(session)

    async def list_messages(self, session_id: str) -> list[Message]:
        result = await self.db.execute(
            select(Message)
            .where(Message.session_id == session_id)
            .order_by(Message.created_at.asc())
        )
        return list(result.scalars().all())

    async def save_message(
        self,
        session_id: str,
        role: str,
        content: str,
        sources: list | None = None,
    ) -> Message:
        message = Message(
            session_id=session_id,
            role=MessageRole(role),
            content=content,
            sources=sources or [],
        )
        self.db.add(message)
        await self.db.flush()
        return message

    async def update_session_title(self, session_id: str, title: str) -> None:
        result = await self.db.execute(
            select(ChatSession).where(ChatSession.id == session_id)
        )
        session = result.scalar_one_or_none()
        if session:
            session.title = title
            session.updated_at = datetime.now(timezone.utc)
            await self.db.flush()
