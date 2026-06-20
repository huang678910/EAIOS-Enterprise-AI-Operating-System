<!-- AI-Multi-Agent-Enterprise-Workspace/README.md -->
<!-- ℹ️ 项目根目录配置文件 -->

# EAIOS — Enterprise AI Operating System

企业级 AI 操作系统 · 16 Agent Multi-Agent 协作 · 10 层架构 · RAG + 知识图谱 + 数字孪生

---

## 架构总览

```
┌──────────────────────────────────────────────────────────────────┐
│ L10  战略决策中心  │ CSO Agent · 5 维度框架 · SSE 流式分析          │
│ L9   主动式 AI    │ 三层检测 · Celery Beat · WebSocket 实时推送     │
│ L8   预测引擎     │ 加权移动平均 + 线性回归 · 自动去重               │
│ L7   分析中心     │ 聚合仪表盘 · AI 分析 · 业务优先级排序            │
│ L6   部门 Agent   │ CEO/CFO/VP Sales/CHRO/COO/CPO/VP Customer ×7  │
│ L5   数字孪生     │ 时序业务指标 · Agent 上下文自动注入              │
│ L4   知识图谱     │ Neo4j · 7 实体 × 8 关系 · 分词搜索               │
│ L3   企业记忆     │ 长期/事件/语义 · 自动提取 · 混合加权召回          │
│ L2   知识中心     │ RAG 流水线 · 10 格式文档解析 · 6 连接器 + 音频    │
│ L1   企业画像     │ 9 实体 · 37 REST 端点 · 完整组织架构             │
└──────────────────────────────────────────────────────────────────┘
```

## 技术栈

| 层 | 技术 |
|----|------|
| Agent | LangGraph StateGraph + LangChain + Supervisor Pattern |
| LLM | DeepSeek API · BGE Embedding（BAAI/bge-small-zh-v1.5, 512dim） |
| 后端 | FastAPI · Pydantic v2 · SQLAlchemy 2.0 Async · Celery + Beat |
| 前端 | Next.js 15 · React 19 · TypeScript · TailwindCSS · shadcn/ui · Recharts · Zustand |
| 数据库 | PostgreSQL + pgvector · Neo4j 5 Community |
| 缓存/队列 | Redis（缓存 + Celery Broker + WebSocket Pub/Sub） |
| 部署 | Docker Compose（6 服务）+ Nginx 反向代理 |

## 快速启动

### 前提条件

- Docker Desktop 已安装并运行
- DeepSeek API Key（注册即得）

### 启动

```bash
# 1. 设置 API Key（二选一）
export DEEPSEEK_API_KEY=sk-your-key-here
# 或在 docker-compose.yml 中设置 DEEPSEEK_API_KEY 环境变量

# 2. 一键启动全部服务
docker-compose up -d --build

# 3. 等待健康检查通过（约 15 秒）
docker ps --format "table {{.Names}}\t{{.Status}}"
```

### 访问

| 入口 | 地址 |
|------|------|
| Web 界面 | http://localhost:8080 |
| API 文档（Swagger） | http://localhost:8000/docs |
| Neo4j 控制台 | http://localhost:7474 |
| 直接访问前端 | http://localhost:3000 |

### 服务拓扑

```
                    Nginx (:8080)
                   /            \
          / → frontend:3000    /api/* → backend:8000
                                         │
              ┌──────────────────────────┼──────────────────────┐
              │                          │                      │
        Postgres/pgvector (:5432)   Redis (:6379)      Neo4j 5 (:7474)
```

## 项目结构

```
eaios/
├── frontend/                         # Next.js 15 前端
│   └── src/app/                      # 17 个页面（App Router）
├── backend/                          # FastAPI 后端
│   ├── app/
│   │   ├── agents/                   # 16 个 Agent + Supervisor
│   │   │   ├── supervisor.py         # Supervisor 路由编排
│   │   │   ├── tools/                # 10 个 LangChain Tool
│   │   │   └── *_agent.py            # 各角色 Agent 实现
│   │   ├── api/v1/                   # 20 个 API 路由模块
│   │   ├── models/                   # 14 个数据模型（22 表）
│   │   ├── services/                 # 22 个业务服务
│   │   └── tasks/                    # Celery 异步任务
│   ├── alembic/                      # 数据库迁移（12 个版本）
│   └── tests/                        # 自动化测试
├── nginx/nginx.conf                  # Nginx 反向代理配置
├── docker-compose.yml                # 6 服务编排
└── .github/workflows/ci.yml         # CI/CD
```

## 功能页面

