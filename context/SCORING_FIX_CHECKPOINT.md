# CRITICAL: Scoring System Fix - Checkpoint
**Date:** February 17, 2026  
**Priority:** HIGH - Foundation for all optimization features

---

## ⚠️ PROBLEM IDENTIFIED

The current scoring system in the code is **INCORRECT** and needs to be fixed before any Line Planner work.

### Current (WRONG) Implementation
```javascript
const CUM = [0,5,10,16,23,30,38,46,54,62,72,85,100];  // Cumulative gold tile points
const LBN = 50;  // Line bonus

function cG(gs) {
  const g = gs.size,  // number of gold tiles
  tp = CUM[Math.min(g,12)] || 0,  // tile points
  ln = LINES.filter(l => l.tiles.every(t => gs.has(t))).length;  // lines where ALL tiles are gold
  return {tp, lp: ln*LBN, total: tp+ln*LBN, lines: ln, golded: g};
}
```

**Problems:**
1. Only counts GOLD tiles (ignores bronze/silver)
2. Only awards line bonus if ALL 5 tiles are GOLD
3. Uses cumulative scoring array instead of per-task scoring
4. Line bonus is 50 instead of 15 per bingo level

### Lines Definition (Also WRONG)
```javascript
const LINES = [
  // 5 rows
  // 5 columns  
  // 2 DIAGONALS ← SHOULD NOT EXIST
];
```

---

## ✅ CORRECT SCORING SYSTEM

### Task Points
- **Each task completed = 3 points**
- 75 total tasks possible (25 tiles × 3 tasks each)
- Maximum from tasks: **225 points**

### Bingo Structure
- **10 possible lines** (5 rows + 5 columns, NO DIAGONALS)
- Each line has 5 tiles
- Each tile has 3 tasks

### Bingo Bonuses (Per Line)
A line can earn up to **3 separate bonuses**:

1. **Bronze Bingo** = +15 points
   - Requirement: All 5 tiles in the line have ≥1 task complete
   - Can be achieved with: 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, or 15 tasks total

2. **Silver Bingo** = +15 points (in addition to bronze)
   - Requirement: All 5 tiles in the line have ≥2 tasks complete
   - Can be achieved with: 10, 11, 12, 13, 14, or 15 tasks total
   - Automatically includes bronze bonus

3. **Gold Bingo** = +15 points (in addition to bronze + silver)
   - Requirement: All 5 tiles in the line have 3 tasks complete (all tasks done)
   - Can only be achieved with: exactly 15 tasks total
   - Automatically includes bronze + silver bonuses

### Example Scoring

**Example 1: Bronze-only Bingo (Row 1)**
```
Tile 1: 1 task done (✓)
Tile 2: 1 task done (✓)
Tile 3: 2 tasks done (✓✓)
Tile 4: 1 task done (✓)
Tile 5: 1 task done (✓)

Task Points: 6 tasks × 3 = 18 points
Bronze Bonus: +15 points (all tiles ≥1 task)
Silver Bonus: 0 (Tile 1, 2, 4, 5 don't have ≥2 tasks)
Gold Bonus: 0

Total: 18 + 15 = 33 points
```

**Example 2: Silver Bingo (Row 2)**
```
Tile 6: 2 tasks done (✓✓)
Tile 7: 3 tasks done (✓✓✓)
Tile 8: 2 tasks done (✓✓)
Tile 9: 2 tasks done (✓✓)
Tile 10: 2 tasks done (✓✓)

Task Points: 11 tasks × 3 = 33 points
Bronze Bonus: +15 points (all tiles ≥1 task)
Silver Bonus: +15 points (all tiles ≥2 tasks)
Gold Bonus: 0 (Tile 6, 8, 9, 10 don't have 3 tasks)

Total: 33 + 15 + 15 = 63 points
```

**Example 3: Gold Bingo (Row 3)**
```
Tile 11: 3 tasks done (✓✓✓)
Tile 12: 3 tasks done (✓✓✓)
Tile 13: 3 tasks done (✓✓✓)
Tile 14: 3 tasks done (✓✓✓)
Tile 15: 3 tasks done (✓✓✓)

Task Points: 15 tasks × 3 = 45 points
Bronze Bonus: +15 points
Silver Bonus: +15 points
Gold Bonus: +15 points

Total: 45 + 45 = 90 points
```

### Maximum Possible Score
```
All 75 tasks completed: 75 × 3 = 225 points
All 10 lines at Gold: 10 × 45 = 450 points
MAXIMUM TOTAL: 675 points
```

