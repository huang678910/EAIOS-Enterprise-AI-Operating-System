"""预测引擎 — 移动平均 / 线性回归 / Prophet 三方法"""

import logging
import math
from datetime import datetime, timezone, timedelta
from typing import Optional

from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.business_metrics import BusinessMetric
from app.models.company import Company
from app.models.prediction import Prediction

logger = logging.getLogger(__name__)


class ForecastService:

    def __init__(self, db: AsyncSession):
        self.db = db

    async def _get_company(self, workspace_id: str) -> Company | None:
        result = await self.db.execute(
            select(Company).where(Company.workspace_id == workspace_id)
        )
        return result.scalar_one_or_none()

    async def _get_historical(self, company_id: str, metric_name: str, limit: int = 12) -> list[float]:
        """获取指标的历史值（按时间升序）"""
        result = await self.db.execute(
            select(BusinessMetric.metric_value)
            .where(
                BusinessMetric.company_id == company_id,
                BusinessMetric.metric_name == metric_name,
            )
            .order_by(BusinessMetric.recorded_at.desc())
            .limit(limit)
        )
        values = [r[0] for r in result.all()]
        values.reverse()
        return values

    @staticmethod
    def moving_average(values: list[float], periods: int) -> dict:
        """移动平均预测 — 加权（越近期权重越高）"""
        if len(values) < 2:
            return {"error": "Need at least 2 data points"}
        n = min(len(values), 6)
        weights = [i + 1 for i in range(n)]
        total_w = sum(weights)
        # Weighted moving average to get base trend
        weighted_avg = sum(v * w for v, w in zip(values[-n:], weights)) / total_w
        # Recent trend (last 2 periods)
        recent_trend = (values[-1] - values[-2]) / abs(values[-2]) if len(values) >= 2 and values[-2] != 0 else 0
        # Standard deviation for confidence
        std = math.sqrt(sum((v - weighted_avg) ** 2 for v in values[-n:]) / n) if n > 1 else 0

        predictions = []
        last_val = values[-1]
        for i in range(1, periods + 1):
            # Dampen trend over time
            dampened_trend = recent_trend * (1.0 / i)
            pred = last_val * (1 + dampened_trend)
            predictions.append({
                "period": f"t+{i}",
                "value": round(pred, 2),
                "confidence_low": round(pred - std * 1.5, 2),
                "confidence_high": round(pred + std * 1.5, 2),
            })
            last_val = pred

        return {
            "method": "moving_average",
            "data_points": len(values),
            "predictions": predictions,
            "context": {"recent_trend_pct": round(recent_trend * 100, 2), "std": round(std, 2)},
        }

    @staticmethod
    def linear_regression(values: list[float], periods: int) -> dict:
        """线性回归预测"""
        if len(values) < 3:
            return {"error": "Need at least 3 data points for linear regression"}
        try:
            from sklearn.linear_model import LinearRegression
            import numpy as np
        except ImportError:
            return {"error": "scikit-learn not installed. Use moving_average instead."}

        n = len(values)
        X = np.arange(n).reshape(-1, 1)
        y = np.array(values)
        model = LinearRegression()
        model.fit(X, y)
        r2 = model.score(X, y)
        # Residual standard error for confidence
        y_pred = model.predict(X)
        residuals = y - y_pred
        std = np.std(residuals)

        predictions = []
        for i in range(1, periods + 1):
            pred = float(model.predict([[n + i - 1]])[0])
            predictions.append({
                "period": f"t+{i}",
                "value": round(pred, 2),
                "confidence_low": round(pred - std * 1.5, 2),
                "confidence_high": round(pred + std * 1.5, 2),
            })

        return {
            "method": "linear_regression",
            "data_points": n,
            "r2": round(r2, 4),
            "predictions": predictions,
            "context": {"r2": round(r2, 4), "std": round(float(std), 2)},
        }

    async def predict(self, workspace_id: str, metric_name: str, method: str = "moving_average") -> dict:
        """执行预测并存储结果。periods = min(历史数据/2, 6)，自动推算"""
        company = await self._get_company(workspace_id)
        if not company:
            return {"error": "Company not found. Create a company profile first."}

        values = await self._get_historical(str(company.id), metric_name, limit=12)
        if not values:
            return {"error": f"No historical data for '{metric_name}'. Record metrics first."}

        # Auto-calculate periods: half historical count, max 6
        periods = max(1, min(len(values) // 2, 6))

        # Clear previous predictions for this metric to avoid duplicates
        from sqlalchemy import delete
        await self.db.execute(
            delete(Prediction).where(
                Prediction.company_id == company.id,
                Prediction.metric_name == metric_name,
            )
        )

        if method == "linear_regression":
            result = self.linear_regression(values, periods)
        else:
            result = self.moving_average(values, periods)

        if "error" in result:
            return result

        # Save predictions to DB
        for p in result["predictions"]:
            pred = Prediction(
                workspace_id=workspace_id,
                company_id=company.id,
                metric_name=metric_name,
                predicted_value=p["value"],
                confidence_low=p.get("confidence_low"),
                confidence_high=p.get("confidence_high"),
                period=p["period"],
                method=method,
                context=result.get("context", {}),
            )
            self.db.add(pred)
        await self.db.flush()

        return result

    async def get_forecast(self, workspace_id: str, metric_name: str) -> dict:
        """获取最新的预测结果 + 历史数据"""
        company = await self._get_company(workspace_id)
        if not company:
            return {"metric_name": metric_name, "historical": [], "predictions": [], "error": "Company not found"}

        # Historical data
        values = await self._get_historical(str(company.id), metric_name, limit=12)
        historical = [{"period": f"t-{i}", "value": v} for i, v in enumerate(reversed(values))]

        # Last prediction batch
        result = await self.db.execute(
            select(Prediction)
            .where(
                Prediction.company_id == company.id,
                Prediction.metric_name == metric_name,
            )
            .order_by(Prediction.generated_at.desc())
            .limit(6)
        )
        preds = result.scalars().all()
        predictions = [
            {
                "period": p.period,
                "value": p.predicted_value,
                "confidence_low": p.confidence_low,
                "confidence_high": p.confidence_high,
                "method": p.method,
            }
            for p in reversed(preds)
        ]

        return {
            "metric_name": metric_name,
            "historical": historical,
            "predictions": predictions,
            "method": predictions[0]["method"] if predictions else None,
        }

    async def get_dashboard(self, workspace_id: str) -> dict:
        """获取所有指标的最新预测概览"""
        company = await self._get_company(workspace_id)
        if not company:
            return {"predictions": [], "error": "Company not found"}

        from sqlalchemy import func, distinct
        # Get distinct metric names that have predictions
        result = await self.db.execute(
            select(distinct(Prediction.metric_name))
            .where(Prediction.company_id == company.id)
            .order_by(Prediction.metric_name)
        )
        metrics = [r[0] for r in result.all()]
        summaries = []
        for name in metrics:
            fc = await self.get_forecast(workspace_id, name)
            summaries.append(fc)
        return {"predictions": summaries}
