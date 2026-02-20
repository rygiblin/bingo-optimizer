# Checkpoint — UI Redesign & Scale Pass

**Date:** 2026-02-19
**Branch:** main
**Live:** https://bingo-optimizer.vercel.app

---

## What Changed

### Color Scheme — Warm Parchment
Replaced the cold navy palette with a warm dark-amber theme.

| Variable | Old | New |
|---|---|---|
| `--bg-main` | `#0b0e14` | `#1e1b12` |
| `--bg-elev-1` | `#111520` | `#28241a` |
| `--bg-elev-2` | `#151a24` | `#332e22` |
| `--text-main` | `#d3d8e1` | `#ede8d4` |
| `--text-muted` | `#8b93a7` | `#b0a888` |
| `--border-soft` | `rgba(255,255,255,0.08)` | `rgba(255,220,150,0.10)` |

### Global Scale (`src/index.css`)
```css
html { zoom: 1.5; }
```
Makes the app render at 150% by default — designed for fullscreen 1080p+ monitors. To adjust, change the zoom value (1.0 = native, 1.25 = 125%, 1.5 = 150%).

### Tab Content Scale (`src/App.css`)
```css
.tab-content { zoom: 1.1; }
```
Stacks on top of the global zoom for ~1.65x effective scale on the Scenarios / LinePlanner / WhosOnline / Strategy / All Teams tabs, making their denser content more readable.

### Header & KPI Bar
- **Title:** "BINGO OPTIMIZER" at 56px with gold gradient
- **KPI cards:** Pts · Gold/10 · Silver/10 · Bronze/10 · Rem hrs
  - Values at 34px, labels/subs at 12-13px, minWidth 110px per card
- **"Lines" box removed** — replaced with Silver bingos
- Gold display fixed to "/10" (was "/25")

### Scoring — Silver Bingo Definition
A silver bingo = a line (row or col) where every tile has ≥ 2 tasks done.
```js
const silverBingos = useMemo(() =>
  boardLines.filter(line => line.every(id => (tileTaskCounts[id] ?? 0) >= 2)).length,
  [boardLines, tileTaskCounts]
);
```

### Layout (`src/App.css`)
- 2-column grid: `1fr minmax(320px, 420px)` — board fills left, details fixed right
- Board max-width: 1060px (720px on tablet)
- Collapses to single column at ≤ 1100px

### Board Tiles
- `minHeight: 110px`, `padding: 10px 5px`, `gap: 6px`
- Tile name: 14px, tile ID: 13px, hours: 12px
- Priority badge: 22px circle (top-5 tiles)

### Right Column (details-pane)
1. **Tile detail** — appears at top when tile clicked; task checklist, edit button, stat pills
2. **Priority list** — scrollable (max-height 260px) when detail is open, full-height otherwise

### Progress Chart
- SVG step chart below the bingo board (left column)
- Shows cumulative score vs ideal pace reference line
- "Now" marker, stats row: earned pts · pts/hr · projected final score
- Persisted in `localStorage` under `bingo:completion_log:v1`
- Event window: Feb 20 2026 3PM EST → Mar 1 2026 12PM EST

---

## File Map

| File | Purpose |
|---|---|
| `src/index.css` | Global reset + `html { zoom: 1.5 }` scale |
| `src/App.css` | CSS vars, layout classes, tab-content zoom, breakpoints |
| `src/App.jsx` | Entire app (~2060 lines): data, scoring, all components |
| `api/enrich.js` | Vercel serverless — Anthropic Sonnet wiki enrichment |
| `api/strategy-message.js` | Vercel serverless — AI Discord strategy directive |

## Key Constants (App.jsx)
```js
const EVENT_START = new Date('2026-02-20T20:00:00Z'); // Feb 20 3PM EST
const EVENT_END   = new Date('2026-03-01T17:00:00Z'); // Mar 1 12PM EST
const TILE_STATE_KEY    = "bingo:tiles:v1";
const DONE_STATE_KEY    = "bingo:done:v1";
const COMPLETION_LOG_KEY = "bingo:completion_log:v1";
```

## Scoring (unchanged, do not break)
- 3 pts per task completed
- 15 pts per bingo level per line (bronze/silver/gold)
- 10 lines total: 5 rows + 5 cols, **no diagonals**
- Max score: 675 pts
