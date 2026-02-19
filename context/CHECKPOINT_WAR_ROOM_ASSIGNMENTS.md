# Checkpoint: LinePlanner War Room — Per-Tile Player Assignments

Date: 2026-02-19
App.jsx line count: ~1590

---

## What Was Built This Session

### Problem Solved
LinePlanner was showing team-scaled hours (raw ÷ effectiveScale) while the tile editor showed
raw hours. Users couldn't tell why the numbers differed. Also, the global team scale didn't
reflect real sub-team splits (e.g. 5 on COX, 2 on Doom simultaneously).

### Solution: War Room Mode in LinePlanner

Per-tile player assignment with +/− controls on each grid tile cell. All hour calculations in
LinePlanner now use `tileWarRoomEffSc` instead of the old global `tileEffSc`.

---

## Key Changes (all in `src/App.jsx`)

### New state (LinePlanner, line ~733)
```js
const [tileAssignments, setTileAssignments] = useState({}); // tileId → player count (ephemeral)
```
Ephemeral — resets on refresh, not saved to localStorage.

### New memo: `tileWarRoomEffSc` (replaces `tileEffSc` inside LinePlanner)
```js
// assigned: playerCount × teamCap[cat]
// unassigned: 1 (raw hours, consistent with main board)
m[t.id] = (assigned > 0) ? Math.max(assigned * (teamCap[t.cat] || 1.0), 0.01) : 1;
```

### `lineOverviewStats` additions
- Uses `tileWarRoomEffSc` for all `hoursForMedal` and `probAtEnd` calculations
- Adds `hasUnassigned: boolean` flag (true if any tile in the line has no assignment)

### `doubleBingoPairs`
- Uses `tileWarRoomEffSc` for intersection tile hours

### TileCell changes
- Tiles start dimmed (opacity 0.5) when unassigned
- Shows raw hours + "raw" label when unassigned
- Shows scaled hours + medal label when assigned
- +/− buttons to set player count; − below 1 clears the assignment

### ColHeader / RowHeader changes
- Show ⚠ icon next to hours when `stat.hasUnassigned` is true
- ⚠ tooltip: "Some tiles unassigned — hours include raw estimates"

### WAR ROOM summary bar (top of LinePlanner)
- Shows: assigned players, tiles assigned, team size, unassigned pool
- "Clear all" button resets all assignments
- Hint text explains row/col totals and ⚠ behavior

### Main board labeling
- Dim caption above 5×5 grid: "Tile hours = total remaining ÷ team scale"
- Clarifies the main board uses global team scale, not per-tile assignments

---

## Scoring / Architecture Unchanged
- 3 pts per task, 15 pts per bingo level (bronze/silver/gold)
- 10 lines: 5 rows + 5 cols, NO diagonals
- Max score: 675 pts
- Main board tile hours still use global `effectiveScale` (total remaining ÷ team scale)
- LinePlanner is the only view that uses `tileWarRoomEffSc`

---

## Key Files

| File | Purpose |
|---|---|
| `src/App.jsx` | Entire app, ~1590 lines |
| `api/enrich.js` | Vercel serverless → Anthropic Sonnet |
| `context/` | Checkpoint docs |

## Dev
- `vercel dev` → http://localhost:3000 (or 3001 if 3000 in use)
- `vercel --prod` to deploy
