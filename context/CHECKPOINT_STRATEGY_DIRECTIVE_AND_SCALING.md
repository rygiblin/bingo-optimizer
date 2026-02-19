# Checkpoint: Strategy Directive + Scaling/Persistence Pass

Date: 2026-02-19
Branch: `bingo-opt-codex-branch`

## What was implemented

### 1) Scaling semantics cleanup
- Tile-level `workMode` is the scaling source of truth (`solo` / `mass` / `raid`).
- Task-level type now represents estimation math (`drop`, `kc`, `xp`, `points`, `challenge`).
- Solo tasks remain raw (no team-size scaling); mass/raid tasks project with team scaling.

### 2) Persistence behavior
- Added local persistence for tile/task state and done-state.
- Startup no longer silently overwrites task hours from wiki cache.
- Editor enrich supports draft flow; saved values persist predictably after Save.

### 3) Strategy directive feature
- Added new `Strategy` tab in `src/App.jsx`.
- Deterministic brief generation from current priorities:
  - team focus
  - short-window rationale
  - avoid-now/risk hints
- Added AI-generated directive support using new API route:
  - `POST /api/strategy-message`
  - file: `api/strategy-message.js`
- Added "Copy Team Directive" output that combines:
  1. AI narrative
  2. deterministic tile brief

## AI guardrails (cost + reliability)
- Strategy API uses low-cost default model (`claude-haiku-4-5-20251001`).
- Timeout limit: 12 seconds.
- Token limit: 420 max tokens.
- Cooldown limit: 90 seconds between requests per IP.
- Input brief is trimmed to avoid oversized prompts.
- Deterministic fallback message is returned if model call fails.

## Security notes
- `ANTHROPIC_API_KEY` is only read server-side in API routes.
- Frontend does not store or expose Anthropic key values.
- `.env.local` is local-only and gitignored.

## Known limitations
- Current strategy scoring is heuristic and intentionally lightweight.
- Local `vercel dev` can fail on malformed test JSON payloads; app UI path works normally.
- TeamCompare lint warnings exist from legacy patterns unrelated to this feature.

## Next recommended build step
- Add live progress tracking for `KC` and `XP` tasks:
  - `targetAmount`
  - `currentAmount`
  - derived remaining work for better in-event strategy updates.
