"use client";
import ReactMarkdown from "react-markdown";
import type { Source } from "@/types";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  isStreaming?: boolean;
}

export default function MessageBubble({ role, content, sources, isStreaming }: MessageBubbleProps) {
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div
        className={`max-w-[80%] rounded-2xl px-5 py-3 ${
          isUser
            ? "bg-blue-500 text-white rounded-br-md"
            : "bg-white border border-gray-100 shadow-sm rounded-bl-md"
        }`}
      >
        {/* Content */}
        <div className={`text-sm leading-relaxed ${isUser ? "" : "markdown-body"}`}>
          {isUser ? (
            <p className="whitespace-pre-wrap">{content}</p>
          ) : (
            <ReactMarkdown>{content}</ReactMarkdown>
          )}
          {isStreaming && (
            <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-0.5" />
          )}
        </div>

        {/* Sources */}
        {sources && sources.length > 0 && !isStreaming && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-400 mb-1 font-medium">Sources:</p>
            <div className="flex flex-wrap gap-1">
              {sources.map((s, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px]"
                >
                  {s.filename} ({(s.similarity * 100).toFixed(0)}%)
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
