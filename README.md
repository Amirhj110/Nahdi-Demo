# Nahdi Demo V2

The current Nahdi skincare storefront demo, built with React, TypeScript, and Vite. It includes the Layla assistant, chat and browser-based voice turns, product browsing, and English/Arabic layouts.

## Requirements

- Node.js `^20.19.0` or `>=22.12.0`
- npm

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173/.

Copy `.env.example` to `.env` to enable the server-side IDRAK chat and voice integrations. Keep credentials server-side; do not use a `VITE_` prefix for secrets.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server on port 5173 |
| `npm run build` | Type-check and create the production build in `dist/` |
| `npm run preview` | Preview the production build on port 4173 |
| `npm test` | Run the server-side test suite |

## Integration notes

- Voice uses browser VAD and recorded turns: `/api/assistant/stt` transcribes each turn, the existing chat API generates Layla's response, and `/api/assistant/tts` speaks that same response. Voice captions are displayed in the voice stage rather than duplicated in the message list.
- All non-presentation text and voice turns, including scan follow-up and action requests, use the configured assistant proxy. Failures are shown in chat; no local skincare answer is substituted. UI actions are executed locally only for navigation/cart presentation and are not transactions.
- “Watch live demo” is an isolated scripted presentation: canned sample turns and sample catalogue cards, no chat/KB requests, no microphone/VAD, and no real scan or checkout. Its temporary presentation cart does not overwrite the saved cart and is removed when the demo stops or finishes.
- Chat, speech, optional realtime-token, and product-preview endpoints are served by the local `/api/assistant/*` proxy. Keep all provider credentials server-side.
- Catalogue seed tiles are storefront presentation data. Agent links must be secure Nahdi `/pdp/` URLs; images, current prices, and ratings are enriched from the live PDP preview. Routine and scan recommendations are not replaced with catalogue defaults. Cart and checkout remain presentation-only.
- A non-demo scan sends the selected image to the configured DermIQ/Google Vision provider. Set `DERMIQ_API_KEY` and/or `GEMINI_VISION_API_KEY` server-side; do not test with a real person's face unless separately authorized.
- `IDRAK_BASE_URL`, `IDRAK_AGENT_KEY` (or `IDRAK_CHAT_API_KEY`), `IDRAK_API_KEY`, `REALTIME_TOKEN_API_KEY`, `VOICE_TOKEN_BASE_URL`, `DERMIQ_API_KEY`, and `GEMINI_VISION_API_KEY` are server-only settings.

### Chat/knowledge-base integration

Normal text and voice turns search `https://knowledge.bilyticaglobal.com/search` with the skincare KB identifier `nahdi_skin_care_products`, then pass bounded retrieved evidence to `POST {IDRAK_BASE_URL}/api/public/agents/ask` using the public agent key as a Bearer token. The app does not call Ask if retrieval fails or yields no text evidence, and it only returns product URLs found in retrieved records that validate as secure Nahdi `/pdp/` links. Demo turns remain local.

The Ask request is capped below its documented 4,000-character limit, retaining the newest user turn and verified product URLs. `IDRAK_AGENT_KEY` is preferred; `IDRAK_CHAT_API_KEY` is retained as a fallback for existing deployments.
