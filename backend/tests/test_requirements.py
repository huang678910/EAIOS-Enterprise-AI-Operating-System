"""Self-contained API tests — each test does full setup + verification"""

import pytest
import uuid


@pytest.mark.asyncio
async def test_health_check(client):
    resp = await client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"
    assert "embedding_model" in data


@pytest.mark.asyncio
async def test_full_auth_and_crud_flow(client):
    """注册 → 登录 → 错误登录被拒 → Workspace → Company → Department"""
    # 1. Register
    email = f"auth{uuid.uuid4().hex[:6]}@t.com"
    resp = await client.post("/api/v1/auth/register", json={
        "email": email, "username": f"u{uuid.uuid4().hex[:6]}", "password": "p123456"
    })
    assert resp.status_code in (200, 201)
    token = resp.json()["access_token"]
    h = {"Authorization": f"Bearer {token}"}

    # 2. Login success
    resp = await client.post("/api/v1/auth/login", json={"email": email, "password": "p123456"})
    assert resp.status_code == 200

    # 3. Login invalid
    resp = await client.post("/api/v1/auth/login", json={"email": "bad@x.com", "password": "wrong"})
    assert resp.status_code == 401

    # 4. Create workspace
    resp = await client.post("/api/v1/workspaces", json={"name": "FlowWS"}, headers=h)
    assert resp.status_code == 201
    ws_id = resp.json()["id"]

    # 5. Create company profile
    resp = await client.put(f"/api/v1/workspaces/{ws_id}/company/profile", json={
        "name": "FlowCo", "industry": "Tech", "employee_count": 50
    }, headers=h)
    assert resp.status_code == 200

    # 6. Create department
    resp = await client.post(f"/api/v1/workspaces/{ws_id}/company/departments", json={"name": "Eng"}, headers=h)
    assert resp.status_code == 201

    # 7. List departments
    resp = await client.get(f"/api/v1/workspaces/{ws_id}/company/departments", headers=h)
    assert len(resp.json()) >= 1


@pytest.mark.asyncio
async def test_unauthenticated_rejected(client):
    """无 Token 的请求被拦截"""
    resp = await client.get("/api/v1/workspaces/00000000-0000-0000-0000-000000000001/company/goals")
    assert resp.status_code != 200
