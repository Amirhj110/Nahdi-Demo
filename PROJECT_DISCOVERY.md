# Nahdi V3 — Project Discovery

**Date:** 2026-11-13
**Scope:** Inspect existing Nahdi/IDRAK demo and map reusable integrations for a new frontend in `Nahdi-v3/`.
**Constraint:** No modifications outside `Nahdi-v3/` unless a dependency is documented first.

---

## 1. Existing architecture

### Stack (verified from `package.json` / entrypoints)

| Layer | Choice |
| --- | --- |
| UI | React **19.2.8** + React DOM |
| Build | Vite **8.3.0** |
| Language | TypeScript (~6) |
| Styling | Tailwind CSS **4.3.3** (`@tailwindcss/vite`) |
| Motion | Framer Motion **14** |
| Voice transport | `livekit-client` **2.22.3** |
| Icons | Lucide React |
| Lint | Oxlint |

### Application shape

- **Entry:** `src/main.tsx` → `src/App.tsx`
- **UI:** Single-page luxury skincare landing (cream/navy/coral aesthetic — **not** Nahdi Online chrome)
- **Assistant:** Floating widget (`AIChatWidget`) over the page; panel open/close via `AssistantContext`
- **Routing:** None — no React Router; marketing sections only (`Hero`, `Categories`, `AIAdvisor`, `Concerns`, `FAQ`, `Footer`)
- **Server:** Vite middleware plugin (`server/vite-plugin.ts`) mounts a secure IDRAK proxy (`server/idrak-proxy.ts`). Secrets stay server-side (no `VITE_` API keys).

### Deployed demo

- Live host referenced in README / ops: `https://nahdi-chat-v2.bilyticaglobal.com/`
- Local: `npm run dev` → `http://localhost:5173/`

---

## 2. Existing working integrations

### Chat (text)

1. Browser → `POST /api/assistant/chat`
2. Proxy searches the Nahdi skincare knowledge base before calling `POST {IDRAK_BASE_URL}/api/public/agents/ask` with `Authorization: Bearer {IDRAK_AGENT_KEY}`
3. Proxy normalizes answer + product links → browser

**Request (browser → proxy):**

```json
{ "question": "string", "session_id": "string", "language": "en" }
```

The upstream Ask request uses `question`, `session_id`, and `temperature`. `question` contains the user turn and bounded retrieved KB evidence; no request is sent if KB retrieval fails or returns no evidence.

**Success response (proxy → browser):**

```json
{
  "ok": true,
  "answer": "string",
  "session_id": "string",
  "products": [
    {
      "name": "string",
      "url": "https://...",
      "imageUrl": "https://...",
      "price": "SAR 89",
      "rating": "4.7",
      "ratingCount": "1234"
    }
  ]
}
```

**Notes**

- Chat returns a **completed JSON** body. There is **no token streaming** today.
- `history` is accepted in the frontend payload type but **not sent** to the proxy; session continuity is via `session_id` only.
- Product lists are extracted server-side (`server/parse-idrak.ts`) from nested JSON and/or markdown/URLs inside the answer text.

### Health

- `GET /api/assistant/health` → `{ ok, configured }` based on chat key + base URL.

### Product preview (Nahdi PDP scrape)

- `GET /api/assistant/product-preview?url=<encoded Nahdi PDP URL>`
- Only `https://*.nahdionline.com` URLs containing `/pdp/` are allowed.
- Returns `image_url`, `price`, `rating`, `rating_count` when found (OG image + HTML metadata).
- Used by `ProductCard` when the agent omits an image URL.

### Voice (LiveKit realtime)

1. Browser → `POST /api/assistant/voice/session` with `{ user_id, session_id, voice_id }`
2. Proxy → `POST {VOICE_TOKEN_BASE_URL}/realtime/token` with `x-api-key`
3. Browser receives LiveKit `{ url, token, room_name, ... }`
4. `LiveKitVoiceClient` connects, publishes mic, plays remote audio, surfaces transcriptions + speaking state

**Verified voice_id values:** `female_01` | `male_01`
**Knowledgebase sent upstream:** `"nahdi"`
**Language currently hard-coded in proxy body:** `language_mode: "en"`, `arabic_dialect: "none"`

### Session identity

- `sessionStorage` keys: `idrak_skincare_visitor_id`, `idrak_skincare_session_id`
- Chat uses `visitorId`; voice uses separate `voiceSessionId` (`voice-<stamp>`)
- Reset regenerates both IDs and clears messages / disconnects voice

---

## 3. Existing API contracts (summary)

