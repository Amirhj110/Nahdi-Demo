# Nahdi V3 — Verification report

**Date:** 2026-11-13
**App:** `http://localhost:5174/` (`Nahdi-v3/`)
**Build:** `npm run build` — **passes** (`tsc -b && vite build`)

## Live API evidence

| Endpoint | Result |
| --- | --- |
| `GET /api/assistant/health` | `{"ok":true,"configured":true}` |
| `POST /api/assistant/chat` | Real answer + products (e.g. CeraVe dry-skin creams with `/pdp/` links) |
| `POST /api/assistant/voice/session` | LiveKit `url` + `token` returned (`voice_id: female_01`) |
| `GET /api/assistant/product-preview?url=…` | Real image + price (e.g. Avène Cold Cream **SAR 67.28**) |

## Live UI evidence

| Flow | Evidence |
| --- | --- |
| Watch Live Demo E2E | Ran to completion → `/cart` with cart badge `1`; chat showed live routine reply (“Thank you! Here is your morning and night routine”) + real picks (Christian Laurent, By Wishtrend, Vichy, Cetaphil, Avène) |
| Text chat + product cards | Agent returned real Nahdi products; cards rendered with prices when preview succeeded |
| Chat re-test (polish pass) | “My skin gets dry and tight with the AC…” → live Cetaphil / Uriage / CeraVe answer |
| PDP enrichment | `/p/100571599` showed Avène Cold Cream image + **SAR 67.28** from preview |
| Local Nahdi images | 12 PDP photos in `public/images/products/` from `ecombe.nahdionline.com` |
| Category filters | `/c/all` concern chips + left Skin type / Brand / Price filters (desktop) matching HTML |
| Solid Layla FAB | White pill + photo ring + mic orb (HTML `.lfab`) |
| Routine | `/routine` Morning/Night rails + Add full routine |
| Skin Scan honesty | SAMPLE path → “Sample skin results”; meters unavailable; disclaimer present; no fake Vision scores |
| Arabic RTL | `lang=ar` / `dir=rtl`; Arabic chrome + suggestion **بشرتي جافة** → live Arabic Nivea answer |
| Voice UI | Talk to Layla → **SECURE CALL / Connecting…** → LiveKit session active (Mute/End); mic permission is browser-gated |
| Panel layout (HTML match) | Centered Layla photo + soft EN/AR + small Talk/Scan; quick actions then suggestions (scroll rows); short input; pink cam + blue send; purple mic **orb outside** input; single-line pharmacist footer |
| Hero2 carousel | Slide order `h1 → sub → big% → CTA` (HTML); Winter 30% / Meet Layla avatar+speaking badge / Sun 40%; floating product art; arrows+dots; 330px desktop / auto mobile |
| Chat re-test (panel polish) | “I have dark spots” → Nivea Luminous 630 + card **SAR 51.52**; “Recommend a non-greasy daily SPF” → Nivea Day Fluid SPF50; earlier “My skin is dry” / “Best sunscreen?” also live |
| Mobile 390×844 | Panel full-width; composer orb outside; footer single line; quick/sugg rows scroll |
| Side-by-side | `http://localhost:5174/` vs `/ref-demo.html` + nahdionline.com header/circles/promo patterns aligned |
| Hero PNGs | All hero product art served as `.png` (JPG→transparent PNG conversion) |
| Deal of the Day | Timer countdown + % off / strike prices / ratings; red deal styling |
| Meet Layla band | Caps grid + phone mock + Call/Chat CTAs (HTML `.band`); Watch Live Demo **removed** |
| Guide §6 chat acts | Dry-skin → live Cetaphil/CeraVe + auto-open PDP + ribbon; “Add it to my cart” → cart badge; “Take me to checkout” → `/cart` |
| Suggestions | Only live-verified prompts; smaller soft chips + compact quick actions |

### Guide §6 acceptance (local)

| Item | Status |
| --- | --- |
| Desktop/mobile look | Matched concept structure (panel 430 / full mobile) |
| Arabic RTL | Supported (`dir=rtl` + AR suggestions) |
| Voice + chat one panel | Yes (LiveKit VoiceStage + chat) |
| Neural voice / barge-in | LiveKit session path verified earlier |
| Answer opens page + ribbon | Yes (auto-open first product + ribbon) |
| Skin scan | SAMPLE path (honest; Vision not wired) |
| Cart / routine / checkout | Local intents + cart page E2E |
| Watch live demo | **Removed per request** — intents hardcoded in chat |
| Hosted HTTPS | Out of scope for local demo |

## Honesty gates (still true)

- No invented offline prices — missing preview → “Price on Nahdi”
- Checkout is presentation only (no payment / no order)
- Skin Scan is SAMPLE-labelled (no Vision API)
- Agent cannot autonomously open pages via structured tools (presentation helpers used only by Watch Live Demo)

## Parent boundary

- V3 runs independently on **5174** with `envDir: '..'` and `server/v3-idrak-proxy-plugin.ts`
- Parent demo app not replaced

## Smoke checklist

1. `cd Nahdi-v3 && npm run dev`
2. Ask for dry-skin products → real answer + cards
3. Open a PDP → image/price from preview
4. Start voice → Connecting → listening/speaking (allow mic)
5. Toggle العربية → RTL; send Arabic suggestion
6. Watch Live Demo → customer lines + live network replies → cart
7. Skin Scan SAMPLE → labelled sample results only
