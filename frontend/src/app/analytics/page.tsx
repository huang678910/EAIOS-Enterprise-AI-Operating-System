"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore, useWorkspaceStore } from "@/lib/stores";
import { useDashboardData, useAiAnalysis } from "@/lib/analytics-hooks";
import WorkspaceSelector from "@/components/layout/WorkspaceSelector";
import KpiCard from "@/components/analytics/KpiCard";
import TrendChart from "@/components/analytics/TrendChart";
import AIAnalysisPanel from "@/components/analytics/AIAnalysisPanel";
import GoalProgressBar from "@/components/analytics/GoalProgressBar";
import ProactiveAlertCard from "@/components/analytics/ProactiveAlertCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Target, Bell } from "lucide-react";
import api from "@/lib/api";

const CHART_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export default function AnalyticsPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const workspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);

  const { data, loading, error } = useDashboardData(workspaceId);
  const { analysis, loading: analysisLoading, generate } = useAiAnalysis(workspaceId);
  const [analysisGenerated, setAnalysisGenerated] = useState(false);
  const [proactiveAlerts, setProactiveAlerts] = useState<Array<{
    id: string; alert_type: string; severity: string; title: string;
    description?: string; metric_name?: string; current_value?: number;
    threshold_value?: number; suggested_action?: string; is_read: boolean; triggered_at?: string;
  }>>([]);
  const [checkingAlerts, setCheckingAlerts] = useState(false);
  const [checkResult, setCheckResult] = useState<string | null>(null);

  useEffect(() => { if (!token) router.push("/login"); }, [token, router]);

  // Trigger AI analysis on first load
  useEffect(() => {
    if (data && !analysisGenerated && workspaceId) {
      setAnalysisGenerated(true);
      generate();
    }
  }, [data, analysisGenerated, generate, workspaceId]);

  // Fetch proactive alerts
  useEffect(() => {
    if (!workspaceId) return;
    api.get(`/api/v1/workspaces/${workspaceId}/alerts/proactive`)
      .then((res) => setProactiveAlerts(res.data || []))
      .catch(() => {});
  }, [workspaceId]);

  const displayAnalysis = analysis || data?.analysis || null;

  if (!workspaceId) return <div className="p-8 text-gray-400">Select a workspace first.</div>;

  const snapshot = data?.metrics_snapshot?.metrics || [];
  const trends = data?.trends || {};
  const goals = data?.goals || [];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <WorkspaceSelector />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Analytics Center</h2>
          <p className="text-sm text-gray-500 mt-1">Enterprise KPI dashboard with AI-powered business analysis.</p>
        </div>
        {data?.metrics_snapshot?.generated_at && (
          <span className="text-xs text-gray-400">
            Data as of {new Date(data.metrics_snapshot.generated_at).toLocaleString()}
          </span>
        )}
      </div>

      {loading && !data && (
        <div className="space-y-4 animate-pulse">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1,2,3,4].map((n) => <div key={n} className="h-28 bg-gray-100 rounded-xl" />)}
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>
      )}

      {/* Proactive Alerts */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Bell size={16} className="text-purple-500" />
              Proactive Alerts
              <span className="text-xs text-gray-400 font-normal">({proactiveAlerts.length} active)</span>
            </CardTitle>
            <button
              onClick={async () => {
                setCheckingAlerts(true); setCheckResult(null);
                try {
                  const checkRes = await api.post(`/api/v1/workspaces/${workspaceId}/alerts/proactive/check`);
                  const count = checkRes.data?.alerts_generated || 0;
                  const res = await api.get(`/api/v1/workspaces/${workspaceId}/alerts/proactive`);
                  setProactiveAlerts(res.data || []);
                  setCheckResult(`Scan complete — ${count} new alert(s) found`);
                } catch {
                  setCheckResult("Scan failed. Check backend connection.");
                } finally {
                  setCheckingAlerts(false);
                }
              }}
              disabled={checkingAlerts}
              className="text-xs px-3 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-gray-500 disabled:opacity-50"
            >
              {checkingAlerts ? "Scanning..." : "Check Now"}
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {checkResult && (
            <p className={`text-xs mb-3 px-3 py-1.5 rounded ${
              checkResult.includes("failed") ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"
            }`}>{checkResult}</p>
          )}
          {proactiveAlerts.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-3">
              No active alerts. The system checks KPIs and trends automatically every hour, or click <b>Check Now</b> to scan immediately.
            </p>
          ) : (
            <div className="space-y-2">
              {proactiveAlerts.map((alert) => (
                <ProactiveAlertCard
                  key={alert.id}
                  alert={alert}
                  workspaceId={workspaceId}
                  onDismiss={(id) => setProactiveAlerts((prev) => prev.filter((a) => a.id !== id))}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* KPI Cards */}
      {snapshot.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {snapshot.map((m) => {
            const trend = trends[m.metric_name];
            return (
              <KpiCard
                key={m.id}
                name={m.metric_name}
                value={m.metric_value}
                unit={m.unit}
                changePct={trend?.change_pct ?? null}
                trendDirection={trend?.trend_direction}
                period={m.period}
              />
            );
          })}
        </div>
      )}

      {/* Trend Charts */}
      {Object.keys(trends).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(trends).map(([name, trend], i) => (
            <Card key={name}>
              <CardContent className="p-4">
                <TrendChart
                  data={trend.data_points}
                  metricName={name}
                  color={CHART_COLORS[i % CHART_COLORS.length]}
                  height={200}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Goals Progress */}
      {goals.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Target size={16} className="text-blue-500" />
              Goals & OKRs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {goals.map((goal: Record<string, unknown>) => (
              <GoalProgressBar
                key={String(goal.id)}
                title={String(goal.title || "")}
                progressPct={Number(goal.progress_pct) || 0}
                currentValue={goal.current_value != null ? Number(goal.current_value) : undefined}
                targetValue={goal.target_value != null ? Number(goal.target_value) : undefined}
                status={String(goal.status || "pending")}
                type={goal.type ? String(goal.type) : undefined}
                direction={goal.direction ? String(goal.direction) : undefined}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* AI Analysis */}
      <AIAnalysisPanel
        analysis={displayAnalysis}
        loading={analysisLoading}
        onRefresh={generate}
      />

      {/* Empty State */}
      {snapshot.length === 0 && goals.length === 0 && !loading && (
        <div className="text-center py-16">
          <BarChart3 size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-2">No Data Yet</h3>
          <p className="text-sm text-gray-400 max-w-md mx-auto">
            Add business metrics in Settings → Metrics, and set up company goals in Settings → Goals & KPIs.
            The analytics dashboard will automatically visualize your data.
          </p>
        </div>
      )}
    </div>
  );
}