| Endpoint | Method | Upstream | Purpose |
| --- | --- | --- | --- |
| `/api/assistant/health` | GET | local | Config check |
| `/api/assistant/chat` | POST | Nahdi KB search, then `{IDRAK_BASE_URL}/api/public/agents/ask` | KB-grounded text Q&A + product extraction |
| `/api/assistant/voice/session` | POST | `VOICE_TOKEN_BASE_URL/realtime/token` | LiveKit token mint |
| `/api/assistant/product-preview` | GET | Nahdi PDP HTML | Image/price/rating enrichment |

### Environment (server-only)

From `.env.example` / live `.env` key names (values not documented here):

- `IDRAK_BASE_URL` (default `https://idrak.bilyticaglobal.com`)
- `IDRAK_AGENT_KEY` (preferred public agent Bearer key)
- `IDRAK_CHAT_API_KEY` / `IDRAK_API_KEY` (compatibility fallbacks)
- `IDRAK_ALLOWED_ORIGINS`
- `REALTIME_TOKEN_API_KEY` / `VOICE_SERVER_API_KEY`
- `VOICE_TOKEN_BASE_URL` / `VOICE_SERVER_BASE_URL` (default `https://voice-realtime.bilyticaglobal.com`)
- Legacy unused by current flow: `IDRAK_AGENT_ID`, `IDRAK_AGENT_KEY`

### What is **not** present in verified contracts

- No structured tool-call / action array (`search_products`, `open_page`, `add_to_cart`, …)
- No skin-scan / vision analysis endpoint
- No product catalogue / PLP listing API
- No cart persistence or checkout API
- No pharmacist handoff API
- No chat SSE/WebSocket streaming

The Build Guide’s tool list is the **target product vision**. The **current demo proxy** only exposes chat answer + extracted products + voice session + PDP preview.

---

## 4. Existing voice architecture

```
useChatSession.beginVoiceCall
  → startVoiceSession(voiceId)
  → LiveKitVoiceClient.connect(livekit)
       ├ mic capture + publish
       ├ remote audio attach + analyser
       ├ RoomEvent.TranscriptionReceived → voiceTranscript
       └ ActiveSpeakers / analyser → VoiceUiState
```

**UI states:** `ready | connecting | connected | listening | speaking | muted | disconnected | error`

**Barge-in:** Handled by LiveKit/server VAD + client listening resume after remote speech ends — **not** browser `SpeechRecognition` / `speechSynthesis`.

**Voice → products:** After a final user + assistant transcript pair, an isolated chat request asks the agent for catalogue links matching names mentioned in the spoken reply. Prose from that lookup is not shown as a chat message.

**Avatar:** `TalkingAdvisorAvatar` — SVG illustrated face with blink / mouth animation driven by speaking/listening flags. No HeyGen/D-ID. No photographic Layla asset in the current React app (the HTML concept embeds a base64 portrait).

---

## 5. Reusable code and dependencies

Safe to **reuse by import/copy into `Nahdi-v3/`** (patterns & logic; re-skin UI):

| Module | Reuse value |
| --- | --- |
| `src/services/chatApi.ts` | Exact browser↔proxy contracts |
| `src/services/voiceClient.ts` | LiveKit connect / mute / transcription |
| `src/services/session.ts` | Visitor/session IDs |
| `src/hooks/useChatSession.ts` | Unified text+voice session orchestration |
| `src/lib/formatAssistantMessage.ts` | Markdown/product parsing |
| `src/lib/voiceTranscript.ts` | Utterance finalization helpers |
| `src/types/chat.ts` | Shared types |
| `src/components/assistant/ProductCard.tsx` | Preview fetch + card rendering (restyle) |
| `server/*` via parent import | Same proxy without rewriting backend |

**Do not reuse as product UX:** current cream/luxury landing components, keyword-free but visually non-Nahdi panel chrome, SVG avatar as the only Layla face (optional keep as fallback).

**HTML concept (`nahdi-idrak-demo.html`) — visual/spec only:**

- Design tokens, page layouts, EN/AR copy, agent panel chrome, mini-player, demo script
- **Reject for production:** keyword `ask()` brain, fictional `P[]` catalogue, SVG bottle art as “real products”, browser STT/TTS, canvas pixel `analyzeImg` presented as IDRAK Vision, simulated cart checkout completion

---

## 6. Important limitations

1. **Agent actions are not structured.** Frontend cannot execute `open_page` / `add_to_cart` from a verified tool payload today. Navigation must be driven by:
   - Explicit user UI actions, and/or
   - Heuristic mapping only where we transparently label UI-driven demo behaviour, and/or
   - Future backend tool-calling (requires backend change — out of scope unless approved)
