"""Database model CRUD + relationship tests"""

import pytest
import uuid
from sqlalchemy import select
from app.models.company import Company, Department, Position, Employee, Product, Customer, CompanyGoal, CompanyKPI
from app.models.business_metrics import BusinessMetric
from app.models.prediction import Prediction
from app.models.proactive_alert import ProactiveAlert
from app.models.decision import Decision


@pytest.mark.asyncio
async def test_company_crud(db):
    from app.models.workspace import Workspace
    ws = Workspace(id=uuid.uuid4(), name="Test WS", owner_id=uuid.uuid4())
    db.add(ws); await db.flush()

    comp = Company(workspace_id=ws.id, name="TestCo", industry="Tech", employee_count=10)
    db.add(comp); await db.flush()

    result = await db.execute(select(Company).where(Company.name == "TestCo"))
    assert result.scalar_one_or_none() is not None


@pytest.mark.asyncio
async def test_department_with_parent(db):
    from app.models.workspace import Workspace
    ws = Workspace(id=uuid.uuid4(), name="WS", owner_id=uuid.uuid4())
    c = Company(id=uuid.uuid4(), workspace_id=ws.id, name="C")
    db.add_all([ws, c]); await db.flush()

    parent = Department(company_id=c.id, name="Parent", type="HQ")
    db.add(parent); await db.flush()
    child = Department(company_id=c.id, name="Child", type="Sub", parent_id=parent.id)
    db.add(child); await db.flush()

    assert child.parent_id == parent.id
    assert len(parent.children) >= 1


@pytest.mark.asyncio
async def test_employee_position_relations(db):
    from app.models.workspace import Workspace
    ws = Workspace(id=uuid.uuid4(), name="WS", owner_id=uuid.uuid4())
    c = Company(id=uuid.uuid4(), workspace_id=ws.id, name="C")
    dept = Department(id=uuid.uuid4(), company_id=c.id, name="Eng")
    pos = Position(id=uuid.uuid4(), company_id=c.id, department_id=dept.id, title="SDE")
    emp = Employee(id=uuid.uuid4(), company_id=c.id, department_id=dept.id, position_id=pos.id, name="Bob")
    db.add_all([ws, c, dept, pos, emp]); await db.flush()

    result = await db.execute(select(Employee).where(Employee.name == "Bob"))
    e = result.scalar_one()
    assert e.department is not None
    assert e.position.title == "SDE"


@pytest.mark.asyncio
async def test_business_metric_creation(db):
    m = BusinessMetric(company_id=uuid.uuid4(), metric_name="revenue", metric_value=100.0, unit="USD")
    db.add(m); await db.flush()
    assert m.metric_value == 100.0


@pytest.mark.asyncio
async def test_prediction_creation(db):
    p = Prediction(workspace_id=str(uuid.uuid4()), company_id=uuid.uuid4(), metric_name="revenue",
                   predicted_value=500.0, method="moving_average")
    db.add(p); await db.flush()
    assert p.predicted_value == 500.0


@pytest.mark.asyncio
async def test_goal_direction_calculation():
    from app.services.company_service import CompanyService
    svc = CompanyService.__new__(CompanyService)
    # higher is better
    assert svc._calc_progress(50, 100, "higher") == 50
    assert svc._calc_progress(150, 100, "higher") == 100  # capped
    # lower is better
    assert 69 <= svc._calc_progress(7.2, 5, "lower") <= 70  # 5/7.2=69.4
    assert svc._calc_progress(3, 5, "lower") == 100  # already achieved


@pytest.mark.asyncio
async def test_proactive_alert_creation(db):
    a = ProactiveAlert(workspace_id=str(uuid.uuid4()), company_id=str(uuid.uuid4()),
                       alert_type="metric_threshold", severity="warning", title="Test Alert")
    db.add(a); await db.flush()
    assert a.is_read is False
    assert a.is_dismissed is False


@pytest.mark.asyncio
async def test_decision_creation(db):
    d = Decision(workspace_id=str(uuid.uuid4()), question="Should we expand?", status="pending")
    db.add(d); await db.flush()
    assert d.status == "pending"
