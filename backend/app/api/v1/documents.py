"""文档管理 API — 上传 / 列表 / 删除"""

from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.document import DocumentResponse, DocumentListResponse, UploadResponse
from app.services.document_service import DocumentService

router = APIRouter(prefix="/workspaces/{workspace_id}/documents", tags=["Documents"])


@router.get("", response_model=DocumentListResponse)
async def list_documents(
    workspace_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """列出 Workspace 下所有文档"""
    documents = await DocumentService(db).list_by_workspace(workspace_id)
    return DocumentListResponse(
        documents=[DocumentResponse.model_validate(d) for d in documents],
        total=len(documents),
    )


@router.post("/upload", response_model=UploadResponse, status_code=201)
async def upload_document(
    workspace_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """上传文档并触发解析流水线"""
    return await DocumentService(db).upload(workspace_id, file)


@router.delete("/{document_id}", status_code=204)
async def delete_document(
    workspace_id: str,
    document_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """删除文档及其所有 Chunks"""
    await DocumentService(db).delete(document_id)