2. **Arabic voice language** is hard-coded `language_mode: "en"` inside **parent** `server/idrak-proxy.ts`. Full Saudi Arabic voice requires a **minimal parent change** (pass language from request body) — see §7.
3. **No real skin analysis service** in this repo. Skin Scan UI must distinguish presentation / sample UI from verified analysis; never present pixel heuristics as medical/AI scores.
4. **No full Nahdi catalogue API.** Storefront product rails must be populated from:
   - Agent-returned products (real URLs), and/or
   - Curated lists of **verified** Nahdi `/pdp/` URLs enriched via `product-preview`, and/or
   - Empty/loading states when data is unavailable
   Invented prices/images are forbidden.
5. **Cart/checkout** are client-side presentation only. Do not claim order completion.
6. **Chat/voice session IDs are separate** in the current design. V3 should keep one conversation UX while preserving the working ID contracts unless backend later unifies them.
7. **Closing the assistant currently hangs up voice** in the old widget — V3 mini-player must keep the call alive across navigation.

---

## 7. Integration strategy for V3

### Placement

- New independent Vite + React app under `Nahdi-v3/` (folder already present; references copied here).
- Parent demo at repo root remains untouched and deployable as today.

### Backend reuse (no parent edits required for chat/voice/preview)

**Preferred approach:**

1. `Nahdi-v3/vite.config.ts` sets `envDir: '..'` to load the existing root `.env`.
2. Import and register `idrakProxyPlugin` from `../server/vite-plugin.ts` so `/api/assistant/*` behaves identically.
3. Port browser clients (`chatApi`, `voiceClient`, `session`, parsers, `useChatSession`) into `Nahdi-v3/src` as a clean integration layer (copy, not live symlink) so V3 can evolve UI without breaking the old demo.

This reuses contracts without modifying endpoints, keys, or LiveKit flow.

### Documented optional parent change (Arabic voice)

| Need | Why parent file | Proposed minimal change |
| --- | --- | --- |
| Arabic LiveKit language | `server/idrak-proxy.ts` hardcodes `language_mode: 'en'` | Accept optional `language_mode` / `arabic_dialect` on `POST /api/assistant/voice/session` and forward them; default remains `en` for backward compatibility |

**Status:** Not applied. V3 will send the fields; until the parent accepts them, Arabic UI works for text while voice may remain English-configured.

### Action / navigation architecture (given current APIs)

| Capability | Strategy |
| --- | --- |
| Show recommendations | Render `products[]` + parsed links from answer |
| Open product | Navigate in-app when user taps a card / verified URL; show “Layla opened…” only when navigation is initiated from assistant flow |
| Cart | Local React state; assistant can instruct “add” via UI handlers when product id/url is known from last recommendations |
| Routine / Skin Scan pages | Frontend routes/pages; content from last agent products + local routine builder UI |
| Skin analysis scores | UI shell + disclaimer; real scores only if/when a verified analysis API exists |
| Watch Live Demo | Scripted **customer** utterances → real `sendChatMessage` / real voice session; never hardcode Layla answers |
| Checkout | Presentation only |

### Product data flow

```
Idrak answer
  → extract products (proxy + client parsers)
  → optional GET /api/assistant/product-preview
  → ProductCard / storefront rails / PDP view
  → optional local cart
```

### Avatar

- Prefer concept photographic Layla portrait (asset extracted from HTML / licensed replacement).
- Drive pulse/glow from real `VoiceUiState`.
- Keep SVG talking avatar as optional fallback; do not add third-party lip-sync services.

---

## 8. Reference inventory (in `Nahdi-v3/`)

| File | Role |
| --- | --- |
| `nahdi-idrak-demo.html` | Pixel / interaction / i18n visual spec |
| `Nahdi-x-IDRAK-Build-Guide-for-Amir.docx` | Functional acceptance + intended tools |
| `_docx_text.txt` | Extracted guide text for engineering reference |
| Live sites | `https://nahdi-chat-v2.bilyticaglobal.com/`, `https://www.nahdionline.com/en-sa` |

---

## 9. Discovery verdict

The existing demo’s **IDRAK chat proxy + LiveKit voice + Nahdi PDP preview** are solid and must power V3.

The HTML concept is a **complete UX blueprint** but its “AI” is simulated. V3 must rebuild that UX as a maintainable React app wired to real integrations, and honestly surface gaps (vision scan, structured tools, catalogue, Arabic voice language passthrough) rather than faking them.

**Next:** `IMPLEMENTATION_PLAN.md` → phased build inside `Nahdi-v3/` only.
