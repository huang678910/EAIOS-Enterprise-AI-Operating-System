"""Workspace CRUD 服务"""
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload

from app.models.workspace import Workspace, WorkspaceMember, MemberRole
from app.schemas.workspace import WorkspaceCreate, WorkspaceUpdate
from app.core.exceptions import NotFoundException


class WorkspaceService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_by_user(self, user_id: UUID) -> list[Workspace]:
        # 查询用户拥有的 + 作为成员的 workspace
        from app.models.workspace import WorkspaceMember
        stmt = (
            select(Workspace)
            .outerjoin(WorkspaceMember, Workspace.id == WorkspaceMember.workspace_id)
            .where(or_(Workspace.owner_id == user_id, WorkspaceMember.user_id == user_id))
            .distinct()
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def create(self, owner_id: UUID, request: WorkspaceCreate) -> Workspace:
        workspace = Workspace(
            name=request.name,
            description=request.description,
            owner_id=owner_id,
        )
        self.db.add(workspace)
        await self.db.flush()

        # 创建者自动成为 admin 成员
        member = WorkspaceMember(
            workspace_id=workspace.id,
            user_id=owner_id,
            role=MemberRole.ADMIN,
        )
        self.db.add(member)
        return workspace

    async def get_by_id(self, workspace_id: str) -> Workspace:
        result = await self.db.execute(
            select(Workspace).where(Workspace.id == workspace_id)
        )
        workspace = result.scalar_one_or_none()
        if not workspace:
            raise NotFoundException("Workspace not found")
        return workspace

    async def update(self, workspace_id: str, request: WorkspaceUpdate) -> Workspace:
        workspace = await self.get_by_id(workspace_id)
        if request.name is not None:
            workspace.name = request.name
        if request.description is not None:
            workspace.description = request.description
        await self.db.flush()
        return workspace

    async def delete(self, workspace_id: str) -> None:
        workspace = await self.get_by_id(workspace_id)
        await self.db.delete(workspace)
