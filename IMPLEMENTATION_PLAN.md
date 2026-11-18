# Nahdi V3 — Implementation Plan

**Status:** Implementation complete · UI polish pass live-verified 2026-11-13

**App root:** `Nahdi-v3/` (independent frontend; parent demo untouched)
**Visual spec:** `nahdi-idrak-demo.html` (served/compared during polish)
**Functional spec:** `Nahdi-x-IDRAK-Build-Guide-for-Amir.docx` + `PROJECT_DISCOVERY.md`

---

## Progress

| Phase | Description | Status |
| --- | --- | --- |
| 0 | Discover existing app & integrations | **Complete** — `PROJECT_DISCOVERY.md` |
| 1 | Study HTML/DOCX & architecture plan | **Complete** — this document |
| 2 | Storefront pages (Home → Cart) | **Complete (honest scope)** — routes + Nahdi-style chrome; verified `/pdp/` seeds; preview enrichment; Skin Scan SAMPLE-only; checkout presentation only |
| 3 | Unified Layla panel (chat + voice + mini-player) | **Complete (honest scope)** — 430px panel, welcome, messages, composer, quick actions, LiveKit VoiceStage, mini-player, ribbon on AI-driven nav |
| 4 | Real IDRAK integration layer | **Complete (honest scope)** — chat/voice/preview contracts reused; no fake answers; structured tools still absent upstream |
| 5 | EN / AR i18n + RTL | **Complete (honest scope)** — dictionaries + dir/lang; voice language passthrough awaits optional parent proxy change |
| 6 | Watch Live Demo (real agent replies) | **Complete (honest scope)** — customer script + live IDRAK replies; presentation nav helpers labeled |
| 7 | QA, docs, run/deploy instructions | **Complete** — `README.md`, `VERIFICATION.md`; build verified |
| 8 | Visual polish vs HTML + real Nahdi assets | **Complete** — softer cards/home; category chips + left filters (Skin type / Brand / Price); solid white Layla FAB + mic; local Nahdi PDP images under `public/images/products/` via `scripts/download-nahdi-images.mjs` + `src/data/productAssets.json`; chat re-tested live |

_Features are marked complete only when behaviour works against real APIs, not when UI shells exist._

### Phase 8 notes (Build Guide alignment)

- **Look:** Match HTML tokens (`#2c6ba4`, `#f4f8fa`, soft borders, white product cards). FAB matches `.lfab` (solid white pill, green ring, gradient mic).
- **Layla panel:** Welcome photo top-center; soft EN/AR; compact Talk/Scan; quick-action then suggestion scroll rows; short composer; cam/send colored; mic orb outside; pharmacist footer one line. Responsive: 430px desktop / full-width mobile (Build Guide).
- **Hero2:** Full-bleed carousel matching HTML slide copy/order/art (discount slides + Meet Layla avatar).
- **Catalogue images:** Real `ecombe.nahdionline.com` photos downloaded locally — no drawn bottles for storefront rails/circles/promos.
- **Category filters:** Same structure as HTML `renderCategory` — concern chips + sticky `.side` filters on desktop.
- **Still upstream-blocked:** structured tool-calling page open, Vision skin scores, neural Arabic voice dialect passthrough without parent proxy change.

---

## Application architecture

```
Nahdi-v3/
  index.html
  package.json                 # independent Vite app
  vite.config.ts               # envDir: '..' + import parent idrakProxyPlugin
  src/
    app/                       # providers, router shell
    pages/                     # Home, Category, Product, Routine, SkinScan, Cart
    components/
      storefront/              # header, footer, rails, banners, filters
      products/                # ProductCard, price, rating
      layla/                   # panel, messages, welcome, composer, mini-player
      voice/                   # voice stage, waveform, captions (state-driven)
      skin-scan/               # intro / scanning / results (honest capability gates)
      shared/                  # ribbon, toast, buttons, layout
    hooks/                     # useLaylaSession, useCart, useLocale, useDemo
    services/                  # chatApi, voiceClient, session, productPreview
    state/                     # React context (cart, nav, layla, locale)
    locales/                   # en.ts, ar.ts
    styles/                    # design tokens + Tailwind theme
    lib/                       # parsers, actions mapper, url helpers
  public/                      # layla portrait, sample scan image, icons
```

### Framework decisions

