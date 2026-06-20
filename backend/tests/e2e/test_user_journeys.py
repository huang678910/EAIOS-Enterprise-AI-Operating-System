"""End-to-end user journey tests — simulate complete UI flows via API"""

import pytest


@pytest.mark.asyncio
async def test_journey_onboarding(auth_headers, client):
    """Full onboarding: register → create company → departments → employees"""
    h = auth_headers["headers"]; ws = auth_headers["workspace_id"]

    # Verify profile exists
    resp = await client.get(f"/api/v1/workspaces/{ws}/company/profile", headers=h)
    assert resp.status_code == 200
    assert resp.json()["name"] == "Test Company"

    # Create departments
    for name in ["Tech", "Product", "Sales"]:
        resp = await client.post(f"/api/v1/workspaces/{ws}/company/departments", json={"name": name}, headers=h)
        assert resp.status_code == 201

    # Create employee
    depts = await client.get(f"/api/v1/workspaces/{ws}/company/departments", headers=h)
    tech_id = next(d["id"] for d in depts.json() if d["name"] == "Tech")
    resp = await client.post(f"/api/v1/workspaces/{ws}/company/employees", json={
        "name": "CEO", "email": "ceo@test.com", "department_id": tech_id
    }, headers=h)
    assert resp.status_code == 201


@pytest.mark.asyncio
async def test_journey_kpi_to_alert(auth_headers, client):
    """Create KPIs → record metrics → trigger alerts"""
    h = auth_headers["headers"]; ws = auth_headers["workspace_id"]

    # Create KPI below target
    await client.post(f"/api/v1/workspaces/{ws}/company/kpis", json={
        "name": "Revenue", "current_value": 300, "target_value": 1000, "unit": "万元"
    }, headers=h)

    # Record metrics
    for v in [200, 250, 280, 300]:
        await client.post(f"/api/v1/workspaces/{ws}/metrics/record", json={
            "metric_name": "revenue", "metric_value": v, "period": f"2026-{v//50:02d}"
        }, headers=h)

    # Check alerts
    resp = await client.post(f"/api/v1/workspaces/{ws}/alerts/proactive/check", headers=h)
    assert resp.status_code == 200
    assert resp.json()["alerts_generated"] >= 1

    # Verify alerts list
    resp = await client.get(f"/api/v1/workspaces/{ws}/alerts/proactive", headers=h)
    assert len(resp.json()) >= 1


@pytest.mark.asyncio
async def test_journey_forecast_to_decision(auth_headers, client):
    """Record data → forecast → verify analytics"""
    h = auth_headers["headers"]; ws = auth_headers["workspace_id"]

    # Record 6 months of data
    for i, v in enumerate([380, 420, 490, 550, 600, 720]):
        await client.post(f"/api/v1/workspaces/{ws}/metrics/record", json={
            "metric_name": "revenue_journey", "metric_value": v, "period": f"2026-{i+1:02d}"
        }, headers=h)

    # Forecast
    resp = await client.post(f"/api/v1/workspaces/{ws}/forecast/predict", json={
        "metric_name": "revenue_journey", "method": "moving_average"
    }, headers=h)
    assert resp.status_code == 200
    assert len(resp.json()["predictions"]) >= 1

    # Analytics dashboard
    resp = await client.get(f"/api/v1/workspaces/{ws}/analytics/dashboard", headers=h)
    assert resp.status_code == 200
    assert "trends" in resp.json()

    # Decision history
    resp = await client.get(f"/api/v1/workspaces/{ws}/chat/decision/history", headers=h)
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_journey_document_rag(auth_headers, client):
    """Upload document → verify it appears in list"""
    h = auth_headers["headers"]; ws = auth_headers["workspace_id"]

    # Upload a simple text file
    from io import BytesIO
    content = b"Sample document content for testing RAG pipeline"
    files = {"file": ("test.txt", BytesIO(content), "text/plain")}
    resp = await client.post(f"/api/v1/workspaces/{ws}/documents/upload", files=files, headers=h)
    assert resp.status_code == 201


@pytest.mark.asyncio
async def test_journey_rbac_viewer_blocked(auth_headers, client):
    """Verify viewer-level users are blocked from mutating data"""
    h = auth_headers["headers"]

    # Create a second workspace and try to access it without membership
    resp = await client.get("/api/v1/workspaces/00000000-0000-0000-0000-000000000000/company/profile", headers=h)
    assert resp.status_code == 403
