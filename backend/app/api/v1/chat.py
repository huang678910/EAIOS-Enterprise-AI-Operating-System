"""聊天 API — 会话管理 + SSE 流式对话 + HTTP 降级"""

import logging
from typing import Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.api.deps import get_current_user, require_workspace_role
from app.models.user import User
from app.models.chat_session import ChatSession
from app.schemas.chat import (
    ChatSessionCreate,
    ChatSessionResponse,
    ChatSessionListResponse,
    MessageResponse,
    ChatStreamRequest,
)
from app.services.chat_service import ChatService
from app.services.llm_service import LLMService
from app.core.exceptions import NotFoundException, ForbiddenException

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/workspaces/{workspace_id}/chat", tags=["Chat"])


@router.get("/sessions", response_model=ChatSessionListResponse)
async def list_sessions(
    workspace_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """列出当前工作区中当前用户的会话"""
    await require_workspace_role(workspace_id, current_user, "viewer", db)
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
    """创建新会话"""
    await require_workspace_role(workspace_id, current_user, "member", db)
    session = await ChatService(db).create_session(workspace_id, current_user.id, request.title)
    return ChatSessionResponse.model_validate(session)


@router.delete("/sessions/{session_id}", status_code=204)
async def delete_session(
    workspace_id: str,
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """删除会话（仅会话所有者或 admin 可操作）"""
    await require_workspace_role(workspace_id, current_user, "viewer", db)
    # 验证会话属于当前用户或用户是 admin
    result = await db.execute(
        select(ChatSession).where(ChatSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise NotFoundException("Chat session not found")
    if str(session.user_id) != str(current_user.id):
        # 非所有者需要 admin 权限
        await require_workspace_role(workspace_id, current_user, "admin", db)
    await ChatService(db).delete_session(session_id)


@router.get("/sessions/{session_id}/messages", response_model=list[MessageResponse])
async def list_messages(
    workspace_id: str,
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """列出会话消息"""
    await require_workspace_role(workspace_id, current_user, "viewer", db)
    # 验证会话属于当前用户
    result = await db.execute(
        select(ChatSession).where(ChatSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    if not session or str(session.user_id) != str(current_user.id):
        raise ForbiddenException("You can only view your own chat sessions")
    messages = await ChatService(db).list_messages(session_id)
    return [MessageResponse.model_validate(m) for m in messages]


@router.post("/stream")
async def stream_chat(
    workspace_id: str,
    request: ChatStreamRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """SSE 流式对话（降级方案 — 主聊天请使用 WebSocket ws/chat）"""
    await require_workspace_role(workspace_id, current_user, "member", db)
    logger.info(f"Chat SSE stream: ws={workspace_id}, session={request.session_id}")

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
    """非流式对话 — HTTP 降级（通过 AgentOrchestrator 走多 Agent 路由）"""
    await require_workspace_role(workspace_id, current_user, "member", db)
    logger.info(f"Chat send: ws={workspace_id}, session={request.session_id}")

    from app.services.agent_orchestrator import AgentOrchestrator

    orchestrator = AgentOrchestrator(db=db, workspace_id=workspace_id, user=current_user)
    full = ""
    sources = []
    try:
        async for event_dict in orchestrator.run_stream(
            session_id=request.session_id,
            message=request.message,
        ):
            if event_dict["type"] == "token":
                full += event_dict.get("content", "")
            elif event_dict["type"] == "done":
                full = event_dict.get("content", full)
                sources = event_dict.get("sources", [])
            elif event_dict["type"] == "error":
                raise HTTPException(status_code=500, detail=event_dict.get("content", "Unknown error"))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Send message error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

    return {"reply": full or "No response generated.", "sources": sources}


# ─── Decision Center (dedicated endpoint, no chat session) ──

@router.post("/decision/analyze")
async def analyze_decision(
    workspace_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """提交战略问题，SSE 流式返回多维度分析（不创建 Chat Session）"""
    await require_workspace_role(workspace_id, current_user, "member", db)

    # Parse body manually
    import json
    try:
        data = await request.json()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Body parse error: {e}")

    question = (data.get("question") or "").strip()
    if not question:
        raise HTTPException(status_code=400, detail=f"Question missing. Body: {str(data)[:200]}")

    async def event_stream():
        full_analysis = ""
        try:
            from app.database import AsyncSessionLocal
            from app.services.company_service import CompanyService
            from app.services.memory_service import MemoryService
            from app.services.business_metrics_service import BusinessMetricsService
            from app.services.llm_service import _get_llm
            from langchain_core.messages import SystemMessage, HumanMessage

            context_parts = []
            try:
                async with AsyncSessionLocal() as s:
                    co_svc = CompanyService(s, workspace_id)
                    ctx = await co_svc.get_company_summary()
                    if ctx:
                        context_parts.append("### Company Profile\n" + ctx)
            except Exception:
                pass
            try:
                async with AsyncSessionLocal() as s:
                    mem_svc = MemoryService(s, workspace_id)
                    ctx = await mem_svc.get_context_for_dialog(question, top_k=3)
                    if ctx:
                        context_parts.append("### Enterprise Memory\n" + ctx)
            except Exception:
                pass
            try:
                async with AsyncSessionLocal() as s:
                    metrics_svc = BusinessMetricsService(s)
                    ctx = await metrics_svc.get_ai_analysis_context(workspace_id)
                    if ctx:
                        context_parts.append("### Business Metrics\n" + ctx)
            except Exception:
                pass

            context = "\n\n".join(context_parts) if context_parts else "No enterprise data available."

            from app.agents.decision_agent import DECISION_SYSTEM_PROMPT
            llm = _get_llm(streaming=True)
            messages = [
                SystemMessage(content=DECISION_SYSTEM_PROMPT),
                HumanMessage(content=f"**Strategic Question:** {question}\n\n**Enterprise Context:**\n{context}\n\nProvide a comprehensive multi-dimension analysis."),
            ]

            yield f"event: status\ndata: Analyzing enterprise data...\n\n"
            async for chunk in llm.astream(messages):
                if chunk.content:
                    full_analysis += chunk.content
                    yield f"data: {chunk.content}\n\n"

            # Save to decisions table
            try:
                async with AsyncSessionLocal() as s:
                    from app.models.decision import Decision
                    dec = Decision(
                        workspace_id=workspace_id,
                        user_id=current_user.id,
                        question=question,
                        analysis=full_analysis,
                        status="completed",
                    )
                    s.add(dec)
                    await s.commit()
            except Exception as save_err:
                logger.error(f"Failed to save decision: {save_err}")

        except Exception as e:
            logger.error(f"Decision analysis error: {e}", exc_info=True)
            yield f"event: error\ndata: {str(e)}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"},
    )


@router.get("/decision/history")
async def decision_history(
    workspace_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取历史决策记录"""
    await require_workspace_role(workspace_id, current_user, "member", db)
    from sqlalchemy import select as sa_select
    from app.models.decision import Decision
    result = await db.execute(
        sa_select(Decision)
        .where(Decision.workspace_id == workspace_id)
        .order_by(Decision.created_at.desc())
        .limit(20)
    )
    decisions = result.scalars().all()
    return [
        {
            "id": str(d.id),
            "question": d.question,
            "analysis": d.analysis,
            "status": d.status,
            "created_at": d.created_at.isoformat() if d.created_at else None,
        }
        for d in decisions
    ]


@router.delete("/decision/{decision_id}")
async def delete_decision(
    workspace_id: str,
    decision_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """删除决策记录（仅 Admin）"""
    import uuid as uuid_mod
    from sqlalchemy import select as sa_select
    from app.models.decision import Decision
    await require_workspace_role(workspace_id, current_user, "admin", db)

    try:
        dec_uuid = uuid_mod.UUID(decision_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid decision ID format")

    result = await db.execute(
        sa_select(Decision).where(
            Decision.id == dec_uuid,
            Decision.workspace_id == workspace_id,
        )
    )
    dec = result.scalar_one_or_none()
    if not dec:
        raise HTTPException(status_code=404, detail="Decision not found")
    await db.delete(dec)
    await db.commit()
    return {"status": "ok", "deleted": decision_id}
