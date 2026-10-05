// Nahdi Beauty AI Agent Deployment Service
export const AGENT_API_KEY = "key_1791181897950_cv4upj";
export const TEXT_AGENT_URL = "https://idrak.bilyticaglobal.com/api/public/agents/ask";
export const VOICE_AGENT_ID = "agt-1791181897950-mxc20l";
export const VOICE_SESSION_URL = `https://idrak.bilyticaglobal.com/api/public/agents/${VOICE_AGENT_ID}/voice/session`;

const TEXT_STORAGE_KEY = "nahdi:beauty:session:text";
const USER_ID_KEY = "nahdi:beauty:user:id";

export function getOrCreateUserId(): string {
  if (typeof window === "undefined") return "visitor-abc123";
  let userId = localStorage.getItem(USER_ID_KEY);
  if (!userId) {
    userId = "visitor-" + Math.random().toString(36).slice(2, 10);
    localStorage.setItem(USER_ID_KEY, userId);
  }
  return userId;
}

export function getOrCreateTextSessionId(): string {
  if (typeof window === "undefined") return "visitor-abc123";
  let sessionId = localStorage.getItem(TEXT_STORAGE_KEY);
  if (!sessionId) {
    sessionId = "visitor-" + Math.random().toString(36).slice(2, 10);
    localStorage.setItem(TEXT_STORAGE_KEY, sessionId);
  }
  return sessionId;
}

export function resetTextSessionId(): string {
  if (typeof window === "undefined") return "visitor-abc123";
  const newSessionId = "visitor-" + Math.random().toString(36).slice(2, 10);
  localStorage.setItem(TEXT_STORAGE_KEY, newSessionId);
  return newSessionId;
}

// Text Deployment Contract
export async function sendTextQuestion(questionText: string, customSessionId?: string): Promise<string> {
  const sessionId = customSessionId || getOrCreateTextSessionId();

  const res = await fetch(TEXT_AGENT_URL, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "Authorization": `Bearer ${AGENT_API_KEY}`
    },
    body: JSON.stringify({
      question: questionText,
      session_id: sessionId,
      temperature: 0.7
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || data?.message || "Failed to reach AI agent");
  }

  const rawAnswer = data.answer ?? data.response ?? data;
  if (typeof rawAnswer === "string") return rawAnswer;
  if (typeof rawAnswer === "object" && rawAnswer !== null) {
    return rawAnswer.answer || rawAnswer.response || JSON.stringify(rawAnswer);
  }
  return String(rawAnswer || "No response received.");
}

// Voice Session Deployment Contract
export interface VoiceSessionResponse {
  success: boolean;
  agent_id: string;
  session_id: string;
  voice: {
    url: string;
    token: string;
    room_name?: string;
    participant_identity?: string;
    language_mode?: string;
  };
}

export async function createVoiceSession(languageMode: string = "en"): Promise<VoiceSessionResponse> {
  const userId = getOrCreateUserId();
  const voiceSessionId = "voice-" + Math.random().toString(36).slice(2, 10);

  const res = await fetch(VOICE_SESSION_URL, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "Authorization": `Bearer ${AGENT_API_KEY}`
    },
    body: JSON.stringify({
      agentId: VOICE_AGENT_ID,
      user_id: userId,
      session_id: voiceSessionId,
      language_mode: languageMode,
      dialect: "en_us",
      voice_id: "female_01"
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.voice) {
    throw new Error(data?.error || data?.message || "Failed to initialize voice session");
  }

  return data as VoiceSessionResponse;
}
