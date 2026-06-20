"""Celery App - async task queue backed by Redis"""

from celery import Celery
from app.config import get_settings

settings = get_settings()

celery = Celery(
    "ai_workspace",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=[
        "app.tasks.document_tasks",
        "app.tasks.report_tasks",
        "app.tasks.alert_tasks",
    ],
)

celery.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_soft_time_limit=300,
    task_time_limit=600,
    beat_schedule={
        "check-metrics-hourly": {
            "task": "app.tasks.alert_tasks.check_metrics_alerts",
            "schedule": 3600.0,
        },
        "check-goals-daily": {
            "task": "app.tasks.alert_tasks.check_goals_alerts",
            "schedule": 86400.0,
        },
    },
)
