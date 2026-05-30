"""聚合所有 v1 路由"""
from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.workspaces import router as workspace_router
from app.api.v1.documents import router as document_router
from app.api.v1.chat import router as chat_router
from app.api.v1.search import router as search_router

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth_router)
api_router.include_router(workspace_router)
api_router.include_router(document_router)
api_router.include_router(chat_router)
api_router.include_router(search_router)
