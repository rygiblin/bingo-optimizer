# CHECKPOINT: Before Adding Wiki Enrichment
**Date:** February 17, 2026  
**Current Status:** Scoring System Fixed & Tested ✅  
**Next Task:** Add Wiki Enrichment Without Breaking Anything

---

## Current State Summary

### ✅ What's Working (DO NOT BREAK)
1. **Correct Scoring System**
   - 3 points per task
   - 15 points per bingo level (Bronze/Silver/Gold)
   - 10 lines total (5 rows + 5 columns, NO diagonals)
   - `calculateScore(done, tiles)` function working
   - `getMarginalPoints()` helper for priority calculations

2. **All Components Using New Scoring**
   - Scenarios tab: Shows task pts + bingo bonuses correctly
   - WhosOnline: Priority calculation using marginal points
   - TeamRoles: Points per hour calculations updated
   - Main priority panel: Smart ranking working

3. **File Structure**
   - Clean, working JSX (99,742 bytes)
   - No encoding issues
   - No CUM/LBN references
   - Export default present and correct

### 📁 Files Status
- **`bingo-optimizer-SCORING-FIXED-FINAL.jsx`** (99KB)
  - ✅ Scoring fixed
  - ❌ No wiki enrichment yet
  - ✅ Ready for wiki enrichment to be added

- **`bingo-optimizer-SCORING-FIXED-CLEAN.jsx`** (backup)
  - Same as above, saved as safety backup

---

## What Needs to Be Added

### Wiki Enrichment Components (From Previous Working Version)

#### 1. Constants & Prompt
```javascript
const ENRICH_PROMPT = (tileName, tileNotes, tileCategory, taskDesc, taskType, taskNotes, currentHours) => `...`;
```
**Location:** Before main App component  
**Purpose:** Prompt template for Claude API calls

#### 2. API Call Function
```javascript
async function callEnrichAPI(tileName, tileNotes, tileCategory, task) {
  // Calls Anthropic API with ENRICH_PROMPT
  // Returns: {estHours, dropRate, kcPerHour, dropsNeeded, confidence, wikiNotes}
}
```
**Location:** Before main App component  
**Purpose:** Makes API calls to fetch wiki data

#### 3. useWikiData Hook
```javascript
function useWikiData(tiles, setTiles) {
  // State: wikiData, enriching, enrichProgress
  // Functions: enrichTask, enrichAll, clearAll
  // Uses window.storage for persistence
}
```
**Location:** Before main App component  
**Purpose:** Manages wiki data state and enrichment operations

#### 4. TileEditor Enhancement
```javascript
function TileEditor({tile, onSave, onCancel, enrichTask, enriching, wikiData}) {
  // Adds per-task enrich buttons
  // Shows wiki data (KC/hr, drop rate, notes)
  // Allows force refresh
}
```
**Location:** Replace existing TileEditor  
**Purpose:** Individual task enrichment in tile editor

#### 5. Main App Integration
```javascript
// In App component:
const {wikiData, enriching, enrichProgress, enrichTask, enrichAll, clearAll} = useWikiData(tiles, setTiles);

// Pass to components:
<TileEditor enrichTask={enrichTask} enriching={enriching} wikiData={wikiData} />
<RosterPanel enrichAll={enrichAll} enrichProgress={enrichProgress} wikiData={wikiData} />
```

---

## Critical Integration Points

### ⚠️ DANGER ZONES (Don't Break These)

1. **Scoring Functions**
   - `calculateScore()` - DO NOT MODIFY
   - `getMarginalPoints()` - DO NOT MODIFY
   - These are used throughout the app

2. **Component Props**
   - Scenarios, WhosOnline, TeamRoles - already working
   - Only add enrichment props where needed
   - Don't change existing prop signatures

3. **File Structure**
   - Keep wiki code BEFORE the main App component
   - Don't insert code INSIDE App function like last time
   - Maintain proper nesting

### ✅ Safe Integration Strategy