| 页面 | 路径 | 功能 |
|------|------|------|
| Chat | `/chat` | 多 Agent 对话 · WebSocket 流式 · 16 Agent 智能路由 |
| Documents | `/documents` | 上传/解析/预览（PDF/DOCX/PPTX/XLSX/CSV/TXT/MD + 音频） |
| Knowledge | `/knowledge` | RAG 语义搜索 · 6 连接器（GitHub/Notion/Jira/Confluence/Slack/WeCom） |
| Graph | `/graph` | Neo4j 知识图谱搜索/统计/同步 |
| Memories | `/memories` | 3 种记忆类型 · Event Timeline · 语义召回 |
| Analytics | `/analytics` | KPI 仪表盘 · 趋势图 · AI 分析 · Proactive Alerts 面板 |
| Forecast | `/forecast` | 预测引擎（移动平均/线性回归）· 置信区间 |
| Decision Center | `/decision-center` | 战略决策 SSE 流式分析 · 历史回溯 |
| Reports | `/reports` | AI 报告生成与下载 |
| Members | `/members` | 成员管理（Admin/Member/Viewer 三级 RBAC） |
| Settings · Company | `/settings/company` | 企业基本信息 |
| Settings · Org | `/settings/org` | 组织架构（部门 · 职位 · 员工）树形展示 |
| Settings · Business | `/settings/business` | 产品 · 客户 · 业务流程 |
| Settings · Goals | `/settings/goals` | Goals & KPIs（支持 higher/lower 双向） |
| Settings · Metrics | `/settings/metrics` | 业务指标录入（单条/批量 JSON） |

## Multi-Agent 系统

### 16 个 Agent

**通用 Agent（9 个）：**

| Agent | 职责 |
|-------|------|
| chat | 通用对话、问候、解释 |
| search | RAG 检索 — 搜索上传文档和知识库 |
| research | 深度多步研究（Web + Knowledge） |
| analyst | 数据分析、统计、数值洞察 |
| writer | 报告/文档生成 |
| sql | 自然语言转 SQL 查询数据库 |
| profile | 企业画像查询（公司/部门/员工/产品） |
| memory | 企业记忆查询与提取 |
| decision | 战略决策分析（CSO 角色，5 维度框架） |

**部门 Agent（7 个）：**

| Agent | 职责 |
|-------|------|
| CEO | 战略分析、业务健康、风险评估 |
| Finance | 收入、利润、成本、预算、ROI |
| VP Sales | 销售业绩、Pipeline、客户获取 |
| CHRO | 招聘、组织架构、Headcount |
| COO | 流程优化、效率分析、质量管理 |
| CPO | 产品策略、路线图、竞争力 |
| VP Customer | 客户满意度、Churn、NPS |

### Supervisor 路由

```
用户输入 → LLM 分析意图 → JSON 路由决策 → LangGraph 流水线调度
                                    ↓（失败时）
                            Keyword Fallback 降级
```

## 核心数据流

```
数据录入（L1 企业画像 + L5 Metrics）
        │
        ▼
  Agent 对话时 6 层上下文自动注入：
  RAG 检索 → 记忆召回 → 企业画像 → 文档列表 → 数字孪生 → Web Search
        │
        ▼
  Agent 执行 → 流式返回（WebSocket/SSE）→ 前端渲染
        │
        ▼
  对话后处理：自动记忆提取 + Agent Trace 记录
```

## API

完整 Swagger 文档：http://localhost:8000/docs

```
/api/v1/auth         认证（login/register/refresh）
/api/v1/workspaces   工作空间 CRUD
/api/v1/workspaces/{id}/company      企业画像（9 实体 · 37 端点）
/api/v1/workspaces/{id}/documents    文档上传/解析/预览/删除
/api/v1/workspaces/{id}/knowledge    RAG 搜索/连接器/音频转录
/api/v1/workspaces/{id}/memories     记忆查询/召回/事件
/api/v1/workspaces/{id}/graph        Neo4j 图谱搜索/统计/同步
/api/v1/workspaces/{id}/metrics      指标录入/快照/趋势/摘要（6 端点）
/api/v1/workspaces/{id}/analytics    仪表盘数据/AI 分析/告警检测
/api/v1/workspaces/{id}/forecast     预测/趋势（移动平均+线性回归）
/api/v1/workspaces/{id}/alerts       主动告警（检测/解除/历史）
/api/v1/workspaces/{id}/chat         对话（Session/发送/流式/决策分析）
/api/v1/workspaces/{id}/members      成员管理（添加/删除/角色）
/api/v1/workspaces/{id}/reports      报告生成/下载
```

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `DEEPSEEK_API_KEY` | DeepSeek API 密钥 | **必填** |
| `DEEPSEEK_BASE_URL` | LLM API 地址 | `https://api.deepseek.com/v1` |
| `LLM_MODEL` | 模型名 | `deepseek-chat` |
| `EMBEDDING_MODEL` | Embedding 模型 | `BAAI/bge-small-zh-v1.5` |
| `TAVILY_API_KEY` | Web Search API 密钥 | 可选 |
| `SECRET_KEY` | JWT 签名密钥 | `change-me-to-a-random-string` |
| `NEO4J_PASSWORD` | Neo4j 密码 | `password` |
| `DB_USER/PASSWORD` | PostgreSQL 凭据 | `postgres/postgres` |

## 测试

```bash
# 基础测试（认证 + CRUD + 权限）
cd backend && pytest tests/test_requirements.py -v

# 流程测试（单独运行）
pytest tests/api/test_flows.py::test_company_crud_flow -v
pytest tests/api/test_flows.py::test_metrics_and_analytics_flow -v
pytest tests/api/test_flows.py::test_alerts_flow -v
```

## License

MIT
