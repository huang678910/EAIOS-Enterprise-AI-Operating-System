"""主动式 AI REST API — /api/v1/workspaces/{workspace_id}/alerts/proactive/..."""

import uuid
import logging
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.api.deps import get_current_user, require_workspace_role
from app.models.user import User
from app.services.alert_service import AlertService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/workspaces/{workspace_id}/alerts/proactive", tags=["Proactive AI"])


@router.get("")
async def list_alerts(
    workspace_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取未读主动告警列表"""
    await require_workspace_role(str(workspace_id), current_user, "viewer", db)
    svc = AlertService(db)
    alerts = await svc.get_unread(str(workspace_id))
    return [
        {
            "id": str(a.id),
            "alert_type": a.alert_type,
            "severity": a.severity,
            "title": a.title,
            "description": a.description,
            "metric_name": a.metric_name,
            "current_value": a.current_value,
            "threshold_value": a.threshold_value,
            "suggested_action": a.suggested_action,
            "is_read": a.is_read,
            "triggered_at": a.triggered_at.isoformat() if a.triggered_at else None,
        }
        for a in alerts
    ]


@router.put("/{alert_id}/read")
async def mark_read(
    workspace_id: uuid.UUID,
    alert_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """标记告警为已读"""
    await require_workspace_role(str(workspace_id), current_user, "member", db)
    from sqlalchemy import select
    from app.models.proactive_alert import ProactiveAlert
    result = await db.execute(select(ProactiveAlert).where(ProactiveAlert.id == alert_id))
    alert = result.scalar_one_or_none()
    if alert:
        alert.is_read = True
        await db.commit()
        return {"status": "ok"}
    return {"error": "Alert not found"}


@router.put("/{alert_id}/dismiss")
async def dismiss_alert(
    workspace_id: uuid.UUID,
    alert_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """忽略告警"""
    await require_workspace_role(str(workspace_id), current_user, "member", db)
    from sqlalchemy import select
    from app.models.proactive_alert import ProactiveAlert
    result = await db.execute(select(ProactiveAlert).where(ProactiveAlert.id == alert_id))
    alert = result.scalar_one_or_none()
    if alert:
        alert.is_dismissed = True
        await db.commit()
        return {"status": "ok"}
    return {"error": "Alert not found"}


@router.post("/check")
async def trigger_alert_check(
    workspace_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """手动触发一次告警检查"""
    await require_workspace_role(str(workspace_id), current_user, "member", db)
    svc = AlertService(db)
    alerts = await svc.run_all_checks(str(workspace_id))
    await db.commit()
    return {"checked": True, "alerts_generated": len(alerts)}
