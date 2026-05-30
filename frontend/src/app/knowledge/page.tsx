"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore, useWorkspaceStore } from "@/lib/stores";
import { listWorkspaces, listDocuments, searchKnowledge } from "@/lib/api-client";
import type { Workspace, Document, SearchResult } from "@/types";
import KnowledgeStats from "@/components/knowledge/KnowledgeStats";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Search, FileText } from "lucide-react";

export default function KnowledgePage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const { activeWorkspaceId, setActiveWorkspace } = useWorkspaceStore();

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!token) { router.push("/login"); return; }
    listWorkspaces().then((d) => {
      setWorkspaces(d.workspaces);
      if (!activeWorkspaceId && d.workspaces.length > 0) {
        setActiveWorkspace(d.workspaces[0].id);
      }
    }).catch(() => {});
  }, [token]);

  useEffect(() => {
    if (!activeWorkspaceId) return;
    listDocuments(activeWorkspaceId).then((d) => setDocuments(d.documents)).catch(() => {});
  }, [activeWorkspaceId]);

  async function handleSearch() {
    if (!activeWorkspaceId || !searchQuery.trim()) return;
    setSearching(true);
    try {
      const result = await searchKnowledge(activeWorkspaceId, searchQuery, 5);
      setSearchResults(result.results);
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setSearching(false);
    }
  }

  const totalChunks = documents.reduce((sum, d) => sum + d.chunk_count, 0);
  const currentWs = workspaces.find((w) => w.id === activeWorkspaceId);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Knowledge Base</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage and search your enterprise knowledge in{" "}
          <span className="font-medium text-gray-700">{currentWs?.name || "..."}</span>
        </p>
      </div>

      {/* Workspace Selector */}
      <div className="mb-6">
        <select
          value={activeWorkspaceId || ""}
          onChange={(e) => setActiveWorkspace(e.target.value)}
          className="text-sm rounded-lg border border-gray-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {workspaces.map((w) => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>
      </div>

      {/* Stats */}
      <div className="mb-8">
        <KnowledgeStats documentCount={documents.length} totalChunks={totalChunks} />
      </div>

      {/* Search Test */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Semantic Search Test</h3>
          <div className="flex gap-2">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Enter a query to test RAG search..."
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={searching}>
              <Search size={16} className="mr-1" />
              {searching ? "Searching..." : "Search"}
            </Button>
          </div>

          {/* Results */}
          {searchResults && (
            <div className="mt-4 space-y-3">
              <p className="text-xs text-gray-400">
                {searchResults.length} result{searchResults.length !== 1 ? "s" : ""} found
              </p>
              {searchResults.map((r, i) => (
                <div key={i} className="p-4 rounded-lg border border-gray-100 bg-gray-50">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText size={14} className="text-gray-400" />
                    <span className="text-xs font-medium text-gray-600">{r.filename}</span>
                    <span className="text-[10px] text-gray-400">
                      similarity: {(r.similarity * 100).toFixed(1)}%
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed line-clamp-4">{r.content}</p>
                </div>
              ))}
              {searchResults.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">No results found.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
