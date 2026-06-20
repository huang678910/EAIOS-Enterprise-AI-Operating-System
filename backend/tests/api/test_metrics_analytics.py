"""Metrics + Analytics + Alerts API tests"""

import pytest


@pytest.mark.asyncio
async def test_record_metric(auth_headers, client):
    h = auth_headers["headers"]; ws = auth_headers["workspace_id"]
    resp = await client.post(f"/api/v1/workspaces/{ws}/metrics/record", json={
        "metric_name": "revenue", "metric_value": 500, "unit": "万元", "period": "2026-06"
    }, headers=h)
    assert resp.status_code == 201
    assert resp.json()["metric_value"] == 500

@pytest.mark.asyncio
async def test_get_snapshot(auth_headers, client):
    h = auth_headers["headers"]; ws = auth_headers["workspace_id"]
    await client.post(f"/api/v1/workspaces/{ws}/metrics/record", json={
        "metric_name": "orders", "metric_value": 100, "period": "2026-06"
    }, headers=h)
    resp = await client.get(f"/api/v1/workspaces/{ws}/metrics/snapshot", headers=h)
    assert resp.status_code == 200
    metrics = resp.json()["metrics"]
    assert len(metrics) >= 1

@pytest.mark.asyncio
async def test_get_trend(auth_headers, client):
    h = auth_headers["headers"]; ws = auth_headers["workspace_id"]
    resp = await client.get(f"/api/v1/workspaces/{ws}/metrics/trend/orders", headers=h)
    assert resp.status_code == 200

@pytest.mark.asyncio
async def test_batch_metrics(auth_headers, client):
    h = auth_headers["headers"]; ws = auth_headers["workspace_id"]
    resp = await client.post(f"/api/v1/workspaces/{ws}/metrics/batch", json={
        "metrics": [
            {"metric_name": "a", "metric_value": 1, "period": "2026-01"},
            {"metric_name": "b", "metric_value": 2, "period": "2026-01"},
        ]
    }, headers=h)
    assert resp.status_code == 201
    assert resp.json()["total"] == 2

@pytest.mark.asyncio
async def test_analytics_dashboard(auth_headers, client):
    h = auth_headers["headers"]; ws = auth_headers["workspace_id"]
    resp = await client.get(f"/api/v1/workspaces/{ws}/analytics/dashboard", headers=h)
    assert resp.status_code == 200
    assert "metrics_snapshot" in resp.json()

@pytest.mark.asyncio
async def test_proactive_alerts_check(auth_headers, client):
    h = auth_headers["headers"]; ws = auth_headers["workspace_id"]
    resp = await client.post(f"/api/v1/workspaces/{ws}/alerts/proactive/check", headers=h)
    assert resp.status_code == 200
    assert resp.json()["checked"] == True

@pytest.mark.asyncio
async def test_forecast_predict(auth_headers, client):
    h = auth_headers["headers"]; ws = auth_headers["workspace_id"]
    # Record 4 data points
    for v in [380, 450, 520, 610]:
        await client.post(f"/api/v1/workspaces/{ws}/metrics/record", json={
            "metric_name": "revenue_fc", "metric_value": v, "period": f"2026-0{len(str(v))}"
        }, headers=h)
    resp = await client.post(f"/api/v1/workspaces/{ws}/forecast/predict", json={
        "metric_name": "revenue_fc", "method": "moving_average"
    }, headers=h)
    assert resp.status_code == 200
    assert "predictions" in resp.json()
