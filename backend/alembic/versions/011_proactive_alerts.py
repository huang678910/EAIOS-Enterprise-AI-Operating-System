"""主动式 AI — proactive_alerts 表

Revision ID: 011
Create Date: 2026-06-11
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "011"
down_revision: str | None = "010"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade():
    op.create_table(
        "proactive_alerts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False),
        sa.Column("alert_type", sa.String(50), nullable=False, server_default="metric_threshold"),
        sa.Column("severity", sa.String(20), nullable=False, server_default="info"),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("metric_name", sa.String(100), nullable=True),
        sa.Column("current_value", sa.Float(), nullable=True),
        sa.Column("threshold_value", sa.Float(), nullable=True),
        sa.Column("suggested_action", sa.Text(), nullable=True),
        sa.Column("is_read", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("is_dismissed", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("triggered_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("idx_alerts_workspace_read", "proactive_alerts", ["workspace_id", "is_read"])
    op.create_index("idx_alerts_severity", "proactive_alerts", ["severity"])


def downgrade():
    op.drop_index("idx_alerts_severity", table_name="proactive_alerts")
    op.drop_index("idx_alerts_workspace_read", table_name="proactive_alerts")
    op.drop_table("proactive_alerts")