1. **Add constants** (ENRICH_PROMPT) at top level ✓
2. **Add callEnrichAPI** function at top level ✓
3. **Add useWikiData** hook at top level ✓
4. **Update TileEditor** to accept new props ✓
5. **Enable useWikiData** in App component ✓
6. **Pass props** to TileEditor and RosterPanel ✓

---

## Source Files Reference

### Where to Copy From
- **Original with enrichment:** `/mnt/project/local_bingo_optimizer.jsx`
  - Lines 213-234: ENRICH_PROMPT
  - Lines 236-261: callEnrichAPI
  - Lines 263-374: useWikiData hook
  - Lines 390-457: Enhanced TileEditor

### Current Clean File
- **Scoring-fixed base:** `/home/claude/bingo-optimizer-SCORING-FIXED-CLEAN.jsx`
  - This is our working foundation
  - Add wiki code to THIS file

---

## Step-by-Step Integration Plan

### Step 1: Extract Wiki Code from Original
- [x] Identify ENRICH_PROMPT location
- [x] Identify callEnrichAPI location  
- [x] Identify useWikiData location
- [x] Identify enhanced TileEditor location

### Step 2: Insert into Clean File (IN ORDER)
1. Add ENRICH_PROMPT before App component
2. Add callEnrichAPI after ENRICH_PROMPT
3. Add useWikiData after callEnrichAPI
4. Replace simple TileEditor with enhanced version
5. Enable useWikiData in App component (uncomment line)
6. Update component prop passing

### Step 3: Verify Each Addition
- After each step, verify file still valid
- Check no code inserted in wrong place
- Ensure App component structure intact

### Step 4: Final Testing
- File loads without errors
- Scoring still works
- Enrich buttons appear
- API calls work

---

## Verification Checklist

### Before Wiki Addition ✅
- [x] Scoring system correct
- [x] No CUM/LBN references
- [x] File structure clean
- [x] Export default present
- [x] Backup created

### After Wiki Addition (TODO)
- [ ] ENRICH_PROMPT present
- [ ] callEnrichAPI present
- [ ] useWikiData present
- [ ] TileEditor has enrich buttons
- [ ] App calls useWikiData
- [ ] Props passed correctly
- [ ] File loads in claude.ai
- [ ] Enrich All button works
- [ ] Individual task enrich works
- [ ] Scoring still correct
- [ ] No white screen

---

## Known Working Code Locations

### In Original File (`/mnt/project/local_bingo_optimizer.jsx`):
```
Lines 213-234  : ENRICH_PROMPT
Lines 236-261  : callEnrichAPI  
Lines 263-374  : useWikiData
Lines 390-457  : Enhanced TileEditor
Line 1193      : useWikiData enabled in App
Line 1290      : TileEditor receives enrichment props
```

### In Clean File (`bingo-optimizer-SCORING-FIXED-CLEAN.jsx`):
```
Lines 1-219    : Imports, constants, helper functions
Lines 220-240  : Simple TileEditor (needs replacement)
Lines 979-1215 : Main App component
Line 988       : useWikiData currently disabled (needs enable)
Line 1197      : TileEditor props (needs enrichment props added)
```

---

## Success Criteria

✅ Wiki enrichment added successfully when:
1. File loads without white screen
2. Enrich All button visible and clickable
3. Individual task enrich buttons in tile editor
4. API calls work and update task hours
5. Wiki data persists across page refresh
6. Scoring system still calculates correctly
7. No console errors

---

## Questions to Answer Before Proceeding

1. **File to modify:** `bingo-optimizer-SCORING-FIXED-CLEAN.jsx` ✓
2. **Source for wiki code:** `/mnt/project/local_bingo_optimizer.jsx` ✓
3. **Insertion strategy:** Top-level, before App component ✓
4. **Testing plan:** Incremental verification after each addition ✓
5. **Rollback plan:** Have clean backup saved ✓

---

**STATUS:** ✅ Ready to proceed with wiki enrichment integration  
**RISK LEVEL:** Medium (have backup, clear plan, known working code)  
**ESTIMATED STEPS:** 6-8 careful replacements  
**EXPECTED OUTCOME:** Fully functional app with scoring + enrichment

---

## Next Command

Ready to execute wiki enrichment integration following this plan.
