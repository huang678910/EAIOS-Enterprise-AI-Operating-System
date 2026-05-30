"use client";
import { Card, CardContent } from "@/components/ui/card";
import { Database, FileText, Search } from "lucide-react";

interface KnowledgeStatsProps {
  documentCount: number;
  totalChunks: number;
}

export default function KnowledgeStats({ documentCount, totalChunks }: KnowledgeStatsProps) {
  const stats = [
    { label: "Documents", value: documentCount, icon: FileText, color: "text-blue-500", bg: "bg-blue-50" },
    { label: "Total Chunks", value: totalChunks, icon: Database, color: "text-green-500", bg: "bg-green-50" },
    { label: "Embedding Dim", value: 512, icon: Search, color: "text-purple-500", bg: "bg-purple-50" },
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {stats.map((s) => (
        <Card key={s.label}>
          <CardContent className="p-6 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl ${s.bg} flex items-center justify-center`}>
              <s.icon size={24} className={s.color} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
