"""Celery Beat 定时任务 — 主动告警扫描 + AI 评估 + WS 推送"""

import logging
import asyncio
from app.celery_app import celery

logger = logging.getLogger(__name__)


async def _push_alerts_to_workspace(workspace_id: str, alerts: list):
    """通过 WebSocket 推送新告警到该 workspace 的所有在线客户端"""
    if not alerts:
        return
    try:
        from app.services.ws_manager import ws_manager
        payload = {
            "type": "proactive_alerts",
            "data": {
                "count": len(alerts),
                "alerts": [
                    {
                        "id": str(a.id),
                        "alert_type": a.alert_type,
                        "severity": a.severity,
                        "title": a.title,
                        "description": a.description,
                        "suggested_action": a.suggested_action,
                    }
                    for a in alerts[:5]  # Push max 5 to avoid overwhelming
                ],
            },
        }
        await ws_manager.broadcast_to_workspace(workspace_id, payload)
        logger.info(f"Pushed {len(alerts)} alerts to workspace {workspace_id}")
    except Exception as e:
        logger.warning(f"Alert WS push failed: {e}")


async def _scan_all_workspaces(use_ai: bool = False):
    """扫描所有 workspace"""
    try:
        from app.database import AsyncSessionLocal
        from sqlalchemy import select
        from app.models.workspace import Workspace
        from app.services.alert_service import AlertService

        async with AsyncSessionLocal() as s:
            result = await s.execute(select(Workspace.id))
            workspace_ids = [r[0] for r in result.all()]
            total_alerts = 0
            for ws_id in workspace_ids:
                svc = AlertService(s)
                alerts = await svc.run_all_checks(str(ws_id), use_ai=use_ai)
                if alerts:
                    total_alerts += len(alerts)
                    await _push_alerts_to_workspace(str(ws_id), alerts)

            if total_alerts > 0:
                await s.commit()
                logger.info(f"Alert scan: {total_alerts} new alerts across {len(workspace_ids)} workspaces")
            else:
                await s.rollback()
    except Exception as e:
        logger.error(f"Alert scan failed: {e}")


@celery.task(name="app.tasks.alert_tasks.check_metrics_alerts", bind=True, max_retries=1)
def check_metrics_alerts(self):
    """每小时：规则引擎 + 统计异常 + 告警升级 + WS 推送"""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(_scan_all_workspaces(use_ai=False))
    return {"status": "ok", "message": "Hourly metrics + anomaly scan completed"}


@celery.task(name="app.tasks.alert_tasks.check_goals_alerts", bind=True, max_retries=1)
def check_goals_alerts(self):
    """每天：完整扫描 + AI 评估过滤 + 智能建议 + WS 推送"""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(_scan_all_workspaces(use_ai=True))
    return {"status": "ok", "message": "Daily full scan with AI assessment completed"}
