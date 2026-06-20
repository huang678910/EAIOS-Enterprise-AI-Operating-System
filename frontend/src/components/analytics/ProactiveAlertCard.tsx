"use client";
import { useState } from "react";
import { AlertTriangle, TrendingDown, Target, Lightbulb, X, ChevronDown, ChevronUp } from "lucide-react";
import api from "@/lib/api";

const ICON_MAP: Record<string, typeof AlertTriangle> = {
  metric_threshold: AlertTriangle,
  anomaly: TrendingDown,
  goal_risk: Target,
  recommendation: Lightbulb,
};

const SEVERITY_BG: Record<string, string> = {
  critical: "border-red-300 bg-red-50",
  warning: "border-amber-300 bg-amber-50",
  info: "border-blue-300 bg-blue-50",
};

const SEVERITY_ICON_COLOR: Record<string, string> = {
  critical: "text-red-500",
  warning: "text-amber-500",
  info: "text-blue-500",
};

interface AlertData {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  description?: string;
  metric_name?: string;
  current_value?: number;
  threshold_value?: number;
  suggested_action?: string;
  is_read: boolean;
  triggered_at?: string;
}

export default function ProactiveAlertCard({ alert, workspaceId, onDismiss }: { alert: AlertData; workspaceId: string; onDismiss: (id: string) => void }) {
  const [expanded, setExpanded] = useState(alert.severity === "critical");
  const Icon = ICON_MAP[alert.alert_type] || AlertTriangle;
  const bgColor = SEVERITY_BG[alert.severity] || "border-gray-200 bg-gray-50";

  async function handleDismiss() {
    try {
      await api.put(`/api/v1/workspaces/${workspaceId}/alerts/proactive/${alert.id}/dismiss`);
      onDismiss(alert.id);
    } catch {}
  }

  return (
    <div className={`rounded-lg border ${bgColor} transition-all overflow-hidden`}>
      <div className="flex gap-2 p-3">
        <Icon size={18} className={`flex-shrink-0 mt-0.5 ${SEVERITY_ICON_COLOR[alert.severity] || "text-gray-500"}`} />
        <div className="flex-1 min-w-0">
          <button onClick={() => setExpanded(!expanded)} className="w-full text-left">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-gray-800 truncate">{alert.title}</p>
              <div className="flex items-center gap-1 flex-shrink-0">
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  alert.severity === "critical" ? "bg-red-100 text-red-600" :
                  alert.severity === "warning" ? "bg-amber-100 text-amber-600" :
                  "bg-blue-100 text-blue-600"
                }`}>{alert.alert_type}</span>
                {expanded ? <ChevronUp size={12} className="text-gray-400" /> : <ChevronDown size={12} className="text-gray-400" />}
              </div>
            </div>
          </button>
          {expanded && (
            <div className="mt-2 space-y-1.5">
              {alert.description && <p className="text-xs text-gray-500">{alert.description}</p>}
              {alert.suggested_action && (
                <p className="text-xs text-purple-600 font-medium">💡 {alert.suggested_action}</p>
              )}
              {alert.triggered_at && (
                <p className="text-[10px] text-gray-400">{new Date(alert.triggered_at).toLocaleString()}</p>
              )}
            </div>
          )}
        </div>
        <button onClick={handleDismiss} className="flex-shrink-0 p-1 hover:bg-white/50 rounded self-start" title="Dismiss">
          <X size={14} className="text-gray-400" />
        </button>
      </div>
    </div>
  );
}
