"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, MessageSquare, Trash2 } from "lucide-react";
import { useAuthStore, useChatStore, useWorkspaceStore } from "@/lib/stores";
import {
  listWorkspaces,
  createWorkspace,
  listChatSessions,
  createChatSession,
  deleteChatSession,
  listMessages,
  sendChatMessage,
} from "@/lib/api-client";
import type { Workspace, ChatSession, Source } from "@/types";
import ChatMessages from "@/components/chat/ChatMessages";
import ChatInput from "@/components/chat/ChatInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ChatPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);

  const {
    messages, isStreaming, addMessage, appendToLastAssistant,
    setStreaming, activeSessionId, setActiveSession, clearMessages,
  } = useChatStore();

  const { activeWorkspaceId, setActiveWorkspace } = useWorkspaceStore();

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [newWsName, setNewWsName] = useState("");
  const [showNewWs, setShowNewWs] = useState(false);

  // Auth guard
  useEffect(() => {
    if (!token) router.push("/login");
  }, [token, router]);

  // Load workspaces
  useEffect(() => {
    if (!token) return;
    listWorkspaces()
      .then((d) => {
        setWorkspaces(d.workspaces);
        if (!activeWorkspaceId && d.workspaces.length > 0) {
          setActiveWorkspace(d.workspaces[0].id);
        }
      })
      .catch(() => {});
  }, [token]);

  // Load sessions when workspace changes — auto-create if none
  useEffect(() => {
    if (!activeWorkspaceId || !token) return;
    listChatSessions(activeWorkspaceId)
      .then(async (d) => {
        setSessions(d.sessions);
        if (d.sessions.length > 0) {
          setActiveSession(d.sessions[0].id);
        } else {
          // Auto-create a session so the chat input works immediately
          try {
            const s = await createChatSession(activeWorkspaceId);
            setSessions([s]);
            setActiveSession(s.id);
          } catch (err) {
            console.error("Failed to auto-create session:", err);
          }
        }
      })
      .catch(() => {});
  }, [activeWorkspaceId, token]);

  // Load messages when session changes
  useEffect(() => {
    if (!activeWorkspaceId || !activeSessionId || !token) return;
    clearMessages();
    listMessages(activeWorkspaceId, activeSessionId)
      .then((msgs) => {
        msgs.forEach((m: { role: string; content: string; sources?: unknown[] }) => {
          addMessage({ role: m.role as "user" | "assistant", content: m.content, sources: m.sources as Source[] | undefined });
        });
      })
      .catch(() => {});
  }, [activeSessionId]);

  async function handleCreateWorkspace() {
    if (!newWsName.trim()) return;
    try {
      const ws = await createWorkspace(newWsName);
      setWorkspaces((prev) => [ws, ...prev]);
      setActiveWorkspace(ws.id);
      setNewWsName("");
      setShowNewWs(false);
    } catch (err) {
      console.error("Failed to create workspace:", err);
    }
  }

  async function handleNewSession() {
    if (!activeWorkspaceId) return;
    try {
      const s = await createChatSession(activeWorkspaceId);
      setSessions((prev) => [s, ...prev]);
      setActiveSession(s.id);
      clearMessages();
    } catch (err) {
      console.error("Failed to create session:", err);
    }
  }

  async function handleDeleteSession(sid: string) {
    if (!activeWorkspaceId) return;
    await deleteChatSession(activeWorkspaceId, sid);
    setSessions((prev) => prev.filter((s) => s.id !== sid));
    if (activeSessionId === sid) {
      setActiveSession(null);
    }
  }

  const handleSend = useCallback(async (message: string) => {
    if (!activeWorkspaceId || !activeSessionId || isStreaming) return;

    addMessage({ role: "user", content: message });
    addMessage({ role: "assistant", content: "" });
    setStreaming(true);

    try {
      const result = await sendChatMessage(activeWorkspaceId, activeSessionId, message);
      // Replace the empty assistant message with the full reply
      const msgs = useChatStore.getState().messages;
      const lastIdx = msgs.length - 1;
      if (lastIdx >= 0 && msgs[lastIdx].role === "assistant") {
        msgs[lastIdx] = {
          role: "assistant",
          content: result.reply,
          sources: result.sources as { filename: string; similarity: number }[] | undefined,
        };
        useChatStore.setState({ messages: [...msgs] });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      appendToLastAssistant(`\n\n❌ ${msg}`);
    } finally {
      setStreaming(false);
      if (activeWorkspaceId) {
        listChatSessions(activeWorkspaceId).then((d) => setSessions(d.sessions)).catch(() => {});
      }
    }
  }, [activeWorkspaceId, activeSessionId, isStreaming, addMessage, appendToLastAssistant, setStreaming]);

  const currentWs = workspaces.find((w) => w.id === activeWorkspaceId);

  return (
    <div className="flex h-full">
      {/* Sessions Sidebar */}
      <div className="w-64 border-r border-gray-200 bg-white flex flex-col">
        {/* Workspace Selector */}
        <div className="p-4 border-b border-gray-100">
          <label className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Workspace</label>
          <select
            value={activeWorkspaceId || ""}
            onChange={(e) => {
              setActiveWorkspace(e.target.value);
              setActiveSession(null);
              clearMessages();
            }}
            className="mt-1 w-full text-sm rounded-lg border border-gray-200 px-3 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {workspaces.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
          {showNewWs ? (
            <div className="flex gap-1 mt-2">
              <Input
                value={newWsName}
                onChange={(e) => setNewWsName(e.target.value)}
                placeholder="Workspace name"
                className="h-8 text-xs"
                onKeyDown={(e) => e.key === "Enter" && handleCreateWorkspace()}
              />
              <Button size="sm" onClick={handleCreateWorkspace} className="h-8 text-xs">Add</Button>
            </div>
          ) : (
            <button
              onClick={() => setShowNewWs(true)}
              className="text-xs text-blue-500 hover:text-blue-700 mt-2"
            >
              + New Workspace
            </button>
          )}
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex items-center justify-between px-4 py-2">
            <span className="text-xs text-gray-400 font-medium">Chats</span>
            <button onClick={handleNewSession} className="p-1 hover:bg-gray-100 rounded" title="New Chat">
              <Plus size={16} className="text-gray-400" />
            </button>
          </div>
          {sessions.map((s) => (
            <div
              key={s.id}
              onClick={() => { setActiveSession(s.id); clearMessages(); }}
              className={`flex items-center justify-between px-4 py-2.5 mx-2 rounded-lg cursor-pointer text-sm group transition-colors ${
                activeSessionId === s.id
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <MessageSquare size={14} className="flex-shrink-0" />
                <span className="truncate">{s.title}</span>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleDeleteSession(s.id); }}
                className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-50 rounded transition-all"
              >
                <Trash2 size={12} className="text-red-400" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-white flex items-center gap-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-800">
              {currentWs?.name || "Chat"}
            </h2>
            <p className="text-xs text-gray-400">
              {currentWs ? `${currentWs.description || "No description"}` : "Select a workspace"}
            </p>
          </div>
        </div>

        {/* Messages */}
        <ChatMessages messages={messages} isStreaming={isStreaming} />

        {/* Input */}
        <ChatInput onSend={handleSend} disabled={isStreaming || !activeSessionId} />
      </div>
    </div>
  );
}
