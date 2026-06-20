"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore, useWorkspaceStore } from "@/lib/stores";
import WorkspaceSelector from "@/components/layout/WorkspaceSelector";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Play, Loader2 } from "lucide-react";
import api from "@/lib/api";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

export default function ForecastPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const workspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);

  const [metricName, setMetricName] = useState("revenue");
  const [method, setMethod] = useState("moving_average");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    metric_name: string;
    historical: Array<{ period: string; value: number }>;
    predictions: Array<{ period: string; value: number; confidence_low?: number; confidence_high?: number }>;
    method?: string;
  } | null>(null);
  const [error, setError] = useState("");
  const [metricNames, setMetricNames] = useState<string[]>([]);

  useEffect(() => { if (!token) router.push("/login"); }, [token, router]);

  useEffect(() => {
    if (!workspaceId) return;
    // Fetch available metric names
    api.get(`/api/v1/workspaces/${workspaceId}/metrics/snapshot`)
      .then((res) => {
        const raw: string[] = (res.data.metrics || []).map((m: { metric_name: string }) => m.metric_name);
        const names = [...new Set(raw)];
        setMetricNames(names);
        if (names.length > 0 && !names.includes(metricName)) setMetricName(names[0]);
      }).catch(() => {});
  }, [workspaceId]);

  async function handlePredict() {
    if (!workspaceId || !metricName) return;
    setLoading(true); setError(""); setResult(null);
    try {
      await api.post(`/api/v1/workspaces/${workspaceId}/forecast/predict`, { metric_name: metricName, method });
      const res = await api.get(`/api/v1/workspaces/${workspaceId}/forecast/${encodeURIComponent(metricName)}`);
      setResult(res.data);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail || "Prediction failed");
    } finally { setLoading(false); }
  }

  // Merge historical + prediction for chart
  const chartData = result ? [
    ...result.historical.map((h, i) => ({ ...h, type: "Historical", idx: i })),
    ...result.predictions.map((p, i) => ({
      period: p.period,
      value: p.value,
      confidence_low: p.confidence_low,
      confidence_high: p.confidence_high,
      type: "Prediction",
      idx: result.historical.length + i,
    })),
  ] : [];

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <WorkspaceSelector />
      <div>
        <h2 className="text-xl font-semibold text-gray-800">Forecast Engine</h2>
        <p className="text-sm text-gray-500 mt-1">Predict business metrics using moving average, linear regression, or Prophet.</p>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader><CardTitle className="text-base">Configure Prediction</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-3 flex-wrap items-end">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Metric</label>
              <select value={metricName} onChange={(e) => setMetricName(e.target.value)}
                className="text-sm rounded-lg border border-gray-200 px-3 py-2 bg-white">
                {metricNames.length === 0 && <option value="">No metrics found</option>}
                {metricNames.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Method</label>
              <select value={method} onChange={(e) => setMethod(e.target.value)}
                className="text-sm rounded-lg border border-gray-200 px-3 py-2 bg-white">
                <option value="moving_average">Moving Average</option>
                <option value="linear_regression">Linear Regression</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Periods</label>
              <span className="text-sm text-gray-700 font-medium">
                {result ? `${result.historical.length + result.predictions.length} points (${result.historical.length} historical + ${result.predictions.length} forecast)` : "—"}
              </span>
            </div>
            <Button onClick={handlePredict} disabled={loading || !metricName}>
              {loading ? <><Loader2 size={14} className="mr-1 animate-spin" /> Predicting...</> : <><Play size={14} className="mr-1" /> Predict</>}
            </Button>
          </div>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </CardContent>
      </Card>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp size={16} className="text-blue-500" />
              {result?.metric_name} Forecast ({result?.method})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={70} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="value" name="Value" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="confidence_high" name="Upper Bound" stroke="#93c5fd" strokeDasharray="4 4" strokeWidth={1} dot={false} />
                <Line type="monotone" dataKey="confidence_low" name="Lower Bound" stroke="#93c5fd" strokeDasharray="4 4" strokeWidth={1} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {!chartData.length && !loading && !error && (
        <div className="text-center py-16">
          <TrendingUp size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-sm text-gray-400">Select a metric and click Predict to see the forecast.</p>
        </div>
      )}
    </div>
  );
}
