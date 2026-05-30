# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

<!-- superpowers-zh:begin (do not edit between these markers) -->
# Superpowers-ZH 中文增强版

本项目已配置全局 superpowers-zh 技能框架（21 个 skills，含 web-design-engineer）。

## 核心规则

1. **收到任务时，先检查是否有匹配的 skill** — 哪怕只有 1% 的可能性也要检查
2. **设计先于编码** — 收到功能需求时，先用 brainstorming skill 做需求分析
3. **测试先于实现** — 写代码前先写测试（TDD）
4. **验证先于完成** — 声称完成前必须运行验证命令

## 如何使用

Skills 现已全局安装在 `~/.claude/skills/`，所有项目均可使用。当任务匹配某个 skill 时，使用 `Skill` 工具加载对应 skill 并严格遵循其流程。绝不要用 Read 工具读取 SKILL.md 文件。

如果你认为哪怕只有 1% 的可能性某个 skill 适用于你正在做的事情，你必须调用该 skill 检查。
<!-- superpowers-zh:end -->

<!-- web-design-engineer:begin (do not edit between these markers) -->
# Web Design Engineer

本项目已配置全局 web-design-engineer 技能（ConardLi/garden-skills）。

## 适用范围

✅ **使用此技能**：可视化前端交付物——网页、落地页、仪表盘、交互原型、HTML 幻灯片、CSS/JS 动画、数据可视化、UI 模型、设计系统
❌ **不使用**：后端 API、CLI 工具、数据处理脚本、纯逻辑开发

## 核心规则

1. **事实优先** — 涉及真实产品/品牌时，先用 WebSearch 验证，不要猜测
2. **设计系统先于编码** — 编写代码前声明色彩、字体、间距、动效系统，等待用户确认
3. **v0 草案先于完整构建** — 先用占位符构建可查看的草稿，用户确认方向后再完善
4. **检查点真正等待** — 说"等待确认"时必须真的停止，不要说完立即继续编码
5. **反 AI 陈词滥调** — 禁用紫粉渐变、Inter/Roboto 展示字体、emoji 图标（除非品牌使用）、伪造数据/Logo墙、SVG 人脸
6. **品牌协议** — 真实 Logo/产品图 > 颜色色值 > 排版规范；绝不用 CSS 矩形替代真实图片
7. **交付前验证** — 逐项核对检查清单，可选运行五维评审（理念一致性、视觉层次、工艺质量、功能性、原创性）

## 如何使用

当用户请求涉及可视化、交互式或前端产物时（即使没有明确说"HTML"或"网页"），使用 `Skill` 工具加载 `web-design-engineer` 并严格遵循其 7 步工作流。绝不自己猜测品牌或产品细节。
<!-- web-design-engineer:end -->

<!-- frontend-design:begin (do not edit between these markers) -->
# Frontend Design

本项目已配置全局 frontend-design 技能（Anthropic 官方）。

## 适用范围

✅ **使用此技能**：构建 Web 组件、页面、应用程序——网站、落地页、仪表盘、React 组件、HTML/CSS 布局、美化 Web UI

## 核心规则

1. **先定美学方向，再写代码** — 明确目的、受众、技术约束，选择一个大胆的美学方向（极简、极繁、复古未来、有机自然、奢华精致、俏皮、杂志编辑、野兽派、装饰艺术、柔和粉彩、工业实用……）
2. **拒绝 AI 模板脸** — 禁用 Inter/Roboto/Arial 字体、白底紫渐变、可预测的卡片布局、千篇一律的设计
3. **字体要有性格** — 选独特、有趣的字体；展示字体 + 正文字体搭配
4. **色彩要有态度** — 主色 + 锐利强调色，胜过均匀分布的调色盘
5. **动效要高光** — 集中精力做一次高影响力的页面载入动效（错开显现），胜过散落的微交互
6. **布局要打破常规** — 不对称、重叠、对角线流动、打破网格、大量留白或受控密度
7. **背景要有层次** — 渐变网格、噪点纹理、几何图案、多层透明度、戏剧阴影、自定义光标
8. **不同项目不同风格** — 每次在明/暗主题、不同字体、不同审美间切换，不要趋同
9. **复杂度匹配审美** — 极繁设计需要精致动画和效果；极简设计需要精准间距和排版细节

## 如何使用

当用户请求构建或美化任何 Web UI 时，使用 `Skill` 工具加载 `frontend-design`。提交一个大胆、独特的美学方向承诺，然后用精致的代码实现。
<!-- frontend-design:end -->
