"""主动式 AI — 规则引擎 + 统计异常 + AI 评估 + 智能建议 + 告警升级"""

import logging
import math
from datetime import datetime, timezone, timedelta
from typing import Optional

from sqlalchemy import select, func, distinct
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.company import Company, CompanyKPI, CompanyGoal
from app.models.proactive_alert import ProactiveAlert
from app.models.business_metrics import BusinessMetric

logger = logging.getLogger(__name__)


class AlertService:

    def __init__(self, db: AsyncSession):
        self.db = db

    # ══════════════════════════════════════════════════════════
    #  Helpers
    # ══════════════════════════════════════════════════════════

    async def _get_company(self, workspace_id: str) -> Company | None:
        result = await self.db.execute(
            select(Company).where(Company.workspace_id == workspace_id)
        )
        return result.scalar_one_or_none()

    def _score_severity(self, deviation_pct: float, impact: float, trend: str, criticality: float) -> tuple[str, int]:
        """多维度加权评分 → severity + score (0-100)

        deviation_pct: 偏离目标百分比 (50 = 偏离50%)
        impact: 影响范围 (0-1, 如该指标占营收的38% → 0.38)
        trend: "worsening" | "stable" | "improving"
        criticality: 业务关键度 (0-1)
        """
        score = (
            min(deviation_pct * 0.4, 40) +   # 偏离度 (max 40)
            impact * 100 * 0.25 +               # 影响范围 (max 25)
            (30 if trend == "worsening" else 15 if trend == "stable" else 0) +
            criticality * 100 * 0.15            # 业务关键度 (max 15)
        )
        severity = "critical" if score >= 70 else "warning" if score >= 40 else "info"
        return severity, int(score)

    def _create_alert(
        self, workspace_id: str, company_id: str,
        alert_type: str, severity: str, title: str,
        description: str = "", metric_name: str | None = None,
        current_value: float | None = None, threshold_value: float | None = None,
        suggested_action: str | None = None,
        severity_score: int = 0,
    ) -> ProactiveAlert:
        alert = ProactiveAlert(
            workspace_id=workspace_id,
            company_id=company_id,
            alert_type=alert_type,
            severity=severity,
            title=title,
            description=description,
            metric_name=metric_name,
            current_value=current_value,
            threshold_value=threshold_value,
            suggested_action=suggested_action,
        )
        self.db.add(alert)
        return alert

    async def _is_duplicate(self, workspace_id: str, metric_name: str | None, alert_type: str) -> bool:
        result = await self.db.execute(
            select(ProactiveAlert).where(
                ProactiveAlert.workspace_id == workspace_id,
                ProactiveAlert.metric_name == metric_name,
                ProactiveAlert.alert_type == alert_type,
                ProactiveAlert.is_dismissed == False,
            ).order_by(ProactiveAlert.triggered_at.desc()).limit(1)
        )
        return result.scalar_one_or_none() is not None

    async def _get_historical_values(self, company_id: str, metric_name: str, limit: int = 12) -> list[float]:
        """获取指标历史值（时间升序）"""
        result = await self.db.execute(
            select(BusinessMetric.metric_value)
            .where(BusinessMetric.company_id == company_id, BusinessMetric.metric_name == metric_name)
            .order_by(BusinessMetric.recorded_at.asc())
            .limit(limit)
        )
        return [r[0] for r in result.all()]

    async def _get_metric_unit(self, company_id: str, metric_name: str) -> str | None:
        result = await self.db.execute(
            select(BusinessMetric.unit)
            .where(BusinessMetric.company_id == company_id, BusinessMetric.metric_name == metric_name)
            .order_by(BusinessMetric.recorded_at.desc()).limit(1)
        )
        r = result.scalar_one_or_none()
        return r[0] if r else None

    # ══════════════════════════════════════════════════════════
    #  Layer 1: Rule Engine (已增强)
    # ══════════════════════════════════════════════════════════

    async def check_metrics(self, workspace_id: str) -> list[ProactiveAlert]:
        """KPI 阈值 + Goal 进度"""
        company = await self._get_company(workspace_id)
        if not company:
            return []
        alerts = []

        kpi_result = await self.db.execute(select(CompanyKPI).where(CompanyKPI.company_id == company.id))
        for kpi in kpi_result.scalars().all():
            if kpi.current_value is None or kpi.target_value is None or kpi.target_value == 0:
                continue
            # Support both "higher is better" and "lower is better" KPIs
            ratio_higher = kpi.current_value / kpi.target_value
            ratio_lower = kpi.target_value / kpi.current_value if kpi.current_value > 0 else 0
            # Trigger if EITHER direction is below 80%
            ratio = min(ratio_higher, ratio_lower) if ratio_lower > 0 else ratio_higher
            is_lower_better = ratio_lower < ratio_higher  # "lower is better" KPI
            if ratio < 0.8 and not await self._is_duplicate(workspace_id, kpi.name, "metric_threshold"):
                deviation = round((1 - ratio) * 100)
                severity, score = self._score_severity(deviation, 0.3, "stable", 0.5)
                direction_text = "低于" if not is_lower_better else "超过"
                alerts.append(self._create_alert(
                    workspace_id, str(company.id), "metric_threshold", severity,
                    f"KPI Alert: {kpi.name}{direction_text}目标",
                    f"{kpi.name} 当前 {kpi.current_value}{kpi.unit or ''}，目标 {kpi.target_value}{kpi.unit or ''}（仅达 {ratio*100:.0f}%，偏离 {deviation}%）",
                    metric_name=kpi.name, current_value=kpi.current_value,
                    threshold_value=kpi.target_value, severity_score=score,
                    suggested_action=f"建议关注 {kpi.name} 趋势",
                ))

        goal_result = await self.db.execute(select(CompanyGoal).where(CompanyGoal.company_id == company.id))
        for goal in goal_result.scalars().all():
            if goal.progress_pct is not None and goal.progress_pct < 30 and goal.status == "active":
                if not await self._is_duplicate(workspace_id, goal.title, "goal_risk"):
                    alerts.append(self._create_alert(
                        workspace_id, str(company.id), "goal_risk", "warning",
                        f"Goal Risk: {goal.title}进度滞后",
                        f"'{goal.title}' 仅完成 {goal.progress_pct:.0f}%，状态 {goal.status}",
                        metric_name=goal.title, current_value=goal.progress_pct,
                        threshold_value=100, severity_score=45,
                        suggested_action="建议审视是否需要调整资源分配或延长期限",
                    ))
        return alerts

    # ══════════════════════════════════════════════════════════
    #  Layer 2: Statistical Anomaly Detection
    # ══════════════════════════════════════════════════════════

    async def check_statistical_anomalies(self, workspace_id: str) -> list[ProactiveAlert]:
        """统计异常检测：Z-score + 环比突变 + 趋势反转"""
        company = await self._get_company(workspace_id)
        if not company:
            return []
        alerts = []

        names_result = await self.db.execute(
            select(distinct(BusinessMetric.metric_name))
            .where(BusinessMetric.company_id == company.id)
        )
        for name in [r[0] for r in names_result.all()]:
            values = await self._get_historical_values(str(company.id), name, limit=12)
            if len(values) < 4:
                continue

            mean = sum(values) / len(values)
            std = math.sqrt(sum((v - mean) ** 2 for v in values) / len(values)) if len(values) > 1 else 0
            latest = values[-1]

            # ── Z-score anomaly ──
            if std > 0:
                z_score = abs(latest - mean) / std
                if z_score > 2.0 and not await self._is_duplicate(workspace_id, name, "anomaly"):
                    direction = "高于" if latest > mean else "低于"
                    alerts.append(self._create_alert(
                        workspace_id, str(company.id), "anomaly", "warning",
                        f"统计异常: {name}{direction}历史均值",
                        f"{name} 当前 {latest}，历史均值 {mean:.1f} ± {std:.1f}（Z-score={z_score:.1f}）",
                        metric_name=name, current_value=latest, threshold_value=mean,
                        severity_score=55,
                        suggested_action=f"{name} 出现显著偏差（{z_score:.1f}σ），建议排查原因",
                    ))

            # ── Month-over-month spike (latest vs previous) ──
            if len(values) >= 2:
                prev = values[-2]
                if prev != 0:
                    mom_change = abs((latest - prev) / prev) * 100
                    if mom_change > 30 and not await self._is_duplicate(workspace_id, name, "anomaly"):
                        direction = "上升" if latest > prev else "下降"
                        alerts.append(self._create_alert(
                            workspace_id, str(company.id), "anomaly", "warning",
                            f"环比突变: {name}环比{direction} {mom_change:.0f}%",
                            f"{name} 从上期 {prev} 变为 {latest}，变化 {mom_change:.0f}%",
                            metric_name=name, current_value=latest, threshold_value=prev,
                            severity_score=int(min(mom_change * 1.5, 85)),
                            suggested_action=f"环比变化 {mom_change:.0f}% 属异常波动，请确认是否为正常业务变化",
                        ))

            # ── Trend reversal (连续上升后突然下降，或反之) ──
            if len(values) >= 5:
                prev4 = values[-5:-1]
                if len(prev4) >= 3:
                    was_rising = all(prev4[i] < prev4[i + 1] for i in range(len(prev4) - 1))
                    was_falling = all(prev4[i] > prev4[i + 1] for i in range(len(prev4) - 1))
                    reversed_up = was_falling and latest > prev4[-1]
                    reversed_down = was_rising and latest < prev4[-1]
                    if (reversed_up or reversed_down) and not await self._is_duplicate(workspace_id, name, "anomaly"):
                        reversal_type = "止跌反弹" if reversed_up else "转升为跌"
                        alerts.append(self._create_alert(
                            workspace_id, str(company.id), "anomaly", "info",
                            f"趋势反转: {name}{reversal_type}",
                            f"{name} 此前连续{'下跌' if was_falling else '上涨'}，本期{'反弹' if reversed_up else '下跌'}至 {latest}",
                            metric_name=name, current_value=latest, severity_score=40,
                            suggested_action=f"趋势反转可能预示业务变化，建议持续观察后续走势",
                        ))

        return alerts

    async def check_trends(self, workspace_id: str) -> list[ProactiveAlert]:
        """连续下降检测（兼容旧接口）"""
        return await self.check_statistical_anomalies(workspace_id)

    # ══════════════════════════════════════════════════════════
    #  Layer 3+4: AI Assessment + Smart Actions
    # ══════════════════════════════════════════════════════════

    async def _ai_assess_and_enrich(self, workspace_id: str, candidate_alerts: list[ProactiveAlert]) -> list[ProactiveAlert]:
        """LLM 二次过滤 + 生成上下文相关建议"""
        if not candidate_alerts:
            return []

        try:
            from app.services.llm_service import _get_llm
            from app.services.company_service import CompanyService
            from langchain_core.messages import SystemMessage, HumanMessage

            # Build context
            company_name = ""
            try:
                async with self.db if True else self.db:
                    co_svc = CompanyService(self.db, workspace_id)
                    summary = await co_svc.get_company_summary()
                    if summary:
                        company_name = summary[:200]
            except Exception:
                pass

            # Build alert summary for LLM
            alert_lines = []
            for i, a in enumerate(candidate_alerts):
                alert_lines.append(
                    f"[{i}] {a.alert_type}/{a.severity}: {a.title}\n"
                    f"    Description: {a.description}\n"
                    f"    Metric: {a.metric_name}, Current: {a.current_value}"
                )
            alerts_text = "\n".join(alert_lines)

            prompt = f"""You are an enterprise monitoring AI. Review these candidate alerts and:
1. Filter out noise — skip alerts that are normal business fluctuations
2. For each valid alert, write a specific, actionable suggestion based on the company context
3. Adjust severity if needed

Company context: {company_name[:300]}

Candidate alerts:
{alerts_text}

Return JSON array. Keep only valid alerts. For each: {{"index": <number>, "keep": true, "severity": "critical"|"warning"|"info", "suggested_action": "<specific actionable suggestion in Chinese, 2-3 sentences, reference specific company data>"}}

Only return valid JSON array, no other text."""

            llm = _get_llm(streaming=False)
            messages = [
                SystemMessage(content="You filter enterprise alerts. Return only valid JSON array. Be strict — discard false alarms."),
                HumanMessage(content=prompt),
            ]
            response = await llm.ainvoke(messages)
            text = response.content.strip()

            # Parse JSON
            import json as json_mod
            if "```" in text:
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
                text = text.strip()

            decisions = json_mod.loads(text)
            if not isinstance(decisions, list):
                return candidate_alerts  # Fallback: keep all

            # Apply AI decisions
            kept_indices = {d["index"] for d in decisions if d.get("keep")}
            for d in decisions:
                idx = d["index"]
                if 0 <= idx < len(candidate_alerts):
                    alert = candidate_alerts[idx]
                    if d.get("severity"):
                        alert.severity = d["severity"]
                    if d.get("suggested_action"):
                        alert.suggested_action = d["suggested_action"]

            filtered = [a for i, a in enumerate(candidate_alerts) if i in kept_indices]
            discarded = len(candidate_alerts) - len(filtered)
            if discarded > 0:
                logger.info(f"AI filtered out {discarded} noise alerts for workspace {workspace_id}")
            return filtered

        except Exception as e:
            logger.warning(f"AI assessment failed, keeping all candidate alerts: {e}")
            return candidate_alerts

    # ══════════════════════════════════════════════════════════
    #  Layer 7: Alert Escalation
    # ══════════════════════════════════════════════════════════

    async def escalate_stale_alerts(self, workspace_id: str) -> int:
        """自动升级超时未处理的告警"""
        now = datetime.now(timezone.utc)
        escalated = 0

        # Info → Warning after 24h unread
        result = await self.db.execute(
            select(ProactiveAlert).where(
                ProactiveAlert.workspace_id == workspace_id,
                ProactiveAlert.severity == "info",
                ProactiveAlert.is_read == False,
                ProactiveAlert.is_dismissed == False,
                ProactiveAlert.triggered_at < now - timedelta(hours=24),
            )
        )
        for alert in result.scalars().all():
            alert.severity = "warning"
            alert.title = f"[升级] {alert.title}"
            escalated += 1

        # Warning → Critical after 72h unread
        result = await self.db.execute(
            select(ProactiveAlert).where(
                ProactiveAlert.workspace_id == workspace_id,
                ProactiveAlert.severity == "warning",
                ProactiveAlert.is_read == False,
                ProactiveAlert.is_dismissed == False,
                ProactiveAlert.triggered_at < now - timedelta(hours=72),
            )
        )
        for alert in result.scalars().all():
            alert.severity = "critical"
            alert.title = f"[升级] {alert.title}"
            escalated += 1

        if escalated:
            logger.info(f"Escalated {escalated} stale alerts in workspace {workspace_id}")
        return escalated

    # ══════════════════════════════════════════════════════════
    #  Orchestrator
    # ══════════════════════════════════════════════════════════

    async def run_all_checks(self, workspace_id: str, use_ai: bool = False) -> list[ProactiveAlert]:
        """运行完整告警流水线"""
        # Layer 1: Rule engine
        candidates = []
        candidates.extend(await self.check_metrics(workspace_id))

        # Layer 2: Statistical anomalies
        candidates.extend(await self.check_statistical_anomalies(workspace_id))

        # Layer 3+4: AI assessment + enrichment (optional for manual checks)
        if use_ai:
            candidates = await self._ai_assess_and_enrich(workspace_id, candidates)

        # Layer 7: Escalation of stale alerts
        await self.escalate_stale_alerts(workspace_id)

        return candidates

    async def get_unread(self, workspace_id: str) -> list[ProactiveAlert]:
        result = await self.db.execute(
            select(ProactiveAlert)
            .where(
                ProactiveAlert.workspace_id == workspace_id,
                ProactiveAlert.is_dismissed == False,
            )
            .order_by(
                ProactiveAlert.severity == "critical",
                ProactiveAlert.triggered_at.desc(),
            )
            .limit(30)
        )
        return list(result.scalars().all())
