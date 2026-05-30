"use client";
import { create } from "zustand";
import type { User } from "@/types";

// ---- Auth Store ----
interface AuthStore {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  token: typeof window !== "undefined" ? localStorage.getItem("token") : null,
  user: null,
  setAuth: (token, user) => {
    localStorage.setItem("token", token);
    set({ token, user });
  },
  logout: () => {
    localStorage.removeItem("token");
    set({ token: null, user: null });
  },
  isAuthenticated: () => !!get().token,
}));

// ---- Workspace Store ----
interface WorkspaceStore {
  activeWorkspaceId: string | null;
  setActiveWorkspace: (id: string) => void;
}

export const useWorkspaceStore = create<WorkspaceStore>((set) => ({
  activeWorkspaceId: typeof window !== "undefined" ? localStorage.getItem("activeWorkspaceId") : null,
  setActiveWorkspace: (id) => {
    localStorage.setItem("activeWorkspaceId", id);
    set({ activeWorkspaceId: id });
  },
}));

// ---- Chat Store ----
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  sources?: { filename: string; chunk_id?: string; similarity: number }[];
}

interface ChatStore {
  messages: ChatMessage[];
  isStreaming: boolean;
  activeSessionId: string | null;
  addMessage: (msg: ChatMessage) => void;
  appendToLastAssistant: (token: string) => void;
  setStreaming: (v: boolean) => void;
  setActiveSession: (id: string | null) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  messages: [],
  isStreaming: false,
  activeSessionId: null,
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  appendToLastAssistant: (token) =>
    set((s) => {
      const msgs = [...s.messages];
      if (msgs.length > 0 && msgs[msgs.length - 1].role === "assistant") {
        msgs[msgs.length - 1] = {
          ...msgs[msgs.length - 1],
          content: msgs[msgs.length - 1].content + token,
        };
      } else {
        msgs.push({ role: "assistant", content: token });
      }
      return { messages: msgs };
    }),
  setStreaming: (v) => set({ isStreaming: v }),
  setActiveSession: (id) => set({ activeSessionId: id }),
  clearMessages: () => set({ messages: [] }),
}));