---

## 🔧 CHANGES REQUIRED

### 1. Update Constants
```javascript
// OLD (WRONG):
const CUM = [0,5,10,16,23,30,38,46,54,62,72,85,100];
const LBN = 50;

// NEW (CORRECT):
const TASK_POINTS = 3;
const BRONZE_BONUS = 15;
const SILVER_BONUS = 15;
const GOLD_BONUS = 15;
```

### 2. Fix LINES Definition
```javascript
// Remove diagonals - only 10 lines (5 rows + 5 cols)
const LINES = (() => {
  const l = [];
  // 5 rows
  for (let r = 0; r < 5; r++) {
    l.push({
      name: `Row ${r+1}`,
      tiles: [r*5+1, r*5+2, r*5+3, r*5+4, r*5+5]
    });
  }
  // 5 columns
  for (let c = 0; c < 5; c++) {
    l.push({
      name: `Col ${c+1}`,
      tiles: [c+1, c+6, c+11, c+16, c+21]
    });
  }
  return l;
})();
// Total: 10 lines (NO DIAGONALS)
```

### 3. Rewrite Score Calculation Function
```javascript
// NEW: Calculate score based on done tasks and bingo bonuses
function calculateScore(done, tiles) {
  // Task points
  const taskPoints = done.size * TASK_POINTS;
  
  // Count tasks per tile
  const tasksPerTile = {};
  tiles.forEach(tile => {
    const count = tile.tasks.filter(t => done.has(t.id)).length;
    tasksPerTile[tile.id] = count;
  });
  
  // Calculate bingo bonuses
  let bronzeLines = 0, silverLines = 0, goldLines = 0;
  
  LINES.forEach(line => {
    const tileCounts = line.tiles.map(tid => tasksPerTile[tid] || 0);
    
    // Bronze: all tiles have ≥1 task
    if (tileCounts.every(c => c >= 1)) {
      bronzeLines++;
      
      // Silver: all tiles have ≥2 tasks
      if (tileCounts.every(c => c >= 2)) {
        silverLines++;
        
        // Gold: all tiles have 3 tasks
        if (tileCounts.every(c => c >= 3)) {
          goldLines++;
        }
      }
    }
  });
  
  const bonusPoints = (bronzeLines * BRONZE_BONUS) + 
                      (silverLines * SILVER_BONUS) + 
                      (goldLines * GOLD_BONUS);
  
  return {
    taskPoints,
    bonusPoints,
    total: taskPoints + bonusPoints,
    bronzeLines,
    silverLines,
    goldLines,
    tasksComplete: done.size
  };
}
```

### 4. Update All Score Displays
Files/components to update:
- Scenarios tab (projection scoring)
- Gold Chain tab (cascading scores)
- Priority panel (score calculations)
- Any other place showing points

---

## 📋 IMPLEMENTATION CHECKLIST

### Phase 1: Fix Scoring (DO THIS FIRST)
- [ ] Remove diagonal lines from LINES constant
- [ ] Add new scoring constants (TASK_POINTS, bonuses)
- [ ] Replace `cG()` function with new `calculateScore()`
- [ ] Update all references to old scoring
- [ ] Test in Scenarios tab
- [ ] Verify points display correctly

### Phase 2: Line Planner Redesign (DO AFTER Phase 1)
- [ ] Design new optimizer interface
- [ ] Implement bronze/silver/gold bingo detection
- [ ] Add multi-line opportunity detection
- [ ] Build priority recommendations
- [ ] Add probability calculations
- [ ] Test with real data

---

## ⚠️ CRITICAL NOTES

1. **DO NOT proceed with Line Planner until scoring is fixed**
2. **Test scoring thoroughly** - it's the foundation for all optimization
3. **Verify backwards compatibility** - existing save data should still work
4. **Document changes** - this is a breaking change from old system

---

## NEXT STEPS

1. ✅ Create this checkpoint (DONE)
2. ⏳ Fix scoring system
3. ⏳ Test scoring changes
4. ⏳ Redesign Line Planner with correct scoring
5. ⏳ Test Line Planner optimizer

---

## Files to Modify

1. **bingo-optimizer-with-wiki.jsx**
   - Lines 203-205 (constants)
   - Line 1078+ (scoring function)
   - Scenarios tab scoring
   - Any other score calculations

---

**Status:** Ready to proceed with scoring fix
**Blocker:** None
**Risk:** Medium (changing core calculation, but well-defined)
**Testing:** Can verify manually by checking example calculations