| Decision | Choice | Why |
| --- | --- | --- |
| Framework | React 19 + Vite 8 + TS | Match parent stack; reuse LiveKit/clients |
| Styling | Tailwind 4 + CSS variables | Match concept tokens; avoid new CSS libs |
| Routing | `react-router-dom` | Multi-page storefront; keep conversation mounted |
| State | React Context + hooks | No Redux/Zustand unless proven needed |
| Motion | Framer Motion (selective) | Panel / ribbon / voice rings |
| Proxy | Import `../server/vite-plugin` | Real IDRAK without copying secrets or rewriting backend |

### Separation of concerns

1. **UI** — presentational storefront + Layla chrome
2. **App state** — cart, route, locale, ribbons, picks
3. **Backend communication** — `services/chatApi`, `productPreview`
4. **Voice** — `LiveKitVoiceClient` + session hook
5. **Product data** — agent products + PDP preview enrichment only
6. **Navigation/actions** — explicit mapper; never invent unsupported tools
7. **Localization** — dictionaries + `dir`/`lang` on `<html>`

---

## Component hierarchy (target)

```
AppProviders (Locale, Cart, Layla)
 └ AppShell
     ├ StorefrontHeader
     ├ SubNav
     ├ MainOutlet
     │   ├ HomePage
     │   ├ CategoryPage
     │   ├ ProductPage
     │   ├ RoutinePage
     │   ├ SkinScanPage
     │   └ CartPage
     ├ StorefrontFooter
     ├ LaylaPanel (persistent)
     │   ├ Header / LangToggle
     │   ├ VoiceStage (conditional)
     │   ├ MessageList
     │   ├ QuickActions + Suggestions
     │   └ Composer (cam / text / mic)
     ├ LaylaMiniPlayer (mobile + voice + navigated)
     └ WatchLiveDemoButton
```

---

## State management strategy

| Store | Owns |
| --- | --- |
| `LocaleContext` | `en` \| `ar`, `dir`, dictionary lookup; **does not** reset session |
| `CartContext` | line items keyed by product URL/id, qty, subtotal helpers |
| `LaylaContext` / `useLaylaSession` | messages, send lock, voice state, transcripts, last products, interrupted flag |
| `NavContext` (light) | last AI-opened page ribbon, Layla picks for category highlight |
| Page-local state | filters, scan UI phase, carousel index |

Session identity continues via existing `sessionStorage` helpers (ported).

---

## API integration strategy

### Layer

`src/services/` mirrors proven contracts:

- `checkAssistantAvailability`
- `sendChatMessage({ question, session_id, temperature })`
- `startVoiceSession({ user_id, session_id, voice_id, language? })`
- `fetchProductPreview(nahdiPdpUrl)`

### Action mapper (`lib/agentActions.ts`)

Given **current** proxy responses (answer + products only):

| Frontend intent | Trigger | Behaviour |
| --- | --- | --- |
| Show products | `products[]` / parsed links | Render cards; store as `lastRecommendations` |
| Open product page | User tap on card **or** demo/UI handler with known URL | Navigate + ribbon |
| Add to cart | User tap / quick action with known product | Local cart |
| Open skin scan | Quick action / user request handled in UI | Navigate to `/skin-scan` |
| Build routine | UI builds routine from last recommendations + concern | Navigate to `/routine` |
| Checkout | Navigate to `/cart` | Presentation only |
| Structured tools | **Not available** | Do not fake; document gap |

If/when backend adds tool payloads, extend the mapper to prefer structured actions over heuristics.

### Honesty rules

- No hardcoded Layla answers.
- No mock products silently substituting failed API calls.
- Skin scan results labeled sample/unavailable until a real analysis API exists.
- Checkout never claims order placed.

---

## Chat and voice integration

- **One** `useLaylaSession` hook (ported/adapted from `useChatSession`).
- Text and voice share the same panel and message timeline where feasible:
  - Text messages stay in `messages[]`
  - Voice captions stay live in the voice stage; final user/assistant lines can be appended carefully without duplicating product-lookup prose
- Voice UI states drive animations only — never CSS-only “connected” theatre.
- Mobile: on AI navigation while voice active → collapse to mini-player (portrait, state, caption, expand, end).
- Interruption: rely on LiveKit barge-in; show “Interrupted” badge when user speech detected during `speaking`.

---

## Product data flow

