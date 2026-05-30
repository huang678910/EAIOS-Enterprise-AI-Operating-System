"""LLM 服务 — DeepSeek API 流式调用 + SSE 格式化"""

import json
import logging
import traceback
from typing import AsyncGenerator

from openai import AsyncOpenAI

from app.config import get_settings
from app.database import AsyncSessionLocal
from app.models.message import Message
from app.services.rag_service import RagService
from app.services.chat_service import ChatService

logger = logging.getLogger(__name__)
settings = get_settings()

# OpenAI-compatible client for DeepSeek
client = AsyncOpenAI(
    api_key=settings.DEEPSEEK_API_KEY,
    base_url=settings.DEEPSEEK_BASE_URL,
)

SYSTEM_PROMPT = """You are an AI assistant for an enterprise knowledge workspace.
Your task is to answer user questions based on the provided context from their documents.

Instructions:
- Answer questions using the provided context when available
- Cite sources by referencing the document filename in [brackets]
- If the context doesn't contain the answer, say so honestly and provide your best general knowledge
- Keep answers concise and well-structured
- Use Markdown formatting for readability"""


class LLMService:

    async def stream_chat(
        self,
        messages: list[Message],
        workspace_id: str,
        session_id: str,
    ) -> AsyncGenerator[str, None]:
        """SSE 流式对话"""

        # Always send a start event first so the client knows the connection is alive
        yield self._sse("start", {"content": "Connected"})

        try:
            # 1. Find user message
            user_msg = None
            for m in reversed(messages):
                if m.role.value == "user":
                    user_msg = m
                    break

            if not user_msg:
                yield self._sse("error", {"content": "No message found"})
                yield self._sse("done", {"content": ""})
                return

            # 2. RAG search (best-effort, failures are non-fatal)
            sources = []
            context = ""
            try:
                async with AsyncSessionLocal() as s:
                    results = await RagService(s).search(
                        query=user_msg.content,
                        workspace_id=workspace_id,
                        top_k=5,
                    )
                    if results:
                        parts = []
                        for r in results:
                            parts.append(f"[Source: {r.filename}]\n{r.content}")
                            sources.append({
                                "filename": r.filename,
                                "chunk_id": r.chunk_id,
                                "similarity": r.similarity,
                            })
                        context = "\n\n---\n\n".join(parts)
            except Exception as e:
                logger.warning(f"RAG skipped: {e}")

            # 3. Build messages for LLM
            llm_messages = [{"role": "system", "content": SYSTEM_PROMPT}]
            if context:
                llm_messages.append({
                    "role": "system",
                    "content": f"Relevant context from documents:\n\n{context}",
                })
            for m in messages[-20:]:
                llm_messages.append({"role": m.role.value, "content": m.content})

            # 4. Call DeepSeek
            logger.info(f"Calling {settings.LLM_MODEL} with {len(llm_messages)} messages")
            stream = await client.chat.completions.create(
                model=settings.LLM_MODEL,
                messages=llm_messages,
                stream=True,
                temperature=0.7,
                max_tokens=2048,
            )

            yield self._sse("status", {"content": "Generating..."})

            full = ""
            async for chunk in stream:
                delta = chunk.choices[0].delta if chunk.choices else None
                if delta and delta.content:
                    full += delta.content
                    yield self._sse("token", {"content": delta.content})

            # 5. Save assistant reply
            try:
                async with AsyncSessionLocal() as s:
                    svc = ChatService(s)
                    await svc.save_message(
                        session_id=session_id, role="assistant",
                        content=full, sources=sources,
                    )
                    if len(messages) <= 2:
                        title = user_msg.content[:50]
                        if len(user_msg.content) > 50:
                            title += "..."
                        await svc.update_session_title(session_id, title)
                    await s.commit()
            except Exception as e:
                logger.error(f"Failed to save reply: {e}")

            yield self._sse("done", {"content": "", "sources": sources})

        except Exception as e:
            logger.error(f"Stream error: {e}\n{traceback.format_exc()}")
            yield self._sse("error", {"content": str(e)})
            yield self._sse("done", {"content": ""})

    @staticmethod
    def _sse(event_type: str, data: dict) -> str:
        return f"data: {json.dumps({'type': event_type, **data})}\n\n"
