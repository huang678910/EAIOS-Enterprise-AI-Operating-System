"""搜索相关 Pydantic 模型"""
from pydantic import BaseModel


class SearchRequest(BaseModel):
    query: str
    top_k: int = 5


class SearchResultItem(BaseModel):
    chunk_id: str
    document_id: str
    filename: str
    content: str
    metadata: dict | None = None
    similarity: float


class SearchResponse(BaseModel):
    query: str
    results: list[SearchResultItem]
    total: int