1. Agent returns products (URLs preferably Nahdi `/pdp/`).
2. Enrich missing images/prices via `/api/assistant/product-preview`.
3. Storefront seed rails: start with **empty or agent-fed** collections; optionally a curated allowlist of **verified** PDP URLs (documented) fetched at runtime — never the HTML fictional catalogue.
4. PDP page renders enriched product + “Why Layla picked this” from last assistant context when available.

---

## Navigation / action architecture

- React Router routes: `/`, `/c/:slug`, `/p/:productKey`, `/routine`, `/skin-scan`, `/cart`
- `openByLayla(route)` sets ribbon + optional mini-player collapse
- Product key prefers stable URL slug/hash of PDP URL

---

## Arabic / English localization

- Dictionaries ported from HTML `T.en` / `T.ar` (storefront + assistant chrome)
- `document.documentElement.lang` + `dir`
- Fonts: Montserrat (EN), Almarai (AR)
- Language toggle in header + Layla panel; **preserve** conversation + cart
- Voice: request Arabic mode when locale is `ar` (works fully after optional parent proxy change documented in discovery)

---

## Responsive behaviour

| Breakpoint | Behaviour |
| --- | --- |
| ≥1200 / 1440 reference | Storefront + 430px Layla panel (`margin-inline-end`) |
| ≤900 / 390 reference | Full-screen Layla; mini-player when navigating in voice; stacked grids |

Acceptance: no horizontal overflow; images constrained; safe-area for mobile composer.

---

## Testing strategy

1. Manual demo journey EN + AR (Build Guide script) against live proxy.
2. Chat-only path; voice-only path; combined path.
3. Interrupt while speaking; navigate during voice; mini-player expand/end.
4. Product cards only with real URLs; preview failure shows graceful empty image.
5. Skin scan: camera permission deny → upload; sample path clearly labeled.
6. Regression: parent root demo still builds (`npm run build` at repo root) without V3 changes.

---

## Implementation phases and dependencies

```
Phase 2 Storefront  ──┐
                      ├── Phase 3 Layla shell (UI) ── Phase 4 Wire real APIs
Phase 5 i18n (parallel early; dictionaries first)
Phase 6 Demo runner (needs 3+4)
Phase 7 QA + delivery docs
```

### Phase 2 — Storefront

Scaffold Vite app; design tokens; Header/SubNav/Footer; Home sections; Category/Product/Routine/SkinScan/Cart page shells with local cart.

### Phase 3 — Layla unified UX

Panel, welcome, messages, product cards chrome, voice stage visuals, composer, mobile mini-player, interrupted badge — wired to session hook stubs then real hook.

### Phase 4 — Real AI

Port services + `useLaylaSession`; connect send/voice; product preview; action indicators for navigations that actually occur; error/loading states.

### Phase 5 — i18n

Complete AR strings + RTL polish; verify language switch mid-conversation.

### Phase 6 — Watch Live Demo

Customer-side scripted turns; real agent responses; EN/AR scripts; stop control; presentation vs transaction labeling.

### Phase 7 — Quality & delivery

Responsive QA; `README` in `Nahdi-v3/` with run/deploy side-by-side instructions; limitations list; verification report.

---

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Agent does not open pages autonomously | UI still navigates from cards/quick actions; ribbon only on real nav; document missing tools |
| No catalogue for Home rails | Agent-driven + curated verified PDP allowlist; no fake bottles |
| No vision API | Skin scan UX + disclaimer; sample results labeled; no silent fake “AI” |
| Arabic voice language stuck on EN | Optional parent one-line passthrough; text RTL still ships |
| Scope explosion | Ship vertical slice: Home + Layla chat + product cards + cart, then deepen pages |

---

## Definition of done (release)

- [ ] Visual parity with HTML concept at 1440 / 390 (storefront + Layla)
- [ ] Real IDRAK chat responses with product cards
- [ ] Real LiveKit voice with state-driven UI
- [ ] EN + AR RTL
- [ ] Local cart + routine/scan pages without false claims
- [ ] Watch Live Demo uses real agent replies
- [ ] Parent demo unchanged and still runnable
- [ ] Docs: how to run V3, limitations, backend gaps

---

## Immediate next engineering steps

1. Scaffold `Nahdi-v3` Vite React TS app with Tailwind 4 and parent proxy import.
2. Establish design tokens + App shell + router.
3. Port integration services and session hook.
4. Build Home + Layla panel vertical slice end-to-end against real chat.
