import api from "./api";
// Types used implicitly by API responses

// ---- Auth ----
export async function login(email: string, password: string) {
  const res = await api.post("/api/v1/auth/login", { email, password });
  return res.data;
}

export async function register(email: string, username: string, password: string) {
  const res = await api.post("/api/v1/auth/register", { email, username, password });
  return res.data;
}

// ---- Workspaces ----
export async function listWorkspaces() {
  const res = await api.get("/api/v1/workspaces");
  return res.data;
}

export async function createWorkspace(name: string, description?: string) {
  const res = await api.post("/api/v1/workspaces", { name, description });
  return res.data;
}

export async function deleteWorkspace(id: string) {
  await api.delete(`/api/v1/workspaces/${id}`);
}

// ---- Documents ----
export async function listDocuments(workspaceId: string) {
  const res = await api.get(`/api/v1/workspaces/${workspaceId}/documents`);
  return res.data;
}

export async function uploadDocument(workspaceId: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await api.post(
    `/api/v1/workspaces/${workspaceId}/documents/upload`,
    formData
    // axios auto-sets Content-Type with correct boundary for FormData
  );
  return res.data;
}

export async function deleteDocument(workspaceId: string, documentId: string) {
  await api.delete(`/api/v1/workspaces/${workspaceId}/documents/${documentId}`);
}

// ---- Search ----
export async function searchKnowledge(workspaceId: string, query: string, topK = 5) {
  const res = await api.post(`/api/v1/workspaces/${workspaceId}/search`, { query, top_k: topK });
  return res.data;
}

// ---- Chat Sessions ----
export async function listChatSessions(workspaceId: string) {
  const res = await api.get(`/api/v1/workspaces/${workspaceId}/chat/sessions`);
  return res.data;
}

export async function createChatSession(workspaceId: string, title = "New Chat") {
  const res = await api.post(`/api/v1/workspaces/${workspaceId}/chat/sessions`, { title });
  return res.data;
}

export async function deleteChatSession(workspaceId: string, sessionId: string) {
  await api.delete(`/api/v1/workspaces/${workspaceId}/chat/sessions/${sessionId}`);
}

export async function listMessages(workspaceId: string, sessionId: string) {
  const res = await api.get(`/api/v1/workspaces/${workspaceId}/chat/sessions/${sessionId}/messages`);
  // Backend returns array directly (not wrapped in {messages: [...]})
  return Array.isArray(res.data) ? res.data : (res.data.messages || []);
}

// ---- Chat (non-streaming, reliable JSON response) ----
export async function sendChatMessage(
  workspaceId: string,
  sessionId: string,
  message: string,
): Promise<{ reply: string; sources: unknown[] }> {
  const res = await api.post(
    `/api/v1/workspaces/${workspaceId}/chat/send`,
    { session_id: sessionId, message },
    { timeout: 120000 }  // 2 minutes for LLM
  );
  return res.data;
}
