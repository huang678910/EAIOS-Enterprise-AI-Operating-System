"""预测引擎 REST API — /api/v1/workspaces/{workspace_id}/forecast/..."""

import uuid
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.api.deps import get_current_user, require_workspace_role
from app.models.user import User
from app.services.forecast_service import ForecastService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/workspaces/{workspace_id}/forecast", tags=["Forecast Engine"])


@router.post("/predict")
async def trigger_prediction(
    workspace_id: uuid.UUID,
    body: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """触发预测 — body: {metric_name, method?}，periods 自动推算"""
    await require_workspace_role(str(workspace_id), current_user, "member", db)
    svc = ForecastService(db)
    result = await svc.predict(
        str(workspace_id),
        metric_name=body.get("metric_name", ""),
        method=body.get("method", "moving_average"),
    )
    await db.commit()
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.get("/{metric_name}")
async def get_forecast(
    workspace_id: uuid.UUID,
    metric_name: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取某个指标的历史 + 预测数据"""
    await require_workspace_role(str(workspace_id), current_user, "viewer", db)
    svc = ForecastService(db)
    return await svc.get_forecast(str(workspace_id), metric_name)


@router.get("/dashboard/summary")
async def get_forecast_dashboard(
    workspace_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取所有指标的预测概览"""
    await require_workspace_role(str(workspace_id), current_user, "viewer", db)
    svc = ForecastService(db)
    return await svc.get_dashboard(str(workspace_id))
