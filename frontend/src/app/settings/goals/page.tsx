"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore, useWorkspaceStore } from "@/lib/stores";
import {
  listGoals, createGoal, updateGoal, deleteGoal,
  listKPIs, createKPI, updateKPI, deleteKPI,
  type GoalData, type KPIData,
} from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, ArrowUp, ArrowDown, Edit3, X } from "lucide-react";
import WorkspaceSelector from "@/components/layout/WorkspaceSelector";

export default function GoalsSettingsPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const workspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const [tab, setTab] = useState<"goals" | "kpis">("goals");
  const [error, setError] = useState("");

  const [goals, setGoals] = useState<GoalData[]>([]);
  const [newGoal, setNewGoal] = useState({ title: "", type: "KPI", target_value: "", current_value: "", direction: "higher", description: "", start_date: "", end_date: "" });
  const [editGoal, setEditGoal] = useState<Record<string, { title: string; type: string; target_value: string; current_value: string; direction: string; description: string; status: string }>>({});
  const [savingGoal, setSavingGoal] = useState(false);

  const [kpis, setKPIs] = useState<KPIData[]>([]);
  const [newKPI, setNewKPI] = useState({ name: "", category: "", current_value: "", target_value: "", unit: "", period: "" });
  const [savingKPI, setSavingKPI] = useState(false);
  const [editKPI, setEditKPI] = useState<Record<string, { name: string; category: string; current_value: string; target_value: string; unit: string; period: string }>>({});

  useEffect(() => { if (!token) router.push("/login"); }, [token, router]);

  useEffect(() => { setGoals([]); setKPIs([]); setError(""); }, [workspaceId]);

  const loadAll = useCallback(async () => {
    if (!workspaceId) return;
    try { setGoals(await listGoals(workspaceId)); } catch {}
    try { setKPIs(await listKPIs(workspaceId)); } catch {}
  }, [workspaceId]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Auto-calculate progress from current/target values, respecting direction
  const calcProgress = (current: string, target: string, direction: string): number => {
    const c = parseFloat(current);
    const t = parseFloat(target);
    if (!t || t === 0) return 0;
    if (direction === "lower") {
      // 越低越好: target/current when current > target, else 100%
      return c <= t ? 100 : Math.round((t / c) * 100);
    }
    // 越高越好 (default): current/target, capped at 100
    return Math.min(100, Math.round((c / t) * 100));
  };

  // Bar color based on direction + progress
  const getBarColor = (pct: number, direction: string) => {
    if (direction === "lower") {
      return pct >= 100 ? "bg-green-500" : pct >= 70 ? "bg-amber-500" : "bg-red-500";
    }
    return pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-blue-500" : pct >= 25 ? "bg-amber-500" : "bg-red-500";
  };

  const handleCreateGoal = async () => {
    if (!workspaceId) return;
    if (!newGoal.title.trim()) { setError("Goal title is required"); return; }
    setSavingGoal(true);
    setError("");
    try {
      const progress = calcProgress(newGoal.current_value, newGoal.target_value, newGoal.direction);
      await createGoal(workspaceId, {
        title: newGoal.title,
        type: newGoal.type,
        target_value: newGoal.target_value ? parseFloat(newGoal.target_value) : undefined,
        current_value: newGoal.current_value ? parseFloat(newGoal.current_value) : undefined,
        progress_pct: progress,
        direction: newGoal.direction,
      });
      setNewGoal({ title: "", type: "KPI", target_value: "", current_value: "", direction: "higher", description: "", start_date: "", end_date: "" });
      loadAll();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create goal";
      setError(msg);
      console.error("[Goals] Create error:", err);
    } finally {
      setSavingGoal(false);
    }
  };

  const handleUpdateGoal = async (id: string) => {
    if (!workspaceId) return;
    const e = editGoal[id]; if (!e || !e.title.trim()) return;
    setError("");
    try {
      const progress = calcProgress(e.current_value, e.target_value, e.direction);
      await updateGoal(workspaceId, id, {
        title: e.title, type: e.type,
        target_value: e.target_value ? parseFloat(e.target_value) : undefined,
        current_value: e.current_value ? parseFloat(e.current_value) : undefined,
        progress_pct: progress, direction: e.direction,
        description: e.description || undefined, status: e.status || undefined,
      });
      const next = { ...editGoal }; delete next[id]; setEditGoal(next);
      loadAll();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  };

  const handleCreateKPI = async () => {
    if (!workspaceId) return;
    if (!newKPI.name.trim()) { setError("KPI name is required"); return; }
    setSavingKPI(true);
    setError("");
    try {
      await createKPI(workspaceId, {
        name: newKPI.name,
        category: newKPI.category || undefined,
        current_value: newKPI.current_value ? parseFloat(newKPI.current_value) : undefined,
        target_value: newKPI.target_value ? parseFloat(newKPI.target_value) : undefined,
        unit: newKPI.unit || undefined,
        period: newKPI.period || undefined,
      });
      setNewKPI({ name: "", category: "", current_value: "", target_value: "", unit: "", period: "" });
      loadAll();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create KPI";
      setError(msg);
    } finally {
      setSavingKPI(false);
    }
  };

  if (!workspaceId) return <div className="p-8 text-gray-400 text-center">Select a workspace first.</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <WorkspaceSelector />
      <div>
        <h2 className="text-xl font-semibold text-gray-800">Goals & KPIs</h2>
        <p className="text-sm text-gray-500 mt-1">Track company objectives and key performance indicators.</p>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {(["goals", "kpis"] as const).map((t) => (
          <button key={t} onClick={() => { setTab(t); setError(""); }}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === t ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}>
            {t === "goals" ? "Goals (OKR/KPI)" : "KPIs"}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}

      {/* Goals */}
      {tab === "goals" && (
        <Card>
          <CardHeader><CardTitle className="text-base">Company Goals</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2 flex-wrap">
              <Input placeholder="Goal title" value={newGoal.title}
                onChange={(e) => { setNewGoal({ ...newGoal, title: e.target.value }); setError(""); }}
                className="flex-1 min-w-[200px]" />
              <select value={newGoal.type} onChange={(e) => setNewGoal({ ...newGoal, type: e.target.value })}
                className="text-sm rounded-lg border border-gray-200 px-3 py-2 bg-white">
                <option value="KPI">KPI</option><option value="OKR">OKR</option><option value="MBO">MBO</option>
              </select>
              <Input placeholder="Target" type="number" value={newGoal.target_value}
                onChange={(e) => setNewGoal({ ...newGoal, target_value: e.target.value })} className="w-24" />
              <Input placeholder="Current" type="number" value={newGoal.current_value}
                onChange={(e) => setNewGoal({ ...newGoal, current_value: e.target.value })} className="w-24" />
              {/* Direction toggle */}
              <button
                type="button"
                onClick={() => setNewGoal({ ...newGoal, direction: newGoal.direction === "higher" ? "lower" : "higher" })}
                className={`flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg border transition-colors ${
                  newGoal.direction === "higher"
                    ? "border-green-200 bg-green-50 text-green-700"
                    : "border-red-200 bg-red-50 text-red-700"
                }`}
                title={newGoal.direction === "higher" ? "越高越好（如营收、利润）" : "越低越好（如退货率、成本）"}
              >
                {newGoal.direction === "higher" ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                {newGoal.direction === "higher" ? "↑" : "↓"}
              </button>
              <Button size="sm" onClick={handleCreateGoal} disabled={savingGoal}>
                <Plus size={14} className="mr-1" /> {savingGoal ? "Adding..." : "Add"}
              </Button>
            </div>
            {goals.map((g) => (
              <div key={g.id} className="p-3 rounded border border-gray-100 hover:bg-gray-50 group">
                {editGoal[g.id] ? (
                  <div className="space-y-2">
                    <div className="flex gap-1.5 flex-wrap">
                      <Input value={editGoal[g.id].title} onChange={(d) => setEditGoal({ ...editGoal, [g.id]: { ...editGoal[g.id], title: d.target.value } })} className="flex-1 min-w-[150px] h-7 text-xs" placeholder="Title" />
                      <select value={editGoal[g.id].type} onChange={(d) => setEditGoal({ ...editGoal, [g.id]: { ...editGoal[g.id], type: d.target.value } })} className="text-xs rounded border border-gray-200 px-2 py-1 h-7">
                        <option value="KPI">KPI</option><option value="OKR">OKR</option><option value="MBO">MBO</option>
                      </select>
                      <select value={editGoal[g.id].status} onChange={(d) => setEditGoal({ ...editGoal, [g.id]: { ...editGoal[g.id], status: d.target.value } })} className="text-xs rounded border border-gray-200 px-2 py-1 h-7">
                        <option value="active">Active</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option>
                      </select>
                      <Input value={editGoal[g.id].target_value} onChange={(d) => setEditGoal({ ...editGoal, [g.id]: { ...editGoal[g.id], target_value: d.target.value } })} type="number" className="w-20 h-7 text-xs" placeholder="Target" />
                      <Input value={editGoal[g.id].current_value} onChange={(d) => setEditGoal({ ...editGoal, [g.id]: { ...editGoal[g.id], current_value: d.target.value } })} type="number" className="w-20 h-7 text-xs" placeholder="Cur" />
                      <button type="button" onClick={() => setEditGoal({ ...editGoal, [g.id]: { ...editGoal[g.id], direction: editGoal[g.id].direction === "higher" ? "lower" : "higher" } })}
                        className={`text-[10px] px-1.5 py-0.5 rounded h-7 ${editGoal[g.id].direction === "higher" ? "bg-green-50 text-green-600 border border-green-200" : "bg-red-50 text-red-600 border border-red-200"}`}>
                        {editGoal[g.id].direction === "higher" ? "↑ higher" : "↓ lower"}
                      </button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => handleUpdateGoal(g.id)}>Save</Button>
                      <button onClick={() => { const n = { ...editGoal }; delete n[g.id]; setEditGoal(n); }} className="p-0.5 hover:bg-gray-200 rounded"><X size={14} /></button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{g.title}</span>
                        {g.direction === "lower" ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-500 flex items-center gap-0.5"><ArrowDown size={10} /> lower</span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-50 text-green-500 flex items-center gap-0.5"><ArrowUp size={10} /> higher</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${g.type === "OKR" ? "bg-blue-50 text-blue-600" : g.type === "MBO" ? "bg-purple-50 text-purple-600" : "bg-green-50 text-green-600"}`}>{g.type}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${g.status === "completed" ? "bg-green-50 text-green-600" : "bg-gray-50 text-gray-500"}`}>{g.status}</span>
                        <Button size="sm" variant="ghost" className="h-7 text-xs opacity-0 group-hover:opacity-100 px-1.5"
                          onClick={() => setEditGoal({ ...editGoal, [g.id]: { title: g.title, type: g.type, target_value: g.target_value?.toString() || "", current_value: g.current_value?.toString() || "", direction: g.direction || "higher", description: g.description || "", status: g.status || "active" } })}>
                          <Edit3 size={12} className="mr-0.5" />Edit
                        </Button>
                        <button onClick={async () => { if (!workspaceId || !confirm("Delete?")) return; await deleteGoal(workspaceId, g.id); loadAll(); }}
                          className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-50 rounded"><Trash2 size={12} className="text-red-400" /></button>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${getBarColor(g.progress_pct || 0, g.direction || "higher")}`}
                          style={{ width: `${Math.min(100, g.progress_pct || 0)}%` }} />
                      </div>
                      <span className="text-xs text-gray-500 w-10 text-right">{g.progress_pct || 0}%</span>
                    </div>
                    <div className="flex gap-4 mt-1 text-xs text-gray-400 flex-wrap">
                      {g.target_value != null && <span>Target: {g.target_value}</span>}
                      {g.current_value != null && <span>Current: {g.current_value}</span>}
                      {g.description && <span>📝 {g.description.slice(0, 50)}</span>}
                      {g.start_date && <span>📅 {g.start_date}</span>}
                      {g.end_date && <span>→ {g.end_date}</span>}
                    </div>
                  </>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* KPIs */}
      {tab === "kpis" && (
        <Card>
          <CardHeader><CardTitle className="text-base">Key Performance Indicators</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2 flex-wrap">
              <Input placeholder="KPI name" value={newKPI.name}
                onChange={(e) => { setNewKPI({ ...newKPI, name: e.target.value }); setError(""); }}
                className="flex-1 min-w-[150px]" />
              <Input placeholder="Category" value={newKPI.category}
                onChange={(e) => setNewKPI({ ...newKPI, category: e.target.value })} className="w-32" />
              <Input placeholder="Current" type="number" value={newKPI.current_value}
                onChange={(e) => setNewKPI({ ...newKPI, current_value: e.target.value })} className="w-24" />
              <Input placeholder="Target" type="number" value={newKPI.target_value}
                onChange={(e) => setNewKPI({ ...newKPI, target_value: e.target.value })} className="w-24" />
              <Input placeholder="Unit" value={newKPI.unit}
                onChange={(e) => setNewKPI({ ...newKPI, unit: e.target.value })} className="w-20" />
              <Input placeholder="Period" value={newKPI.period}
                onChange={(e) => setNewKPI({ ...newKPI, period: e.target.value })} className="w-24" />
              <Button size="sm" onClick={handleCreateKPI} disabled={savingKPI}>
                <Plus size={14} className="mr-1" /> {savingKPI ? "Adding..." : "Add"}
              </Button>
            </div>
            {kpis.map((k) => (
              <div key={k.id} className="p-3 rounded border border-gray-100 hover:bg-gray-50 group">
                {editKPI[k.id] ? (
                  <div className="flex items-center gap-1 flex-wrap">
                    <Input value={editKPI[k.id].name} onChange={(d) => setEditKPI({ ...editKPI, [k.id]: { ...editKPI[k.id], name: d.target.value } })} className="w-28 h-7 text-xs" placeholder="Name" />
                    <Input value={editKPI[k.id].category} onChange={(d) => setEditKPI({ ...editKPI, [k.id]: { ...editKPI[k.id], category: d.target.value } })} className="w-20 h-7 text-xs" placeholder="Cat" />
                    <Input type="number" value={editKPI[k.id].current_value} onChange={(d) => setEditKPI({ ...editKPI, [k.id]: { ...editKPI[k.id], current_value: d.target.value } })} className="w-16 h-7 text-xs" />
                    <Input type="number" value={editKPI[k.id].target_value} onChange={(d) => setEditKPI({ ...editKPI, [k.id]: { ...editKPI[k.id], target_value: d.target.value } })} className="w-16 h-7 text-xs" />
                    <Input value={editKPI[k.id].unit} onChange={(d) => setEditKPI({ ...editKPI, [k.id]: { ...editKPI[k.id], unit: d.target.value } })} className="w-12 h-7 text-xs" placeholder="u" />
                    <Input value={editKPI[k.id].period} onChange={(d) => setEditKPI({ ...editKPI, [k.id]: { ...editKPI[k.id], period: d.target.value } })} className="w-20 h-7 text-xs" placeholder="Period" />
                    <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={async () => {
                      if (!workspaceId) return; const e = editKPI[k.id];
                      await updateKPI(workspaceId, k.id, { name: e.name, category: e.category || undefined, current_value: e.current_value ? parseFloat(e.current_value) : undefined, target_value: e.target_value ? parseFloat(e.target_value) : undefined, unit: e.unit || undefined, period: e.period || undefined });
                      const next = { ...editKPI }; delete next[k.id]; setEditKPI(next); loadAll();
                    }}>Save</Button>
                    <button onClick={() => { const n = { ...editKPI }; delete n[k.id]; setEditKPI(n); }} className="p-0.5 hover:bg-gray-200 rounded"><X size={14} /></button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="flex-1 text-sm font-medium">{k.name}</span>
                    {k.category && <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">{k.category}</span>}
                    <span className="text-xs text-gray-500">{k.current_value}{k.unit} / {k.target_value}{k.unit}</span>
                    {k.period && <span className="text-[10px] text-gray-400">{k.period}</span>}
                    <Button size="sm" variant="ghost" className="h-7 text-xs opacity-0 group-hover:opacity-100 px-1.5"
                      onClick={() => setEditKPI({ ...editKPI, [k.id]: { name: k.name, category: k.category || "", current_value: k.current_value?.toString() || "", target_value: k.target_value?.toString() || "", unit: k.unit || "", period: k.period || "" } })}>
                      <Edit3 size={12} className="mr-0.5" />Edit
                    </Button>
                    <button onClick={async () => { if (!workspaceId || !confirm("Delete?")) return; await deleteKPI(workspaceId, k.id); loadAll(); }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-50 rounded"><Trash2 size={12} className="text-red-400" /></button>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
