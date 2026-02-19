# Checkpoint: Line Planner Redesign

Date: 2026-02-19
App.jsx line count: ~1566

---

## What Was Built This Session

### New LinePlanner component (lines 729–~1001)

Completely replaced the old single-line-selector + detail table UI with a **board-centric layout**:

#### Layout: 6-column CSS grid
- **Corner cell** (top-left): "BINGO" label
- **Col headers (top row)**: one per column (c0–c4) — ColHeader component
- **Row headers (left column)**: one per row (r0–r4) — RowHeader component
- **Tile cells (interior 5×5)**: TileCell component
- **Below grid**: PairStrip — top 6 double-bingo pair cards

#### Memos (all correct, do not break)
1. `boardLines` — 10 lines with keys `r0..r4`, `c0..c4`
2. `tileTaskCounts` — `tileId → count of done tasks`, deps: `[done, tiles]`
3. `tileEffSc` — `tileId → effectiveScale(...)`, clamped min 0.01, deps: `[tiles, teamPlayers, teamCap]`
4. `tileDoneSets` — `tileId → Set<taskId>`, deps: `[done, tiles]`
5. `lineOverviewStats` — per-line hours/prob/medal, sorted by `nextLevelHours`, deps: all above
6. `lynchpinMap` — `tileId → {bronze, silver, gold}`, true if completing that tile finishes BOTH its row AND col bingo
7. `doubleBingoPairs` — top 10 (row, col) pairs sorted by `combinedHours` (deducts shared intersection tile hours)
8. `rowGutterStats` — `[r0..r4]` in grid order from lineOverviewStats
9. `colGutterStats` — `[c0..c4]` in grid order from lineOverviewStats
10. `rowRank` / `colRank` — rank badge (1–5) within rows/cols by hours
11. `hovTiles` — Set of highlighted tile IDs from hovered line(s), deps: `[boardLines, hoveredLine, hoveredLine2]`

#### State
- `hoveredLine` — key of hovered line (e.g. "r2"), set by RowHeader/ColHeader/PairStrip hover
- `hoveredLine2` — second key for pair hover (both row AND col highlighted simultaneously)

#### Inner components
- `MedalBadge({level})` — B/S/G chip with color
- `ColHeader({stat})` — top gutter cell: rank#, col name, hours (colored by diffColor), %, medal badges
- `RowHeader({stat})` — left gutter cell: same info, vertical layout
- `TileCell({tile})` — interior tile: cat dot, #id, name, 3 medal dots, hours label (see below)
- `PairStrip()` — horizontal row of pair cards with hover-to-highlight

#### diffColor logic
```js
const diffColor = stat => stat.nextLevelLabel === 'complete' ? '#4ade80'
  : stat.nextLevelProb > 0.7 ? '#4ade80'
  : stat.nextLevelProb > 0.35 ? '#ffd700'
  : '#ff6b6b';
```
Color is based on event-end probability for the next uncompleted medal level.

---

## TileCell Hours Label (last fix this session)

The tile cells in the LinePlanner board show hours to the **next medal level** (not total to gold, which is what the main tile shows). This caused visible discrepancy (e.g. "~3h" vs "~11h" for COX KC).

**Fix applied:** Added a colored pill badge next to the hours showing which level it refers to:
```jsx
<span style={{fontSize:5, fontWeight:700, padding:"0 3px", borderRadius:2, lineHeight:"10px",
  color: count===0?"#cd7f32":count===1?"#c0c0c0":"#ffd700",
  background: count===0?"rgba(205,127,50,0.15)":...,
  border: `1px solid ${...}`}}>
  {count===0?"Bronze":count===1?"Silver":"Gold"}
</span>
```

---

## Unresolved Issue (to investigate next session)

User reported: **"when I update the tasks in the main bingo tile, I don't see a change reflected in the line planner."**

Analysis found the data IS correctly linked (`tiles` state → LinePlanner prop → memos recompute on change). Two plausible causes were identified but not yet confirmed:

1. **Pre-save confusion**: TileEditor keeps local state; `tiles` only updates when "Save" is clicked. User may be expecting live updates while typing.
2. **Non-cheapest task edits**: LinePlanner tile cells show hours using only the *cheapest* remaining task(s) for the next medal level. Editing a more expensive task's hours doesn't change what's displayed (e.g. editing COX KC task 1a from 33h → 50h has no effect on the shown "~3h" because 1b/1c at 17h are still cheapest).

**Next step**: Confirm with user which scenario they're experiencing, then fix:
- If pre-save: make TileEditor edits flow live to `tiles` (lift state or use callback on change)
- If non-cheapest: either change tile cell to show total remaining hours (matching main tile), or add a tooltip/note

---

## Key Files

| File | Purpose |
|---|---|
| `src/App.jsx` | Entire app, ~1566 lines |
| `api/enrich.js` | Vercel serverless → Anthropic Sonnet for wiki enrichment |
| `context/` | Checkpoint docs |

## Scoring (correct, do not change)
- 3 pts per task, 15 pts per bingo level (bronze/silver/gold)
- 10 lines: 5 rows + 5 cols, NO diagonals
- Max: 675 pts

## Dev
- `vercel dev` → http://localhost:3000
- `vercel --prod` to deploy
- ANTHROPIC_API_KEY in Vercel dashboard
