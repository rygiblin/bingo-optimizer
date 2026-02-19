# CHECKPOINT: Vercel Deployment & Wiki Enrichment Live
**Date:** February 18, 2026
**Branch:** main
**Status:** Fully deployed to Vercel ✅
**Live URL:** https://bingo-optimizer.vercel.app

---

## What Was Done This Session

### 1. Vercel Deployment Setup
- Created `/api/enrich.js` — a Vercel serverless function that keeps `ANTHROPIC_API_KEY` server-side
- Replaced the Express proxy (`server/enrich-proxy.js`) with this serverless function; Express server is now unused but left in repo for reference
- The frontend's existing `fetch('/api/enrich', ...)` call works unchanged — Vercel auto-routes `/api/*` to serverless functions
- Added `vercel.json` (currently `{}`) — Vercel's Vite preset handles SPA routing automatically
- Removed Vite dev proxy from `vite.config.js` — `vercel dev` handles `/api` routing internally, proxy caused circular request loop

### 2. Persistence: window.storage → localStorage
- `window.storage` is a claude.ai artifact-only API — doesn't exist in real browsers
- Replaced all 4 usages with `localStorage` (synchronous, standard browser API):
  - Load on mount: `Object.keys(localStorage).filter(k => k.startsWith('wiki:'))`
  - Save: `localStorage.setItem('wiki:taskId', JSON.stringify(enriched))`
  - Clear all: `.filter(...).forEach(k => localStorage.removeItem(k))`
  - Force refresh: `localStorage.removeItem('wiki:taskId')`
- Wiki enrichment data now persists across page refreshes in any browser

### 3. Environment Variable Setup
- `ANTHROPIC_API_KEY` registered in Vercel project via `vercel env add` (Production + Preview + Development)
- Pulled to local `.env.local` via `vercel env pull`
- Local dev workflow: `vercel dev` (not `npm run dev`) — runs frontend + API on port 3000 together

### 4. Bug Fix: Enriched Hours Not Updating
**Root cause:** When the API returned `null` for `estHours`, React controlled inputs silently ignored the null value, making it appear the hours never changed.
- Added validation in `enrichTask` (App.jsx): if `result.estHours` is not a valid positive number, return null and leave state untouched
- Added matching validation in `api/enrich.js`: if model output lacks a valid `estHours`, return HTTP 502 instead of a silent bad result
- Added `console.log('[enrich] raw result', ...)` in App.jsx for easier debugging

### 5. Model Upgrade: Haiku → Sonnet
- Haiku lacks reliable OSRS-specific knowledge (drop rates, KC/hr, specific bosses)
- Changed default model in `api/enrich.js` to `claude-sonnet-4-6`
- Can be overridden via `ANTHROPIC_MODEL` environment variable

### 6. Prompt Improvements
- Removed "Current estimate: Xh" from prompt — was anchoring the model toward returning the same hard-coded value
- Restructured prompt with clear rules per task type (drop / kc / points / challenge)
- Baked in CoX/ToB/ToA specific rates that Sonnet should know
- Kept `"Respond with ONLY this JSON"` instruction with inline format example

---

## Current File Structure

```
bingo-optimizer/
  api/
    enrich.js              ← Vercel serverless function (POST /api/enrich)
  src/
    App.jsx                ← Main app (1480+ lines), all wiki enrichment wired up
  server/
    enrich-proxy.js        ← Legacy Express proxy (unused, kept for reference)
  context/
    CHECKPOINT_VERCEL_DEPLOYMENT.md     ← This file
    CHECKPOINT_BEFORE_WIKI_ENRICHMENT.md
    SCORING_FIX_CHECKPOINT.md
    bingo-optimizer-WITH-WIKI-ENRICHMENT.jsx  ← Reference copy
  .env.local               ← Gitignored — contains ANTHROPIC_API_KEY locally
  vercel.json              ← Empty {} — framework preset handles routing
  vite.config.js           ← No proxy; comment explains vercel dev workflow
```

---

## Git Commits This Session (on main)

| Hash | Message |
|---|---|
| `b98d6fb` | Fix enrich: validate estHours, upgrade to Sonnet, improve prompt |
| `84ca721` | Wire up Vercel deployment: serverless API route, localStorage persistence |

---

## Local Dev Workflow

```bash
# One-time setup
npm i -g vercel
vercel link
vercel env pull .env.local

# Every session
vercel dev        # runs at http://localhost:3000
                  # frontend + /api/enrich both served on same port
```

---

## Deployment

```bash
vercel --prod     # builds and deploys to https://bingo-optimizer.vercel.app
```

Vercel auto-deploys can also be enabled by connecting the GitHub repo in the Vercel dashboard (Settings → Git).

---

## Known Limitations / Future Work

- **API accuracy**: Model uses training data (cutoff Aug 2025), not live OSRS wiki. Values should be sanity-checked, especially for recent content.
- **No auto-deploy**: Currently manual `vercel --prod` required. Can enable GitHub integration in Vercel dashboard.
- **server/ folder**: Legacy Express proxy still in repo — can be deleted if desired.
- **context/ folder**: Planning docs and reference JSX still in repo — fine to keep or clean up.
- **Enrich All throttle**: 300ms delay between tasks to avoid rate limiting. Could be tuned.

---

## What's Working ✅

1. App loads at https://bingo-optimizer.vercel.app
2. All scoring (task pts + bronze/silver/gold bingo bonuses) correct
3. Wiki enrichment buttons call live Anthropic API (Sonnet)
4. Enriched hours update in the task editor input
5. Wiki data (hours, drop rate, KC/hr, notes) persists in localStorage across refresh
6. Force refresh (↻ button) clears cache and re-calls API
7. Enrich All button in roster panel enriches all unenriched tasks sequentially
8. Progress bar shows during Enrich All
