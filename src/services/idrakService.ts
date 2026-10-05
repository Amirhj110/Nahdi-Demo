// Exact Idrak Backend Integration Logic
export const AGENT_ID = "agt-1791178698817-zau9ve";
export const AGENT_KEY = "key_1791178698817_o0f2bx";
export const API_URL = "https://idrak.bilyticaglobal.com/api/public/agents/ask";
export const STORAGE_KEY = "idrak:session:" + AGENT_ID;

export function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "embed-default-session";
  let sessionId = localStorage.getItem(STORAGE_KEY);
  if (!sessionId) {
    sessionId = "embed-" + Math.random().toString(36).slice(2, 12);
    localStorage.setItem(STORAGE_KEY, sessionId);
  }
  return sessionId;
}

export function resetSessionId(): string {
  if (typeof window === "undefined") return "embed-default-session";
  const newSessionId = "embed-" + Math.random().toString(36).slice(2, 12);
  localStorage.setItem(STORAGE_KEY, newSessionId);
  return newSessionId;
}

export async function sendQuestionToIdrak(questionText: string, sessionIdOverride?: string): Promise<string> {
  const activeSessionId = sessionIdOverride || getOrCreateSessionId();

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Authorization": `Bearer ${AGENT_KEY}`
    },
    body: JSON.stringify({
      question: questionText,
      session_id: activeSessionId,
      temperature: 0.7
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || data.message || `Failed to reach Idrak AI (HTTP ${response.status})`);
  }

  // Return agent answer per contract
  return data.answer || data.response || data.result || "No response received";
}
