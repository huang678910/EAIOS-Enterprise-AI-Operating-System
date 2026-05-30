"""聊天 API — 会话管理 + SSE 流式对话"""

import logging

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.chat import (
    ChatSessionCreate,
    ChatSessionResponse,
    ChatSessionListResponse,
    MessageResponse,
    ChatStreamRequest,
)
from app.config import get_settings
from app.services.chat_service import ChatService
from app.services.llm_service import LLMService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/workspaces/{workspace_id}/chat", tags=["Chat"])


@router.get("/sessions", response_model=ChatSessionListResponse)
async def list_sessions(
    workspace_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sessions = await ChatService(db).list_sessions(workspace_id, current_user.id)
    return ChatSessionListResponse(
        sessions=[ChatSessionResponse.model_validate(s) for s in sessions],
        total=len(sessions),
    )


@router.post("/sessions", response_model=ChatSessionResponse, status_code=201)
async def create_session(
    workspace_id: str,
    request: ChatSessionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = await ChatService(db).create_session(workspace_id, current_user.id, request.title)
    return ChatSessionResponse.model_validate(session)


@router.delete("/sessions/{session_id}", status_code=204)
async def delete_session(
    workspace_id: str,
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await ChatService(db).delete_session(session_id)


@router.get("/sessions/{session_id}/messages", response_model=list[MessageResponse])
async def list_messages(
    workspace_id: str,
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    messages = await ChatService(db).list_messages(session_id)
    return [MessageResponse.model_validate(m) for m in messages]


@router.post("/stream")
async def stream_chat(
    workspace_id: str,
    request: ChatStreamRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """SSE 流式对话"""
    import sys
    print(f"!!! STREAM ENDPOINT HIT: ws={workspace_id} session={request.session_id}", flush=True)
    logger.info(f"Chat stream: ws={workspace_id}, session={request.session_id}")

    svc = ChatService(db)
    await svc.save_message(
        session_id=request.session_id, role="user", content=request.message,
    )
    history = await svc.list_messages(request.session_id)

    llm = LLMService()

    async def sse_wrapper():
        try:
            async for event in llm.stream_chat(
                messages=history,
                workspace_id=workspace_id,
                session_id=request.session_id,
            ):
                yield event
        except Exception as e:
            logger.error(f"Stream wrapper error: {e}", exc_info=True)
            yield LLMService._sse("error", {"content": str(e)})

    return StreamingResponse(
        sse_wrapper(),
        media_type="text/plain; charset=utf-8",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/send")
async def send_message(
    workspace_id: str,
    request: ChatStreamRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """非流式对话 — 返回完整 JSON 响应"""
    from app.database import AsyncSessionLocal
    from app.services.rag_service import RagService

    logger.info(f"Chat send: ws={workspace_id} session={request.session_id}")

    svc = ChatService(db)
    await svc.save_message(
        session_id=request.session_id, role="user", content=request.message,
    )
    history = await svc.list_messages(request.session_id)

    # RAG search (best-effort, 独立 session)
    sources = []
    context = ""
    try:
        async with AsyncSessionLocal() as s:
            results = await RagService(s).search(
                query=request.message, workspace_id=workspace_id, top_k=5,
            )
            for r in results:
                sources.append({
                    "filename": r.filename, "chunk_id": r.chunk_id, "similarity": r.similarity,
                })
            context = "\n\n---\n\n".join(
                f"[Source: {r.filename}]\n{r.content}" for r in results
            )
    except Exception as e:
        logger.warning(f"RAG skipped: {e}")

    # Build LLM messages
    llm_msgs = [{"role": "system", "content": "You are an AI assistant. Answer based on context if provided. Use Markdown."}]
    if context:
        llm_msgs.append({"role": "system", "content": f"Context from documents:\n\n{context}"})
    for m in history[-20:]:
        llm_msgs.append({"role": m.role.value, "content": m.content})

    # Call DeepSeek
    s = get_settings()
    from openai import AsyncOpenAI
    client = AsyncOpenAI(api_key=s.DEEPSEEK_API_KEY, base_url=s.DEEPSEEK_BASE_URL)
    completion = await client.chat.completions.create(
        model=s.LLM_MODEL, messages=llm_msgs, temperature=0.7, max_tokens=2048,
    )
    reply = completion.choices[0].message.content or ""

    # Save assistant reply (独立 session)
    async with AsyncSessionLocal() as save_session:
        save_svc = ChatService(save_session)
        await save_svc.save_message(
            session_id=request.session_id, role="assistant", content=reply, sources=sources,
        )
        if len(history) <= 2:
            title = request.message[:50]
            if len(request.message) > 50:
                title += "..."
            await save_svc.update_session_title(request.session_id, title)
        await save_session.commit()

    return {"reply": reply, "sources": sources}
