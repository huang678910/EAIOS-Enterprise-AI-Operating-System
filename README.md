# EAIOS — Enterprise AI Operating System

企业专属智能操作系统。理解企业、记忆企业、分析企业、预测企业、辅助企业决策。

---

## 系统架构（10 层）

```
┌─────────────────────────────────────────────────────────────┐
│  L10  战略决策中心    Strategic Decision Center              │
│  L9   主动式 AI       Proactive AI (Celery Beat)            │
│  L8   预测引擎         Forecast Engine                       │
│  L7   企业分析中心     Analytics Center                      │
│  L6   部门 Agent ×7   CEO/CFO/VP Sales/CHRO/COO/CPO/Cust   │
│  L5   数字孪生         Digital Twin                          │
│  L4   知识图谱         Knowledge Graph (Neo4j)               │
│  L3   企业记忆         Enterprise Memory                     │
│  L2   知识中心         Knowledge Hub (RAG)                   │
│  L1   企业画像         Company Profile                       │
└─────────────────────────────────────────────────────────────┘
```

## 技术栈

| 层 | 技术 |
|----|------|
| 前端 | Next.js 15 + React 19 + TypeScript + TailwindCSS + shadcn/ui |
| 后端 | FastAPI + Pydantic v2 + SQLAlchemy Async |
| Agent | LangGraph + LangChain + DeepSeek API（16 个 Agent） |
| 数据 | PostgreSQL + pgvector + Neo4j + Redis |
| 任务 | Celery + Celery Beat |
| 部署 | Docker Compose + Nginx |

## 快速启动

```bash
# 1. 启动所有服务
docker-compose up -d

# 2. 执行数据库迁移
docker-compose exec backend alembic upgrade head

# 3. 访问
# 前端: http://localhost:3000 (或 http://localhost 通过 Nginx)
# 后端 API: http://localhost:8000
# API 文档: http://localhost:8000/docs
# Neo4j: http://localhost:7474
```

## 项目结构

```
├── frontend/                     # Next.js 15 前端
│   └── src/app/                  # 16 个页面
├── backend/                      # FastAPI 后端
│   ├── app/
│   │   ├── agents/               # 16 个 Agent
│   │   ├── api/v1/               # 19 个 API 路由
│   │   ├── models/               # 22 张数据表
│   │   ├── services/             # 业务逻辑
│   │   └── tasks/                # Celery 任务
│   ├── alembic/                  # 数据库迁移
│   └── tests/                    # 自动化测试
├── nginx/                        # Nginx 反向代理
├── docker-compose.yml            # 6 服务编排
└── .github/workflows/ci.yml     # CI/CD
```

## 功能概览

| 页面 | 功能 |
|------|------|
| **Chat** | 多 Agent 对话，WebSocket 流式响应 |
| **Documents** | 文档上传/解析/预览（PDF/DOCX/PPTX/XLSX/CSV） |
| **Knowledge** | RAG 语义搜索 + GitHub/Notion/Jira/Confluence 连接器 + 音频转录 |
| **Graph** | Neo4j 知识图谱可视化与搜索 |
| **Memories** | 三种记忆（长期/事件/语义）+ 自动提取 + 语义召回 |
| **Analytics** | KPI 仪表盘 + 趋势图 + AI 分析 + Proactive Alerts |
| **Forecast** | 预测引擎（移动平均/线性回归） |
| **Decision Center** | 战略决策分析，5 维度框架 |
| **Reports** | 自动生成的 AI 报告下载 |
| **Members** | 工作空间成员管理（Admin/Member/Viewer） |
| **Settings** | 企业画像/组织/业务/目标/Metrics |

## API 端点

| 路由 | 端点 | 说明 |
|------|------|------|
| `/api/v1/auth` | login/register/refresh | 认证 |
| `/api/v1/workspaces` | CRUD | 工作空间 |
| `/api/v1/workspaces/{id}/company` | 37 端点 | 企业画像（9 实体） |
| `/api/v1/workspaces/{id}/documents` | upload/list/preview/delete | 文档管理 |
| `/api/v1/workspaces/{id}/knowledge` | search/connect/transcribe | 知识中心 |
| `/api/v1/workspaces/{id}/memories` | 8 端点 | 企业记忆 |
| `/api/v1/workspaces/{id}/graph` | query/search/stats/sync | 知识图谱 |
| `/api/v1/workspaces/{id}/metrics` | 6 端点 | 数字孪生 |
| `/api/v1/workspaces/{id}/analytics` | dashboard/analyze/alerts | 分析中心 |
| `/api/v1/workspaces/{id}/forecast` | predict/forecast/dashboard | 预测引擎 |
| `/api/v1/workspaces/{id}/alerts` | check/dismiss/history | 主动告警 |
| `/api/v1/workspaces/{id}/chat` | sessions/send/stream | 对话 |

完整 API 文档：`http://localhost:8000/docs`

## 测试

```bash
cd backend

# 全部基础测试（3 个，全部通过）
pytest tests/test_requirements.py -v

# 流程测试（单独运行）
pytest tests/api/test_flows.py::test_company_crud_flow -v
pytest tests/api/test_flows.py::test_metrics_and_analytics_flow -v
pytest tests/api/test_flows.py::test_alerts_flow -v
```

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `DEEPSEEK_API_KEY` | LLM API 密钥 | — |
| `TAVILY_API_KEY` | Web Search API 密钥 | — |
| `DB_USER/PASSWORD/HOST/PORT/NAME` | PostgreSQL 连接 | postgres/postgres/localhost/5432/ai_workspace |
| `REDIS_URL` | Redis 连接 | redis://localhost:6379/0 |
| `NEO4J_URI/USER/PASSWORD` | Neo4j 连接 | bolt://localhost:7687/neo4j/password |
| `NEXT_PUBLIC_API_URL` | 前端 API 地址 | http://localhost:8000 |

## License

MIT
