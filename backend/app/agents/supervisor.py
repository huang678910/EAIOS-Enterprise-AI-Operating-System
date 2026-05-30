"""Supervisor Agent — LangGraph 多 Agent 路由器

MVP 阶段：简化为 search → chat 路由，为后续扩展提供基础架构。
"""

import json
import logging
from typing import TypedDict, Literal

from langgraph.graph import StateGraph, END

logger = logging.getLogger(__name__)


class AgentState(TypedDict):
    messages: list
    context: list
    next_agent: str
    final_response: str


# Agent 路由决策
ROUTE_PROMPT = """Analyze the user's message and decide the next action.

Return ONLY a JSON object with the format:
{"action": "search", "reason": "..."} — if the user is asking about their documents/knowledge
{"action": "chat", "reason": "..."} — if the user is having a general conversation

Examples:
- "What does the Q2 report say about revenue?" → {"action": "search", "reason": "Document-specific question"}
- "Hello, how are you?" → {"action": "chat", "reason": "General conversation"}
- "Summarize the payment system changes" → {"action": "search", "reason": "Requires document context"}
"""


def create_supervisor_graph():
    """构建 Supervisor Agent 状态图（MVP 简化版）"""

    workflow = StateGraph(AgentState)

    def supervisor_node(state: AgentState) -> dict:
        """路由决策节点"""
        messages = state.get("messages", [])
        if not messages:
            return {"next_agent": "chat"}

        last_message = messages[-1]
        content = last_message.get("content", "") if isinstance(last_message, dict) else str(last_message)

        # MVP 版简化路由：包含文档关键词 → search，否则 chat
        search_keywords = ["文档", "报告", "数据", "分析", "改动", "变更", "总结",
                          "document", "report", "data", "analysis", "change", "summary",
                          "支付", "系统", "架构", "代码", "设计", "需求"]

        is_search = any(kw in content.lower() for kw in search_keywords)

        return {"next_agent": "search" if is_search else "chat"}

    def search_node(state: AgentState) -> dict:
        """搜索节点 — 标记需要 RAG 检索"""
        logger.info("Supervisor: Routing to Search Agent")
        context = state.get("context", [])
        context.append({"agent": "search", "status": "completed"})
        return {"context": context, "next_agent": "chat"}

    def chat_node(state: AgentState) -> dict:
        """对话节点 — 标记进入 LLM 对话"""
        logger.info("Supervisor: Routing to Chat Agent")
        context = state.get("context", [])
        context.append({"agent": "chat", "status": "generating"})
        return {"context": context, "next_agent": "end"}

    def router(state: AgentState) -> Literal["search", "chat"]:
        """根据 supervisor 决策路由"""
        next_agent = state.get("next_agent", "chat")
        return next_agent  # type: ignore

    def chat_router(state: AgentState) -> Literal["end"]:
        return "end"

    # 添加节点
    workflow.add_node("supervisor", supervisor_node)
    workflow.add_node("search", search_node)
    workflow.add_node("chat", chat_node)

    # 设置边
    workflow.set_entry_point("supervisor")
    workflow.add_conditional_edges("supervisor", router, {"search": "search", "chat": "chat"})
    workflow.add_edge("search", "chat")
    workflow.add_edge("chat", END)

    return workflow.compile()


# 全局图实例
supervisor_graph = create_supervisor_graph()
