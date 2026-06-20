"""Company Profile API tests"""

import pytest


@pytest.mark.asyncio
async def test_create_department(auth_headers, client):
    h = auth_headers["headers"]; ws = auth_headers["workspace_id"]
    resp = await client.post(f"/api/v1/workspaces/{ws}/company/departments", json={"name": "Engineering", "type": "Tech"}, headers=h)
    assert resp.status_code == 201
    assert resp.json()["name"] == "Engineering"

@pytest.mark.asyncio
async def test_create_department_child(auth_headers, client):
    h = auth_headers["headers"]; ws = auth_headers["workspace_id"]
    parent = await client.post(f"/api/v1/workspaces/{ws}/company/departments", json={"name": "Parent"}, headers=h)
    pid = parent.json()["id"]
    resp = await client.post(f"/api/v1/workspaces/{ws}/company/departments", json={"name": "Child", "parent_id": pid}, headers=h)
    assert resp.status_code == 201

@pytest.mark.asyncio
async def test_department_list_tree(auth_headers, client):
    h = auth_headers["headers"]; ws = auth_headers["workspace_id"]
    resp = await client.get(f"/api/v1/workspaces/{ws}/company/departments", headers=h)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)

@pytest.mark.asyncio
async def test_create_position(auth_headers, client):
    h = auth_headers["headers"]; ws = auth_headers["workspace_id"]
    dept = await client.post(f"/api/v1/workspaces/{ws}/company/departments", json={"name": "HR"}, headers=h)
    resp = await client.post(f"/api/v1/workspaces/{ws}/company/positions", json={
        "title": "Senior Engineer", "level": "Senior", "department_id": dept.json()["id"]
    }, headers=h)
    assert resp.status_code == 201

@pytest.mark.asyncio
async def test_create_employee(auth_headers, client):
    h = auth_headers["headers"]; ws = auth_headers["workspace_id"]
    dept = await client.post(f"/api/v1/workspaces/{ws}/company/departments", json={"name": "IT"}, headers=h)
    pos = await client.post(f"/api/v1/workspaces/{ws}/company/positions", json={"title": "Dev", "department_id": dept.json()["id"]}, headers=h)
    resp = await client.post(f"/api/v1/workspaces/{ws}/company/employees", json={
        "name": "Alice", "email": "alice@test.com",
        "department_id": dept.json()["id"], "position_id": pos.json()["id"]
    }, headers=h)
    assert resp.status_code == 201
    assert resp.json()["name"] == "Alice"

@pytest.mark.asyncio
async def test_create_product(auth_headers, client):
    h = auth_headers["headers"]; ws = auth_headers["workspace_id"]
    resp = await client.post(f"/api/v1/workspaces/{ws}/company/products", json={
        "name": "Cloud Platform", "category": "SaaS", "target_market": ["CN"]
    }, headers=h)
    assert resp.status_code == 201

@pytest.mark.asyncio
async def test_create_customer(auth_headers, client):
    h = auth_headers["headers"]; ws = auth_headers["workspace_id"]
    resp = await client.post(f"/api/v1/workspaces/{ws}/company/customers", json={
        "name": "Client A", "market": "CN", "type": "Enterprise"
    }, headers=h)
    assert resp.status_code == 201

@pytest.mark.asyncio
async def test_create_goal(auth_headers, client):
    h = auth_headers["headers"]; ws = auth_headers["workspace_id"]
    resp = await client.post(f"/api/v1/workspaces/{ws}/company/goals", json={
        "title": "Revenue 100M", "type": "KPI", "target_value": 100, "current_value": 65, "direction": "higher"
    }, headers=h)
    assert resp.status_code == 201
    g = resp.json()
    assert g["progress_pct"] == 65

@pytest.mark.asyncio
async def test_create_kpi(auth_headers, client):
    h = auth_headers["headers"]; ws = auth_headers["workspace_id"]
    resp = await client.post(f"/api/v1/workspaces/{ws}/company/kpis", json={
        "name": "Revenue", "current_value": 500, "target_value": 1000, "unit": "万元", "period": "Monthly"
    }, headers=h)
    assert resp.status_code == 201

@pytest.mark.asyncio
async def test_requires_auth(client):
    resp = await client.get("/api/v1/workspaces/00000000-0000-0000-0000-000000000000/company/goals")
    assert resp.status_code in (401, 403)
