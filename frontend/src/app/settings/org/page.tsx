"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore, useWorkspaceStore } from "@/lib/stores";
import {
  listDepartments, createDepartment, updateDepartment, deleteDepartment,
  listPositions, createPosition, updatePosition, deletePosition,
  listEmployees, createEmployee, updateEmployee, deleteEmployee,
  type DeptData, type PosData, type EmpData,
} from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Edit3, X, ChevronRight, Users, Briefcase, User } from "lucide-react";
import WorkspaceSelector from "@/components/layout/WorkspaceSelector";

export default function OrgSettingsPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const workspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);

  const [tab, setTab] = useState<"dept" | "pos" | "emp">("dept");
  const [error, setError] = useState("");

  // Departments
  const [depts, setDepts] = useState<DeptData[]>([]);
  const [newDept, setNewDept] = useState({ name: "", type: "", parent_id: "" });
  const [savingDept, setSavingDept] = useState(false);
  const [editDept, setEditDept] = useState<Record<string, { name: string; type: string }>>({});

  // Positions
  const [positions, setPositions] = useState<PosData[]>([]);
  const [newPos, setNewPos] = useState({ title: "", level: "", department_id: "" });
  const [savingPos, setSavingPos] = useState(false);
  const [editPos, setEditPos] = useState<Record<string, { title: string; level: string; department_id: string }>>({});

  // Employees
  const [employees, setEmployees] = useState<EmpData[]>([]);
  const [newEmp, setNewEmp] = useState({ name: "", email: "", department_id: "", position_id: "" });
  const [savingEmp, setSavingEmp] = useState(false);
  const [editEmp, setEditEmp] = useState<Record<string, { name: string; email: string; department_id: string; position_id: string }>>({});

  // Auth guard
  useEffect(() => { if (!token) router.push("/login"); }, [token, router]);

  // Clear data on workspace switch
  useEffect(() => {
    setDepts([]); setPositions([]); setEmployees([]);
    setError("");
  }, [workspaceId]);

  const loadDepts = useCallback(async () => {
    if (!workspaceId) return;
    try { const d = await listDepartments(workspaceId); setDepts(d); } catch {}
  }, [workspaceId]);
  const loadPositions = useCallback(async () => {
    if (!workspaceId) return;
    try { const d = await listPositions(workspaceId); setPositions(d); } catch {}
  }, [workspaceId]);
  const loadEmployees = useCallback(async () => {
    if (!workspaceId) return;
    try { const d = await listEmployees(workspaceId); setEmployees(d); } catch {}
  }, [workspaceId]);

  useEffect(() => { loadDepts(); loadPositions(); loadEmployees(); }, [loadDepts, loadPositions, loadEmployees]);

  // Build tree: group departments by parent_id, sorted
  function buildDeptTree() {
    const childrenMap: Record<string, DeptData[]> = {};
    const roots: DeptData[] = [];
    for (const d of depts) {
      const pid = d.parent_id || "__root__";
      if (!childrenMap[pid]) childrenMap[pid] = [];
      childrenMap[pid].push(d);
    }
    // Sort each group by name
    for (const key of Object.keys(childrenMap)) {
      childrenMap[key].sort((a, b) => a.name.localeCompare(b.name));
    }
    roots.push(...(childrenMap["__root__"] || []));
    return { roots, childrenMap };
  }

  function DeptRow({ dept, level }: { dept: DeptData; level: number }) {
    const { childrenMap } = buildDeptTree();
    const childDepts = childrenMap[dept.id] || [];
    const indent = level * 24; // px per level

    return (
      <>
        <div className={`flex items-center gap-2 p-2.5 rounded hover:bg-gray-50 group`}
          style={{ marginLeft: indent }}>
          {level > 0 && <ChevronRight size={12} className="text-blue-300 flex-shrink-0" />}
          {/* Tree connector line */}
          {level > 0 && (
            <div className="absolute left-0 top-0 bottom-0 w-px bg-blue-200" style={{ left: indent - 12 }} />
          )}
          <div className="flex-1 min-w-0">
            <span className={`text-sm font-medium ${level === 0 ? "text-gray-900" : "text-gray-700"}`}>{dept.name}</span>
            <div className="flex gap-2 mt-0.5">
              {dept.type && <span className="text-[11px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">{dept.type}</span>}
              {dept.parent_id && <span className="text-[11px] text-gray-400">↳ {deptName(dept.parent_id)}</span>}
            </div>
          </div>
          {editDept[dept.id] ? (
            <div className="flex items-center gap-1">
              <Input value={editDept[dept.id].name} onChange={(e) => setEditDept({ ...editDept, [dept.id]: { ...editDept[dept.id], name: e.target.value } })} className="w-32 h-7 text-xs" />
              <Input value={editDept[dept.id].type} onChange={(e) => setEditDept({ ...editDept, [dept.id]: { ...editDept[dept.id], type: e.target.value } })} className="w-28 h-7 text-xs" placeholder="Type" />
              <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => handleUpdateDept(dept.id)}>Save</Button>
              <button onClick={() => { const n = { ...editDept }; delete n[dept.id]; setEditDept(n); }} className="p-0.5 hover:bg-gray-200 rounded"><X size={12} /></button>
            </div>
          ) : (
            <Button size="sm" variant="ghost" className="h-7 text-xs opacity-0 group-hover:opacity-100 flex-shrink-0"
              onClick={() => setEditDept({ ...editDept, [dept.id]: { name: dept.name, type: dept.type || "" } })}>
              <Edit3 size={12} className="mr-1" />Edit
            </Button>
          )}
          <button onClick={() => handleDeleteDept(dept.id)} className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-50 rounded flex-shrink-0">
            <Trash2 size={12} className="text-red-400" />
          </button>
        </div>
        {/* Render children recursively */}
        {childDepts.map((child) => (<DeptRow key={child.id} dept={child} level={level + 1} />))}
      </>
    );
  }

  const { roots } = buildDeptTree();

  // Helper: dept name by id
  const deptName = (id?: string) => depts.find(d => d.id === id)?.name || "—";
  // Helper: position title by id
  const posTitle = (id?: string) => positions.find(p => p.id === id)?.title || "—";

  // --- Department handlers ---
  const handleCreateDept = async () => {
    if (!workspaceId || !newDept.name.trim()) { setError("Department name is required"); return; }
    setSavingDept(true); setError("");
    try {
      await createDepartment(workspaceId, { name: newDept.name, type: newDept.type || undefined, parent_id: newDept.parent_id || undefined });
      setNewDept({ name: "", type: "", parent_id: "" });
      loadDepts();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally { setSavingDept(false); }
  };

  const handleUpdateDept = async (id: string) => {
    if (!workspaceId) return;
    const e = editDept[id]; if (!e) return;
    setError("");
    try {
      await updateDepartment(workspaceId, id, { name: e.name, type: e.type || undefined });
      const next = { ...editDept }; delete next[id]; setEditDept(next);
      loadDepts();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Update failed"); }
  };

  const handleDeleteDept = async (id: string) => {
    if (!workspaceId || !confirm("Delete this department?")) return;
    try { await deleteDepartment(workspaceId, id); loadDepts(); } catch (err: unknown) { setError(err instanceof Error ? err.message : "Delete failed"); }
  };

  // --- Position handlers ---
  const handleCreatePos = async () => {
    if (!workspaceId || !newPos.title.trim()) { setError("Position title is required"); return; }
    setSavingPos(true); setError("");
    try {
      await createPosition(workspaceId, { title: newPos.title, level: newPos.level || undefined, department_id: newPos.department_id || undefined });
      setNewPos({ title: "", level: "", department_id: "" });
      loadPositions();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed"); }
    finally { setSavingPos(false); }
  };

  const handleUpdatePos = async (id: string) => {
    if (!workspaceId) return;
    const e = editPos[id]; if (!e || !e.title.trim()) return;
    setError("");
    try {
      await updatePosition(workspaceId, id, { title: e.title, level: e.level || undefined, department_id: e.department_id || undefined });
      const next = { ...editPos }; delete next[id]; setEditPos(next);
      loadPositions();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Update failed"); }
  };

  const handleDeletePos = async (id: string) => {
    if (!workspaceId || !confirm("Delete this position?")) return;
    try { await deletePosition(workspaceId, id); loadPositions(); } catch (err: unknown) { setError(err instanceof Error ? err.message : "Delete failed"); }
  };

  // --- Employee handlers ---
  const handleCreateEmp = async () => {
    if (!workspaceId || !newEmp.name.trim()) { setError("Employee name is required"); return; }
    setSavingEmp(true); setError("");
    try {
      await createEmployee(workspaceId, { name: newEmp.name, email: newEmp.email || undefined, department_id: newEmp.department_id || undefined, position_id: newEmp.position_id || undefined });
      setNewEmp({ name: "", email: "", department_id: "", position_id: "" });
      loadEmployees();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed"); }
    finally { setSavingEmp(false); }
  };

  const handleUpdateEmp = async (id: string) => {
    if (!workspaceId) return;
    const e = editEmp[id]; if (!e || !e.name.trim()) return;
    setError("");
    try {
      await updateEmployee(workspaceId, id, { name: e.name, email: e.email || undefined, department_id: e.department_id || undefined, position_id: e.position_id || undefined });
      const next = { ...editEmp }; delete next[id]; setEditEmp(next);
      loadEmployees();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Update failed"); }
  };

  const handleDeleteEmp = async (id: string) => {
    if (!workspaceId || !confirm("Delete this employee?")) return;
    try { await deleteEmployee(workspaceId, id); loadEmployees(); } catch (err: unknown) { setError(err instanceof Error ? err.message : "Delete failed"); }
  };

  if (!workspaceId) return <div className="p-8 text-gray-400 text-center">Select a workspace first.</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <WorkspaceSelector />
      <div>
        <h2 className="text-xl font-semibold text-gray-800">Organization Structure</h2>
        <p className="text-sm text-gray-500 mt-1">Manage departments, positions, and employees.</p>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {(["dept", "pos", "emp"] as const).map((t) => (
          <button key={t} onClick={() => { setTab(t); setError(""); }}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === t ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            {t === "dept" ? <><Briefcase size={13} />Departments</> : t === "pos" ? <><Users size={13} />Positions</> : <><User size={13} />Employees</>}
          </button>
        ))}
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

      {/* ═══════════════ Departments ═══════════════ */}
      {tab === "dept" && (
        <Card>
          <CardHeader><CardTitle className="text-base">Departments</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input placeholder="Dept name" value={newDept.name}
                onChange={(e) => { setNewDept({ ...newDept, name: e.target.value }); setError(""); }} className="flex-1" />
              <Input placeholder="Type (e.g. Sales)" value={newDept.type}
                onChange={(e) => setNewDept({ ...newDept, type: e.target.value })} className="w-40" />
              <select value={newDept.parent_id} onChange={(e) => setNewDept({ ...newDept, parent_id: e.target.value })}
                className="w-48 text-sm rounded-lg border border-gray-200 px-3 py-2 bg-white">
                <option value="">No Parent</option>
                {depts.map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
              </select>
              <Button size="sm" onClick={handleCreateDept} disabled={savingDept}>
                <Plus size={14} className="mr-1" /> {savingDept ? "Adding..." : "Add"}
              </Button>
            </div>
            <div className="space-y-0">
              {roots.map((d) => (<DeptRow key={d.id} dept={d} level={0} />))}
              {depts.length === 0 && <p className="text-sm text-gray-400 py-4 text-center">No departments yet. Add your first one.</p>}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══════════════ Positions ═══════════════ */}
      {tab === "pos" && (
        <Card>
          <CardHeader><CardTitle className="text-base">Positions</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input placeholder="Position title" value={newPos.title}
                onChange={(e) => { setNewPos({ ...newPos, title: e.target.value }); setError(""); }} className="flex-1" />
              <Input placeholder="Level" value={newPos.level}
                onChange={(e) => setNewPos({ ...newPos, level: e.target.value })} className="w-32" />
              <select value={newPos.department_id} onChange={(e) => setNewPos({ ...newPos, department_id: e.target.value })}
                className="w-48 text-sm rounded-lg border border-gray-200 px-3 py-2 bg-white">
                <option value="">Any Department</option>
                {depts.map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
              </select>
              <Button size="sm" onClick={handleCreatePos} disabled={savingPos}>
                <Plus size={14} className="mr-1" /> {savingPos ? "Adding..." : "Add"}
              </Button>
            </div>
            <div className="space-y-1">
              {positions.map((p) => (
                <div key={p.id} className="flex items-center gap-2 p-2.5 rounded hover:bg-gray-50 group">
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-gray-800">{p.title}</span>
                    <div className="flex gap-2 mt-0.5">
                      {p.level && <span className="text-[11px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-600">{p.level}</span>}
                      <span className="text-[11px] text-gray-400">🏢 {deptName(p.department_id)}</span>
                    </div>
                  </div>
                  {editPos[p.id] ? (
                    <div className="flex items-center gap-1">
                      <Input value={editPos[p.id].title} onChange={(e) => setEditPos({ ...editPos, [p.id]: { ...editPos[p.id], title: e.target.value } })} className="w-36 h-7 text-xs" placeholder="Title" />
                      <Input value={editPos[p.id].level} onChange={(e) => setEditPos({ ...editPos, [p.id]: { ...editPos[p.id], level: e.target.value } })} className="w-24 h-7 text-xs" placeholder="Level" />
                      <select value={editPos[p.id].department_id} onChange={(e) => setEditPos({ ...editPos, [p.id]: { ...editPos[p.id], department_id: e.target.value } })}
                        className="w-36 text-xs rounded border border-gray-200 px-2 py-1.5 bg-white">
                        <option value="">Any Dept</option>
                        {depts.map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
                      </select>
                      <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => handleUpdatePos(p.id)}>Save</Button>
                      <button onClick={() => { const n = { ...editPos }; delete n[p.id]; setEditPos(n); }} className="p-0.5 hover:bg-gray-200 rounded"><X size={12} /></button>
                    </div>
                  ) : (
                    <Button size="sm" variant="ghost" className="h-7 text-xs opacity-0 group-hover:opacity-100 flex-shrink-0"
                      onClick={() => setEditPos({ ...editPos, [p.id]: { title: p.title, level: p.level || "", department_id: p.department_id || "" } })}>
                      <Edit3 size={12} className="mr-1" />Edit
                    </Button>
                  )}
                  <button onClick={() => handleDeletePos(p.id)} className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-50 rounded flex-shrink-0">
                    <Trash2 size={12} className="text-red-400" />
                  </button>
                </div>
              ))}
              {positions.length === 0 && <p className="text-sm text-gray-400 py-4 text-center">No positions yet. Add your first one.</p>}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══════════════ Employees ═══════════════ */}
      {tab === "emp" && (
        <Card>
          <CardHeader><CardTitle className="text-base">Employees</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input placeholder="Full name" value={newEmp.name}
                onChange={(e) => { setNewEmp({ ...newEmp, name: e.target.value }); setError(""); }} className="flex-1" />
              <Input placeholder="Email" value={newEmp.email}
                onChange={(e) => setNewEmp({ ...newEmp, email: e.target.value })} className="w-52" />
              <select value={newEmp.department_id} onChange={(e) => setNewEmp({ ...newEmp, department_id: e.target.value })}
                className="w-40 text-sm rounded-lg border border-gray-200 px-3 py-2 bg-white">
                <option value="">Any Dept</option>
                {depts.map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
              </select>
              <select value={newEmp.position_id} onChange={(e) => setNewEmp({ ...newEmp, position_id: e.target.value })}
                className="w-40 text-sm rounded-lg border border-gray-200 px-3 py-2 bg-white">
                <option value="">Any Position</option>
                {positions.map((p) => (<option key={p.id} value={p.id}>{p.title}</option>))}
              </select>
              <Button size="sm" onClick={handleCreateEmp} disabled={savingEmp}>
                <Plus size={14} className="mr-1" /> {savingEmp ? "Adding..." : "Add"}
              </Button>
            </div>
            <div className="space-y-1">
              {employees.map((e) => (
                <div key={e.id} className="flex items-center gap-2 p-2.5 rounded hover:bg-gray-50 group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-800">{e.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        e.status === "active" ? "bg-green-50 text-green-600" : "bg-gray-50 text-gray-500"
                      }`}>{e.status || "active"}</span>
                    </div>
                    <div className="flex gap-2 mt-0.5 text-[11px] text-gray-400">
                      {e.email && <span>✉️ {e.email}</span>}
                      <span>🏢 {deptName(e.department_id)}</span>
                      <span>💼 {posTitle(e.position_id)}</span>
                    </div>
                  </div>
                  {editEmp[e.id] ? (
                    <div className="flex items-center gap-1">
                      <Input value={editEmp[e.id].name} onChange={(d) => setEditEmp({ ...editEmp, [e.id]: { ...editEmp[e.id], name: d.target.value } })} className="w-24 h-7 text-xs" placeholder="Name" />
                      <Input value={editEmp[e.id].email} onChange={(d) => setEditEmp({ ...editEmp, [e.id]: { ...editEmp[e.id], email: d.target.value } })} className="w-36 h-7 text-xs" placeholder="Email" />
                      <select value={editEmp[e.id].department_id} onChange={(d) => setEditEmp({ ...editEmp, [e.id]: { ...editEmp[e.id], department_id: d.target.value } })}
                        className="w-32 text-xs rounded border border-gray-200 px-2 py-1.5 bg-white">
                        <option value="">Any Dept</option>
                        {depts.map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
                      </select>
                      <select value={editEmp[e.id].position_id} onChange={(d) => setEditEmp({ ...editEmp, [e.id]: { ...editEmp[e.id], position_id: d.target.value } })}
                        className="w-32 text-xs rounded border border-gray-200 px-2 py-1.5 bg-white">
                        <option value="">Any Pos</option>
                        {positions.map((p) => (<option key={p.id} value={p.id}>{p.title}</option>))}
                      </select>
                      <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => handleUpdateEmp(e.id)}>Save</Button>
                      <button onClick={() => { const n = { ...editEmp }; delete n[e.id]; setEditEmp(n); }} className="p-0.5 hover:bg-gray-200 rounded"><X size={12} /></button>
                    </div>
                  ) : (
                    <Button size="sm" variant="ghost" className="h-7 text-xs opacity-0 group-hover:opacity-100 flex-shrink-0"
                      onClick={() => setEditEmp({ ...editEmp, [e.id]: { name: e.name, email: e.email || "", department_id: e.department_id || "", position_id: e.position_id || "" } })}>
                      <Edit3 size={12} className="mr-1" />Edit
                    </Button>
                  )}
                  <button onClick={() => handleDeleteEmp(e.id)} className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-50 rounded flex-shrink-0">
                    <Trash2 size={12} className="text-red-400" />
                  </button>
                </div>
              ))}
              {employees.length === 0 && <p className="text-sm text-gray-400 py-4 text-center">No employees yet. Add your first one.</p>}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
