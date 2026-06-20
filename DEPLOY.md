# EAIOS 容器部署指南

---

## 架构

```
                     ┌─────────────────┐
                     │   Nginx :80     │  ← 统一入口
                     └───────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
     ┌────────────┐  ┌────────────┐  ┌────────────┐
     │ Frontend   │  │  Backend   │  │    API     │
     │   :3000    │  │   :8000    │  │   /api/*   │
     └────────────┘  └─────┬──────┘  └────────────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
    ┌──────────┐   ┌──────────┐    ┌──────────┐
    │PostgreSQL│   │  Redis   │    │  Neo4j   │
    │  :5432   │   │  :6379   │    │:7474/7687│
    └──────────┘   └──────────┘    └──────────┘
```

---

## 前置条件

| 软件 | 最低版本 |
|------|---------|
| Docker | 24.0+ |
| Docker Compose | v2.20+ |
| 可用内存 | ≥ 8GB（6 个服务 + Whisper + BGE 模型） |
| 可用磁盘 | ≥ 20GB（含模型缓存） |

---

## Step 1：配置环境变量

在项目根目录创建 `.env` 文件：

```env
# ─── 必填 ──────────────────────────────────
DEEPSEEK_API_KEY=sk-your-api-key-here     # LLM API 密钥

# ─── 推荐修改 ──────────────────────────────
SECRET_KEY=your-random-secret-string      # JWT 签名密钥，生成方式见下文
NEO4J_PASSWORD=your-neo4j-password        # Neo4j 数据库密码
DB_PASSWORD=your-db-password              # PostgreSQL 密码

# ─── 可选（Web Search）─────────────────────
TAVILY_API_KEY=tvly-your-key             # 联网搜索（不填则禁用）

# ─── 默认即可（无需修改）────────────────────
DB_USER=postgres
DB_NAME=ai_workspace
LLM_MODEL=deepseek-chat
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
EMBEDDING_MODEL=BAAI/bge-small-zh-v1.5
DEBUG=false
```

生成 `SECRET_KEY`：

```bash
# Linux/Mac
openssl rand -base64 32

# Windows PowerShell
[Convert]::ToBase64String((1..32 | % {Get-Random -Max 256}))
```

---

## Step 2：构建与启动

### 首次启动（构建镜像 + 启动所有服务）

```bash
# 构建并后台启动
docker-compose up -d --build

# 查看启动日志
docker-compose logs -f
```

启动顺序：PostgreSQL → Redis → Neo4j（健康检查通过后）→ Backend（自动执行数据库迁移）→ Frontend → Nginx

### 等待所有服务就绪（约 2-5 分钟，取决于模型下载速度）

```bash
# 检查服务状态（所有服务应为 healthy 或 running）
docker-compose ps
```

期望输出：

```
NAME                  STATUS
workspace-db          healthy
workspace-redis       healthy
workspace-neo4j       healthy
workspace-backend     running
workspace-frontend    running
workspace-nginx       running
```

---

## Step 3：验证

```bash
# 后端健康检查
curl http://localhost:8000/health

# 通过 Nginx 访问前端
curl -I http://localhost

# Neo4j 浏览器
# 浏览器打开 http://localhost:7474
# 用户名: neo4j  密码: 你设置的 NEO4J_PASSWORD
```

---

## Step 4：初始化（首次使用）

1. 浏览器打开 `http://localhost`（Nginx，推荐）或 `http://localhost:3000`（直连前端）
2. 注册账号（Register → 填写邮箱/用户名/密码）
3. 登录后在 Chat 页面创建 Workspace
4. 进入 Settings → Company 填写企业基本信息

---

## 常用命令

```bash
# 查看所有容器状态
docker-compose ps

# 查看特定服务日志
docker-compose logs -f backend
docker-compose logs -f frontend

# 重启单个服务
docker-compose restart backend

# 停止所有服务
docker-compose down

# 停止并清除所有数据（⚠️ 不可逆）
docker-compose down -v

# 更新代码后重新构建
git pull
docker-compose up -d --build

# 手动执行数据库迁移
docker-compose exec backend alembic upgrade head

# 进入容器调试
docker-compose exec backend bash
docker-compose exec postgres psql -U postgres -d ai_workspace
```

---

## 环境变量完整列表

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `DEEPSEEK_API_KEY` | **必填** — LLM API 密钥 | — |
| `DEEPSEEK_BASE_URL` | LLM API 地址 | `https://api.deepseek.com/v1` |
| `LLM_MODEL` | 使用的模型 | `deepseek-chat` |
| `TAVILY_API_KEY` | 联网搜索（可选） | — |
| `SECRET_KEY` | JWT 签名密钥 | `change-me-to...` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token 有效期 | `60` |
| `DB_USER` | PostgreSQL 用户 | `postgres` |
| `DB_PASSWORD` | PostgreSQL 密码 | `postgres` |
| `DB_NAME` | 数据库名 | `ai_workspace` |
| `REDIS_HOST` | Redis 地址 | `redis` |
| `NEO4J_PASSWORD` | Neo4j 密码 | `password` |
| `EMBEDDING_MODEL` | 嵌入模型 | `BAAI/bge-small-zh-v1.5` |
| `EMBEDDING_DIM` | 嵌入维度 | `512` |
| `NEXT_PUBLIC_API_URL` | 前端 API 地址 | `http://localhost:8000` |
| `DEBUG` | 调试模式 | `false` |

---

## 服务端口映射

| 服务 | 容器内端口 | 宿主机端口 | 访问 |
|------|----------|-----------|------|
| Nginx | 80 | 80 | `http://localhost` |
| Frontend | 3000 | 3000 | `http://localhost:3000` |
| Backend | 8000 | 8000 | `http://localhost:8000/docs` |
| PostgreSQL | 5432 | 5432 | `psql -h localhost -U postgres` |
| Redis | 6379 | 6379 | — |
| Neo4j HTTP | 7474 | 7474 | `http://localhost:7474` |
| Neo4j Bolt | 7687 | 7687 | — |

---

## 生产环境建议

| 项目 | 当前 | 建议 |
|------|------|------|
| HTTPS | 无 | 使用 Let's Encrypt + certbot |
| Nginx | 基础反向代理 | 添加 rate limiting + 安全头 |
| 数据库密码 | 默认 postgres | 使用强密码 + 限制外网访问 |
| 日志 | stdout | 接入 ELK/Loki |
| 备份 | 无 | pg_dump + Neo4j dump 定时任务 |
| CI/CD | GitHub Actions | 添加自动构建 + 推送镜像 |

---

## 故障排查

### 后端启动失败

```bash
# 查看完整日志
docker-compose logs backend | tail -50

# 常见原因：
# - DEEPSEEK_API_KEY 未设置或无效
# - 数据库连接失败（检查 postgres 是否 healthy）
# - 嵌入模型下载失败（网络问题，可手动下载）
```

### Whisper 模型下载失败

```bash
# 容器内手动下载
docker-compose exec backend python -c "import whisper; whisper.load_model('base')"
```

### Neo4j 内存不足

```bash
# 在 docker-compose.yml 中调整
neo4j:
  environment:
    NEO4J_server_memory_heap_max__size: 1024m  # 增大到 1GB
```

### 前端访问后端报 Network Error

检查 `NEXT_PUBLIC_API_URL` 是否设置为后端可达地址：
- Nginx 模式：`NEXT_PUBLIC_API_URL=http://localhost`（走 Nginx 代理）
- 直连模式：`NEXT_PUBLIC_API_URL=http://localhost:8000`
