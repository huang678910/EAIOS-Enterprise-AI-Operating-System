"""知识库搜索 API"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.search import SearchRequest, SearchResponse
from app.services.rag_service import RagService

router = APIRouter(prefix="/workspaces/{workspace_id}/search", tags=["Search"])


@router.post("", response_model=SearchResponse)
async def search_knowledge(
    workspace_id: str,
    request: SearchRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """RAG 知识库搜索"""
    results = await RagService(db).search(
        query=request.query,
        workspace_id=workspace_id,
        top_k=request.top_k,
    )
    return SearchResponse(query=request.query, results=results, total=len(results))
