# Rank History Chart Design

## Problem
The leaderboard only shows current rank and one-week movement. Contestants and viewers want to see how rankings have shifted over the full challenge timeline.

## Solution
Add a line chart showing each contestant's rank position week-by-week, powered by historical data from Google Sheets.

## Data Flow

```
Private Tracker (Contestants tab: weekly weights)
  -> Private Tracker (new Ranks tab: RANK() formulas -> weekly ranks per codename)
    -> Public Leaderboard (new History tab: IMPORTRANGE of Ranks)
      -> app.js (fetch CSV, parse, render Chart.js line chart)
```

Privacy is preserved: only codenames and rank positions are exposed publicly. No weights or real names.

## Data Layer

### Private tracker: new "Ranks" tab
- Row per contestant (Codename column + Wk1-Wk12 columns)
- Each cell computes rank for that week based on cumulative % weight lost
- Uses `RANK()` against the % lost values from the Contestants tab

### Public leaderboard: new "History" tab
- `IMPORTRANGE` pulling the entire Ranks tab from the private tracker
- Becomes a fetchable CSV endpoint via the existing CORS proxy pattern

### App: new fetch + parse
- New GID constant for the History tab
- `fetchHistoryData()` returns array: `[{ codename, ranks: [null, 3, 3, ...] }]`
- Null values for weeks without data (challenge hasn't reached that week yet)

## Chart Component

- **Library**: Chart.js via CDN
- **Type**: Line chart
- **X-axis**: Week labels (Wk1, Wk2, ... up to current week)
- **Y-axis**: Rank position, **inverted** (1 at top, 9 at bottom) so "going up" = improving
- **Lines**: One per contestant, distinct colors, labeled
- **Tooltips**: Show contestant codename + rank on hover
- **Responsive**: Scales on mobile
- **Data gaps**: Lines only drawn where data exists (no extrapolation)

## Layout

Full-width section below the existing split layout, above the footer.

```
[Split Layout: Countdown/Photos | Leaderboard/Shame]
[--- Rank History Chart (full width) ---]
[Footer]
```

Section title: "The Journey So Far" or similar.

## Files Changed

| File | Change |
|------|--------|
| index.html | Chart.js CDN script tag, new chart section HTML |
| app.js | `fetchHistoryData()`, `renderChart()`, wire into `init()` |
| styles.css | Chart section container, responsive styles, theme matching |

## Manual Setup Required

1. Create Ranks tab in private tracker with RANK() formulas
2. Create History tab in public leaderboard with IMPORTRANGE
3. Note the GID of the History tab for the app code
