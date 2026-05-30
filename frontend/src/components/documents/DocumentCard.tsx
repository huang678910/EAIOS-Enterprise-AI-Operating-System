"use client";
import { FileText, File, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Document } from "@/types";

interface DocumentCardProps {
  doc: Document;
  onDelete: (id: string) => void;
}

const fileIcons: Record<string, React.ReactNode> = {
  pdf: <FileText size={20} className="text-red-500" />,
  docx: <FileText size={20} className="text-blue-500" />,
  pptx: <FileText size={20} className="text-orange-500" />,
  txt: <File size={20} className="text-gray-500" />,
  md: <File size={20} className="text-green-500" />,
};

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  ready: "default",
  processing: "secondary",
  pending: "secondary",
  error: "destructive",
};

export default function DocumentCard({ doc, onDelete }: DocumentCardProps) {
  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center">
          {fileIcons[doc.file_type] || <File size={20} className="text-gray-400" />}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-800">{doc.filename}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-gray-400">
              {doc.file_type.toUpperCase()} • {(doc.file_size / 1024).toFixed(1)} KB
            </span>
            {doc.status === "ready" && (
              <span className="text-xs text-gray-400">• {doc.chunk_count} chunks</span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Badge variant={statusColors[doc.status] || "outline"}>
          {doc.status}
        </Badge>
        <button
          onClick={() => onDelete(doc.id)}
          className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}
