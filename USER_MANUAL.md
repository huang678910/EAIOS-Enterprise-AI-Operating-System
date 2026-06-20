# EAIOS 用户操作手册 v1.0

---

## 目录

1. [快速开始](#1-快速开始)
2. [Chat — 多 Agent 对话](#2-chat--多-agent-对话)
3. [Documents — 文档管理](#3-documents--文档管理)
4. [Knowledge — 知识中心](#4-knowledge--知识中心)
5. [Graph — 知识图谱](#5-graph--知识图谱)
6. [Memories — 企业记忆](#6-memories--企业记忆)
7. [Analytics — 分析中心](#7-analytics--分析中心)
8. [Forecast — 预测引擎](#8-forecast--预测引擎)
9. [Decision Center — 决策中心](#9-decision-center--决策中心)
10. [Reports — 报告管理](#10-reports--报告管理)
11. [Members — 成员管理](#11-members--成员管理)
12. [Settings — 企业画像](#12-settings--企业画像)
13. [附录：Agent 速查表](#附录agent-速查表)

---

## 1. 快速开始

### 1.1 登录

1. 打开浏览器访问 `http://localhost:3000`
2. 首次使用点击 **Register** 注册账号（邮箱 + 用户名 + 密码）
3. 已有账号点击 **Sign In** 登录
4. 登录后自动跳转到 Chat 页面

### 1.2 创建 Workspace

1. 在 Chat 页面顶部输入 Workspace 名称，点击 **Create**
2. 所有数据（企业画像、文档、记忆、指标）均按 Workspace 隔离

### 1.3 侧边栏导航

```
Chat         — AI 对话
Documents    — 文档上传管理
Knowledge    — 语义搜索 + 外部连接器
Graph        — 知识图谱
Memories     — 企业记忆管理
Analytics    — 分析仪表盘
Forecast     — 数据预测
Decision Center — 战略决策
Reports      — 报告下载
Members      — 成员管理
Settings     — 企业画像（子菜单）
```

---

## 2. Chat — 多 Agent 对话

Chat 是系统核心入口。系统根据你的问题**自动路由**到最合适的 AI Agent。

### 2.1 基本对话

输入问题，按 Enter 发送。顶部状态栏显示当前执行的 Agent。

| 输入示例 | 路由 Agent | 为什么 |
|---------|-----------|--------|
| "你好" | chat | 简单对话 |
| "搜索合同文档" | search | 文档检索需求 |
| "分析营收趋势" | analyst | 数据分析需求 |
| "生成季度报告" | writer | 创建报告需求 |

### 2.2 部门 Agent

| 你说 | 自动路由到 | 回复内容 |
|------|----------|---------|
| "分析公司财务状况" | **Finance Agent (CFO)** | 利润率、成本、现金流分析 |
| "是否应该扩招" | **HR Agent (CHRO)** | 人力评估与建议 |
| "企业整体战略如何" | **CEO Agent** | 多维度战略分析 |
| "销售业绩增长点在哪" | **Sales Agent** | 销售趋势与机会 |
| "客户满意度怎样" | **Customer Agent** | 满意度分析与建议 |
| "库存供应链健康吗" | **Procurement Agent** | 库存与供应商分析 |
| "运营效率如何提升" | **Operations Agent** | 流程优化建议 |
| "介绍一下我们公司" | **Profile Agent** | 基于企业画像回复 |

### 2.3 上下文

Agent 会自动读取以下数据作为分析依据：
- 企业画像（Settings 中录入的数据）
- 文档知识库（Documents 上传的文件）
- 企业记忆（Memories 中存储的历史信息）
- 数字孪生指标（Metrics 中录入的业务数据）
- 联网搜索结果

---

## 3. Documents — 文档管理

### 3.1 上传文档

1. 打开 **Documents** 页面
2. 拖拽文件到虚线框，或点击浏览选择
3. 支持格式：PDF / DOCX / PPTX / XLSX / CSV / TXT / Markdown
4. 上传后系统自动：解析文本 → 切分 Chunk → 生成 Embedding → 入库

### 3.2 预览文档

点击文档右侧的眼图标，弹窗显示完整内容。

### 3.3 搜索文档内容

文档入库后，可在 **Chat** 中直接提问文档内容，或在 **Knowledge → Search** 中语义搜索。

### 3.4 删除

点击文档右侧的删除图标（仅 Admin 角色可用）。

---

## 4. Knowledge — 知识中心

### 4.1 语义搜索

1. 打开 **Knowledge → Search** Tab
2. 输入自然语言查询（如 "合同违约条款"）
3. 系统返回匹配的文档片段 + 相似度分数

### 4.2 外部连接器

**GitHub：**
1. Knowledge → **GitHub** Tab
2. 输入 GitHub Token（需要 repo 权限）、Owner、Repo
3. 点击 **Sync** → README + Issues 入库

**Notion：**
1. [notion.so/my-integrations](https://notion.so/my-integrations) 创建 Integration
2. Knowledge → **Notion** Tab → 输入 API Key → Sync

**Jira / Confluence：**
- Token 获取：[id.atlassian.com](https://id.atlassian.com/manage-profile/security/api-tokens)
- Knowledge → 对应 Tab → 输入凭证 → Sync

### 4.3 音频转录

1. Knowledge → **Audio** Tab
2. 选择语言（中文/English/日本語/Auto）
3. 选择音频文件（MP3/WAV/M4A/OGG，≤25MB）
4. 点击 **Transcribe** → 转录文本自动入库

---

## 5. Graph — 知识图谱

### 5.1 查看图谱

打开 **Graph** 页面：
- 顶部统计卡片：节点数、关系数、实体类型数、Neo4j 状态
- 绿色指示灯 = Neo4j 连接正常

### 5.2 同步数据

点击 **Sync from Database** → 将 Settings 中的企业画像数据同步到 Neo4j。

### 5.3 搜索

- 输入"营销部" → 显示该实体及其关联实体
- 输入"谁在营销部主管" → 分词匹配后显示相关实体

---

## 6. Memories — 企业记忆

### 6.1 创建记忆

1. **Memories Tab**：输入标题 + 内容 → 选择类型（长期/事件/语义）→ 重要性（1-10）→ **Save Memory**

### 6.2 三种记忆类型

| 类型 | 用途 | 示例 |
|------|------|------|
| Long-Term | 公司历史、战略规划 | "2026年完成B轮融资" |
| Episodic | 具体事件 | "Q2退出日本市场" |
| Semantic | 知识事实 | "产品A属于玩具事业部" |

### 6.3 事件时间线

**Event Timeline Tab**：记录重要事件 + 影响评估（Positive/Negative/Neutral）。

### 6.4 语义召回

**Semantic Recall Tab**：输入查询 → 系统用向量搜索找相关记忆 → 显示相似度。

### 6.5 自动提取

对话后，系统自动判断对话中是否有值得保存的信息，自动提取为记忆。

---

## 7. Analytics — 分析中心

### 7.1 仪表盘

打开 **Analytics** 页面自动加载：
- **KPI 卡片**：每个指标一张卡（当前值 + 变化% + 趋势箭头）
- **趋势图**：Recharts 折线图
- **Goals 进度条**：颜色自适应方向（↑higher 绿/蓝/黄/红，↓lower 绿/黄/红）
- **AI 分析**：点击 Refresh 生成 AI 分析（Summary + Key Insights + Recommendations）

### 7.2 Proactive Alerts

- 系统定时扫描 KPI 阈值 + 统计异常 + Goal 进度
- 点击 **Check Now** 手动触发检查
- 告警类型：KPI 阈值 / 统计异常 / Goal 风险 / 趋势异常
- 严重度：Critical（红）> Warning（黄）> Info（蓝）
- 点击 ✕ 关闭告警

---

## 8. Forecast — 预测引擎

### 8.1 预测

1. 打开 **Forecast** 页面
2. 选择 Metric（已自动去重）
3. 选择 Method：Moving Average（短期）/ Linear Regression（中期）
4. 点击 **Predict** → 图表渲染：
   - 蓝色实线 = 值（历史 + 预测）
   - 淡蓝虚线 = 置信区间上下界

### 8.2 预测逻辑

- Periods 自动推算（历史数据的一半，最多 6 期）
- 6 条历史数据 → 预测 3 期
- 每次预测自动清除旧预测，避免数据累积

---

## 9. Decision Center — 决策中心

### 9.1 战略问题分析

1. 打开 **Decision Center**
2. 输入战略问题（如"是否应该进入东南亚市场？"）
3. 点击 **Ask** → AI 实时流式输出 5 维度分析：
   - 市场与竞争
   - 财务评估
   - 运营就绪度
   - 客户影响
   - 风险分析
4. 分析结果自动保存到历史

### 9.2 决策历史

- 下方 Decision History 显示所有历史决策
- 点击条目展开/收起完整分析
- 悬停 → 删除图标（Admin 权限）

### 9.3 与 Chat 的区别

| Chat | Decision Center |
|------|----------------|
| 通用对话 | 专用战略分析 |
| 动态路由任意 Agent | 固定 Decision Agent |
| 自由文本输出 | 结构化 5 维度框架 |
| 保存到 Chat 历史 | 保存到 Decisions 表 |

---

## 10. Reports — 报告管理

### 10.1 查看报告

打开 **Reports** → 列表显示 Chat 中 Writer Agent 自动生成的报告。

### 10.2 下载

点击 Download → 下载 Markdown 格式报告。

### 10.3 删除

Admin 权限可删除。

---

## 11. Members — 成员管理

### 11.1 添加成员

1. 打开 **Members**
2. 搜索用户名 → 选择角色（Admin / Member / Viewer）→ 点击添加

### 11.2 角色权限

| 角色 | 查看 | 增删改 | 删除文档/记忆 | 管理成员 |
|------|------|--------|-------------|---------|
| Admin | ✅ | ✅ | ✅ | ✅ |
| Member | ✅ | ✅ | ❌ | ❌ |
| Viewer | ✅ | ❌ | ❌ | ❌ |

---

## 12. Settings — 企业画像

### 12.1 Company（企业基本信息）

名称、行业、描述、成立年份、员工数、总部、目标市场、网站。

点击 **Save Profile** 保存。

### 12.2 Organization（组织架构）

**Departments Tab**：创建部门（含父子层级，如 "市场部 → 美国市场组"）

**Positions Tab**：创建职位（标题 + Level + 所属部门）。悬停 → Edit 修改。

**Employees Tab**：创建员工（姓名 + 邮箱 + 部门 + 职位）。悬停 → Edit 修改。

### 12.3 Business（业务管理）

**Products Tab**：产品名称 + 分类 + 目标市场。可内联编辑。

**Customers Tab**：客户名称 + 市场 + 类型 + 邮箱。可内联编辑。

**Processes Tab**：流程名称 + 描述。可内联编辑。

### 12.4 Goals & KPIs（目标与指标）

**Goals Tab**：OKR/KPI/MBO 三种类型。设置 ↑ higher 或 ↓ lower 方向。进度条自动计算。

**KPIs Tab**：关键绩效指标（名称/类别/当前值/目标值/单位/周期）。可内联编辑全部字段。

### 12.5 Metrics（业务指标）

- **单个录入**：点预设或手动输入 → Record
- **批量导入**：复制 JSON 到 Batch Import 文本框 → Import
- **列表排序**：按分类 → 名称 → 时间排序
- **编辑**：悬停指标 → 蓝色编辑图标 → 修改值/备注 → Save

---

## 附录：Agent 速查表

| Agent | 触发关键词 | 专长 |
|-------|-----------|------|
| **CEO** | 战略/增长/市场/风险 | 战略分析与资源配置 |
| **CFO** | 收入/利润/成本/现金流 | 财务分析 |
| **VP Sales** | 销售/获客/定价 | 销售业绩分析 |
| **CHRO** | 招聘/人力/组织 | 人力资源分析 |
| **COO** | 效率/流程/优化 | 运营效率分析 |
| **CPO** | 库存/供应链/采购 | 供应链分析 |
| **VP Customer** | 满意度/流失/NPS | 客户分析 |
| **Search** | 搜索/找/查 | RAG 文档检索 |
| **Analyst** | 分析/统计/趋势 | 数据分析 |
| **Writer** | 报告/生成/写 | 报告生成 |
| **Profile** | 公司/部门/产品 | 企业信息查询 |
| **Memory** | 记忆/历史/决策 | 历史记忆查询 |
| **Decision** | 战略/是否/进入 | 战略决策分析 |
