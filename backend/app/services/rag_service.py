"""RAG 检索服务 — pgvector 向量相似搜索 (ORM)"""

import logging

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.document_chunk import DocumentChunk
from app.models.document import Document
from app.services.embedding_service import embed_single
from app.schemas.search import SearchResultItem

logger = logging.getLogger(__name__)


class RagService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def search(
        self,
        query: str,
        workspace_id: str,
        top_k: int = 5,
    ) -> list[SearchResultItem]:
        """向量相似搜索 — ORM 查询，pgvector 自动处理类型"""

        query_emb = await embed_single(query)

        # 子查询：workspace 内的文档 ID
        doc_ids = select(Document.id).where(Document.workspace_id == workspace_id).scalar_subquery()

        # ORM 查询：pgvector cosine_distance 对应 <=> 操作符
        dist_expr = DocumentChunk.embedding.cosine_distance(query_emb).label("distance")

        stmt = (
            select(DocumentChunk, Document.filename, dist_expr)
            .join(Document, Document.id == DocumentChunk.document_id)
            .where(DocumentChunk.document_id.in_(doc_ids))
            .where(DocumentChunk.embedding.isnot(None))
            .order_by(dist_expr)
            .limit(top_k)
        )

        result = await self.db.execute(stmt)
        rows = result.all()

        items = []
        for chunk, filename, distance in rows:
            dist_val = float(distance) if distance is not None else 1.0
            # pgvector <=> 返回余弦距离 (0=完全相同, 1=正交, 2=完全相反)
            # 余弦相似度 = 1 - 余弦距离
            similarity = round(1.0 - dist_val, 4)
            # 过滤掉完全不相关的结果 (相似度 <= 0)
            if similarity <= 0.0:
                continue
            items.append(SearchResultItem(
                chunk_id=str(chunk.id),
                document_id=str(chunk.document_id),
                filename=filename,
                content=chunk.content,
                metadata=chunk.metadata_,
                similarity=similarity,
            ))

        return items

    async def get_context_for_llm(
        self,
        query: str,
        workspace_id: str,
        top_k: int = 5,
    ) -> str:
        results = await self.search(query, workspace_id, top_k)
        if not results:
            return ""
        parts = []
        for i, r in enumerate(results):
            parts.append(f"[Source {i+1}: {r.filename}]\n{r.content}")
        return "\n\n---\n\n".join(parts)
