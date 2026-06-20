"""Self-contained flow tests — each test does full setup + operation + verification"""

import pytest
import uuid


async def _setup(client):
    email = f"t{uuid.uuid4().hex[:6]}@x.com"
    resp = await client.post("/api/v1/auth/register", json={"email": email, "username": f"u{uuid.uuid4().hex[:6]}", "password": "p123456"})
    token = resp.json()["access_token"]
    h = {"Authorization": f"Bearer {token}"}
    resp = await client.post("/api/v1/workspaces", json={"name": "T"}, headers=h)
    ws = resp.json()["id"]
    await client.put(f"/api/v1/workspaces/{ws}/company/profile", json={"name": "C", "industry": "Tech"}, headers=h)
    return h, ws


@pytest.mark.asyncio
async def test_company_crud_flow(client):
    h, ws = await _setup(client)
    resp = await client.post(f"/api/v1/workspaces/{ws}/company/departments", json={"name": "Eng"}, headers=h)
    assert resp.status_code == 201
    resp = await client.get(f"/api/v1/workspaces/{ws}/company/departments", headers=h)
    assert len(resp.json()) >= 1
    resp = await client.post(f"/api/v1/workspaces/{ws}/company/goals", json={"title": "G", "type": "KPI", "target_value": 100, "current_value": 50, "direction": "higher"}, headers=h)
    assert resp.status_code == 201
    resp = await client.post(f"/api/v1/workspaces/{ws}/company/kpis", json={"name": "K", "current_value": 5, "target_value": 10, "unit": "x"}, headers=h)
    assert resp.status_code == 201


@pytest.mark.asyncio
async def test_metrics_and_analytics_flow(client):
    h, ws = await _setup(client)
    for v in [100, 200, 300]:
        resp = await client.post(f"/api/v1/workspaces/{ws}/metrics/record", json={"metric_name": "r", "metric_value": v}, headers=h)
        assert resp.status_code == 201
    resp = await client.get(f"/api/v1/workspaces/{ws}/metrics/snapshot", headers=h)
    assert len(resp.json()["metrics"]) >= 1
    resp = await client.get(f"/api/v1/workspaces/{ws}/analytics/dashboard", headers=h)
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_alerts_flow(client):
    h, ws = await _setup(client)
    await client.post(f"/api/v1/workspaces/{ws}/company/kpis", json={"name": "Bad", "current_value": 300, "target_value": 1000, "unit": "w"}, headers=h)
    for i, v in enumerate([380, 420, 490, 550]):
        await client.post(f"/api/v1/workspaces/{ws}/metrics/record", json={"metric_name": "s", "metric_value": v, "period": f"2026-{i+1:02d}"}, headers=h)
    resp = await client.post(f"/api/v1/workspaces/{ws}/alerts/proactive/check", headers=h)
    assert resp.status_code == 200
    resp = await client.post(f"/api/v1/workspaces/{ws}/forecast/predict", json={"metric_name": "s", "method": "moving_average"}, headers=h)
    assert resp.status_code == 200
    assert len(resp.json()["predictions"]) >= 1
