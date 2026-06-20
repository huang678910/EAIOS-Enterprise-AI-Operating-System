"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore, useWorkspaceStore } from "@/lib/stores";
import WorkspaceSelector from "@/components/layout/WorkspaceSelector";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, Send, Loader2, History, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import api from "@/lib/api";

interface DecisionRecord {
  id: string;
  question: string;
  analysis: string | null;
  status: string;
  created_at: string | null;
}

export default function DecisionCenterPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const workspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);

  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [error, setError] = useState("");
  const [history, setHistory] = useState<DecisionRecord[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => { if (!token) router.push("/login"); }, [token, router]);

  // Load decision history from API
  useEffect(() => {
    if (!workspaceId || !token) return;
    api.get(`/api/v1/workspaces/${workspaceId}/chat/decision/history`)
      .then((res) => setHistory(res.data || []))
      .catch(() => {});
  }, [workspaceId, token]);

  async function handleDelete(decisionId: string) {
    if (!workspaceId || !confirm("Delete this decision? (Admin only)")) return;
    try {
      await api.delete(`/api/v1/workspaces/${workspaceId}/chat/decision/${decisionId}`);
      setHistory((prev) => prev.filter((d) => d.id !== decisionId));
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      alert("Delete failed: " + (msg || "Admin role required"));
    }
  }

  async function handleSubmit() {
    if (!workspaceId || !question.trim()) return;
    setLoading(true); setError(""); setStreaming(""); setStatusMsg("Planning analysis pipeline...");

    try {
      const resp = await fetch(
        `/api/v1/workspaces/${workspaceId}/chat/decision/analyze`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ question: question.trim() }),
        }
      );

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        setError(errData.detail || `Server error: ${resp.status}`);
        setLoading(false);
        return;
      }

      const reader = resp.body?.getReader();
      if (!reader) { setError("No response stream"); setLoading(false); return; }

      const decoder = new TextDecoder();
      let fullText = "";
      let buffer = "";
      let currentEvent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (currentEvent === "status") {
              setStatusMsg(data);
            } else if (currentEvent === "error") {
              setError(data);
            } else if (currentEvent === "done") {
              // keep current streaming text
            } else {
              // token — append to full text
              fullText += data;
              setStreaming(fullText);
            }
            currentEvent = "";
          }
        }
      }

      // Reload history after completion
      if (fullText) {
        api.get(`/api/v1/workspaces/${workspaceId}/chat/decision/history`)
          .then((res) => setHistory(res.data || []))
          .catch(() => {});
      }
      setQuestion("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Connection error");
    } finally {
      setLoading(false);
      setStatusMsg("");
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <WorkspaceSelector />
      <div>
        <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
          <Brain size={22} className="text-purple-500" /> Strategic Decision Center
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Enterprise brain — submit a strategic question. AI synthesizes all enterprise data (profile, memory, metrics, agents) for multi-dimensional analysis. Independent from Chat.
        </p>
      </div>

      {/* Input */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-2">
            <textarea
              value={question}
              onChange={(e) => { setQuestion(e.target.value); setError(""); }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
              }}
              placeholder='Ask a strategic question... e.g. "我们是否应该进入东南亚市场？" or "Should we reduce our US market exposure?"'
              rows={2}
              className="flex-1 rounded-lg border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              disabled={loading}
            />
            <Button onClick={handleSubmit} disabled={loading || !question.trim()} className="self-end">
              {loading ? <><Loader2 size={14} className="mr-1 animate-spin" /> Analyzing...</> : <><Send size={14} className="mr-1" /> Ask</>}
            </Button>
          </div>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </CardContent>
      </Card>

      {/* Streaming Analysis */}
      {loading && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Loader2 size={18} className="animate-spin text-purple-500" />
              <span className="text-sm text-gray-600">{statusMsg || "Analyzing..."}</span>
            </div>
            {streaming ? (
              <div className="prose prose-sm max-w-none text-gray-700">
                <ReactMarkdown>{streaming}</ReactMarkdown>
              </div>
            ) : (
              <div className="space-y-2 animate-pulse">
                <div className="h-3 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-full" />
                <div className="h-3 bg-gray-100 rounded w-5/6" />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Decision History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <History size={16} className="text-gray-500" /> Decision History
            <span className="text-xs text-gray-400 font-normal">({history.length} records)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No decisions yet. Submit your first strategic question above.</p>
          ) : (
            <div className="space-y-2">
              {history.map((d) => (
                <div key={d.id} className="border border-gray-100 rounded-lg overflow-hidden group">
                  <div className="flex items-center w-full">
                    <button
                      onClick={() => setExpandedId(expandedId === d.id ? null : d.id)}
                      className="flex-1 flex items-center justify-between p-3 hover:bg-gray-50 text-left"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          d.status === "completed" ? "bg-green-500" :
                          d.status === "failed" ? "bg-red-500" : "bg-amber-500"
                        }`} />
                        <span className="text-sm font-medium text-gray-700 truncate">{d.question}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-gray-400">
                          {d.created_at ? new Date(d.created_at).toLocaleDateString() : ""}
                        </span>
                        {expandedId === d.id ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                      </div>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(d.id); }}
                      className="flex-shrink-0 p-2 mr-1 opacity-0 group-hover:opacity-100 hover:bg-red-50 rounded transition-all"
                      title="Delete decision (Admin only)">
                      <Trash2 size={14} className="text-red-400" />
                    </button>
                  </div>
                  {expandedId === d.id && d.analysis && (
                    <div className="p-4 border-t border-gray-100 bg-gray-50 prose prose-sm max-w-none text-gray-700">
                      <ReactMarkdown>{d.analysis}</ReactMarkdown>
                    </div>
                  )}
                  {expandedId === d.id && !d.analysis && d.status === "failed" && (
                    <div className="p-4 border-t border-gray-100 bg-red-50 text-sm text-red-600">
                      Analysis failed. Please try again.
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
