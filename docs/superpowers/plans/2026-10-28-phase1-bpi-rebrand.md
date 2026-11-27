# Phase 1 — BPI rebrand Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (native, inline). Steps use checkbox syntax.

**Goal:** Replace LANDBANK identity with BPI: theme, logo, loader, and the LEAF agent becomes BPI Ava.

**Architecture:** Edit the prototype source HTML (`ITPMD_Project_Hub_Prototype_LANDBANK (4).html`, kept at same path; backup `.landbank.bak` made first), patch strings/tokens in `itpm-ui/scripts/make-index.mjs`, `scripts/manual.js`, `scripts/wbs-ui.js`, `src/loader.js`, `src/app-theme.css`, then regenerate `itpm-ui/index.html` with `node scripts/make-index.mjs`. No backend change.

**Tech Stack:** vanilla prototype HTML, Vite, node:test, Python PIL for image conversion.

**Spec:** `docs/superpowers/specs/2026-10-28-bpi-rebrand-and-gap-closure-design.md` (Part 1).

## Global Constraints

- BPI Red `#B11116` (primary). Alt `#EE3224` only for small highlights/hover. Gold sampled from logo crest (about `#B89040`).
- RAG colours stay semantic (red/amber/green) and must stay distinguishable from the brand red.
- Font stays IBM Plex Sans. Light and dark mode both supported.
- Agent name "BPI Ava", tagline "AI Virtual Assistant", greeting "Hi! I'm Ava."
- Do not hand-edit generated `itpm-ui/index.html`; regenerate.

## Review Focus

- Dark mode contrast of red primary on dark panels (text on `--accent` must be white, ≥ 4.5:1).
- Brand red vs "Red" RAG pill confusion: RAG pills keep their text label.
- Sidebar logo-card: logo has a light background, must sit on the white card.
- Loader must respect `prefers-reduced-motion`.
- Existing tests still pass after the text rename (`test/index-leaf-stale.test.mjs` asserts on LEAF strings).

---

### Task 1: Assets
**Files:** Create `itpm-ui/public/bpi-logo.webp`, `itpm-ui/public/ava.webp` (hero, 420px), `itpm-ui/public/ava-avatar.webp` (face crop 160px); Delete `itpm-ui/public/landbank-logo.webp`.
- [ ] Back up prototype and index.html (`cp` to `*.landbank.bak`).
- [ ] Convert with PIL: copy logo; resize `docs/ava-ai.png` to 420 wide; crop face region (about x 150–560, y 60–470 of 1254) to 160x160 webp.
- [ ] Verify files exist and sizes < 60 KB each.

### Task 2: Theme tokens
**Files:** Modify prototype `:root`, dark `@media`, `[data-theme=dark]` blocks (lines 12–38); `src/app-theme.css` token block; `src/themes.js` comment.
- [ ] Light: `--accent:#B11116; --accent-2:#8E0D11; --accent-soft:#FBEAEA; --ring:rgba(177,17,22,.28); --brand:#B11116; --gold:#B89040; --gold-ink:#6E5316; --gold-soft:#F8F1DE; --side:#4A0A0D; --side-2:#6A1015; --side-ink:#F1D9DA; --side-mute:#C99A9C; --bg:#F6F4F4; --panel2:#FAF8F8; --line:#E8E2E2; --line2:#F0ECEC; --ink:#211A1A; --ink2:#3A2F2F; --muted:#6B6060; --faint:#968B8B`.
- [ ] Dark: `--accent:#E04A4F; --accent-ink:#1A0506; --accent-soft:#3A1416; --accent-2:#F08A8D; --brand:#E04A4F; --side:#2A0608; --side-2:#3B0B0E; --bg:#120C0C; --panel:#1C1313; --panel2:#221717; --line:#3A2A2A; --ink:#F1E8E8`.
- [ ] Gantt `--s-act` (line 237) change green to BPI gold-brown `#B89040`? Keep actual vs plan distinguishable: `--s-plan:#3A62B8; --s-act:#B11116`.
- [ ] Rewrite `app-theme.css` LANDBANK token block with equivalent shadcn-style tokens (primary `hsl(358 82% 39%)`, sidebar deep red). Update header comment.

### Task 3: Text rebrand
- [ ] Prototype + scripts: `LANDBANK · ITPMD` → `BPI · TPMO`; `LANDBANK` → `BPI`; `Land Bank` → `BPI`; `LEAF Basic/Advanced` → `Ava Basic/Advanced`; `LEAF (LANDBANK Enhanced AI Framework)` → `BPI Ava (AI Virtual Assistant)`; `LEAF` → `Ava`.
- [ ] Update `test/index-leaf-stale.test.mjs` strings accordingly; rename not required.
- [ ] Verify `grep -ri "landbank\|LEAF" scripts src index.html test` returns nothing except comments about history.

### Task 4: Logo and agent images
- [ ] Prototype line 2006: replace `ui.logo = 'data:image/png;...'` with `ui.logo = '/bpi-logo.webp'`; line 2005 `AI_IMG` → `'/ava-avatar.webp'`, `AI_HERO = '/ava.webp'`, `AI_TAG = 'your AI virtual assistant for projects, schedules and status reports'`.
- [ ] `index.html` `<title>`/favicon: `<link rel="icon" href="/bpi-logo.webp">`.
- [ ] Product lockup mark `PH` stays; subtitle `BPI · TPMO`.

### Task 5: Loader
**Files:** Modify `src/loader.js`.
- [ ] Replace leaf SVG with BPI logo `<img src="/bpi-logo.webp">` inside a spinning red ring + gold shimmer sweep; colours via `#B11116` / `#B89040`; keep `showLoader(title, sub)` / `hideLoader()` signatures; keep reduced-motion block; dark-mode block uses dark tokens.

### Task 6: Regenerate and verify
- [ ] `cd itpm-ui && node scripts/make-index.mjs` succeeds (no "anchor not found").
- [ ] `npm test` passes.
- [ ] `npm run build` passes (runs theme check).
- [ ] Visual check with dev server: portfolio, project, Ava panel, loader, dark mode screenshots.
