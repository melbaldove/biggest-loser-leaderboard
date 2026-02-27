# Rank History Chart Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a Chart.js line chart showing contestant rank positions week-by-week over the challenge timeline.

**Architecture:** Data flows from the private tracker's weekly weights through RANK() formulas, IMPORTRANGE'd to the public sheet, fetched as CSV, and rendered as a Chart.js line chart. The chart sits full-width below the existing split layout.

**Tech Stack:** Chart.js (CDN), Google Sheets RANK()/IMPORTRANGE, vanilla JS/CSS

---

### Task 1: Set up Google Sheets data pipeline (MANUAL — user action)

This task requires the user to create spreadsheet formulas. Claude should guide the user through each step.

**Step 1: Create "Ranks" tab in the private tracker**

Open the private tracker (`1DhHHhWOufwEsiRYq08GHYsqjY5727dvcQaWrB7Rf21M`).

Add a new sheet tab called "Ranks" with this structure:
- Column A: Codename (copy from Contestants tab column B)
- Columns B-M: Wk1 through Wk12

For each week cell, compute the rank based on % weight lost. Example formula for cell B2 (Wk1 rank for first contestant):

```
=IF(Contestants!D2="", "", RANK((Contestants!C2-Contestants!D2)/Contestants!C2, (Contestants!$C$2-Contestants!$D$2)/Contestants!$C$2, (Contestants!$C$3-Contestants!$D$3)/Contestants!$C$3, (Contestants!$C$4-Contestants!$D$4)/Contestants!$C$4, (Contestants!$C$5-Contestants!$D$5)/Contestants!$C$5, (Contestants!$C$6-Contestants!$D$6)/Contestants!$C$6, (Contestants!$C$7-Contestants!$D$7)/Contestants!$C$7, (Contestants!$C$8-Contestants!$D$8)/Contestants!$C$8, (Contestants!$C$9-Contestants!$D$9)/Contestants!$C$9, (Contestants!$C$10-Contestants!$D$10)/Contestants!$C$10))
```

Alternative simpler approach: Create a helper row in each week column that computes % lost, then use `RANK()` against that column. The key is: higher % lost = rank 1.

**Step 2: Create "History" tab in the public leaderboard**

Open the public leaderboard (`1htoeLmi-aczeAOJpHjf3hFnT5L26kUaGHukXX6l920g`).

Add a new sheet tab called "History" with this formula in A1:

```
=IMPORTRANGE("https://docs.google.com/spreadsheets/d/1DhHHhWOufwEsiRYq08GHYsqjY5727dvcQaWrB7Rf21M", "Ranks!A:M")
```

**Step 3: Note the GID**

After creating the History tab, check the URL for the `gid=` parameter. This is needed for the app code.

**Step 4: Verify**

Confirm the History tab shows: Codename | Wk1 | Wk2 | ... | Wk12 with rank numbers (1-9) for weeks with data and blank for future weeks.

---

### Task 2: Add Chart.js CDN and chart HTML section

**Files:**
- Modify: `index.html`

**Step 1: Add Chart.js CDN script tag**

Add before the `app.js` script tag at the bottom of `index.html`:

```html
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
```

**Step 2: Add chart section HTML**

Add between the closing `</div>` of `.split-layout` and the `<footer>`, inside `.main-content`:

```html
<!-- Rank History Chart -->
<div class="chart-section" id="chart-section">
  <h2 class="section-title">The Journey So Far</h2>
  <div class="chart-container">
    <canvas id="rank-chart"></canvas>
  </div>
</div>
```

**Step 3: Commit**

```bash
git add index.html
git commit -m "Add Chart.js CDN and rank history chart section"
```

---

### Task 3: Add chart section CSS

**Files:**
- Modify: `styles.css`

**Step 1: Add chart section styles**

Add before the `/* FOOTER */` section in `styles.css`:

```css
/* ==============================================
   RANK HISTORY CHART
   ============================================== */

.chart-section {
  padding: 40px 24px;
  background: linear-gradient(180deg, #f0f4ff 0%, #fff 100%);
  border-top: 3px solid #222;
}

.chart-container {
  max-width: 900px;
  margin: 0 auto;
  background: white;
  border-radius: 16px;
  border: 3px solid #222;
  box-shadow: 4px 4px 0 #222;
  padding: 24px;
}
```

**Step 2: Add responsive styles for the chart**

Add inside the existing `@media (max-width: 900px)` block:

```css
  .chart-section {
    padding: 24px 16px;
  }

  .chart-container {
    padding: 12px;
  }
```

**Step 3: Commit**

```bash
git add styles.css
git commit -m "Add rank history chart styles"
```

---

### Task 4: Add history data fetching

**Files:**
- Modify: `app.js`

**Step 1: Add History GID to SHEETS_CONFIG**

Add a `historyGid` property to `SHEETS_CONFIG` (the actual GID value will come from Task 1 Step 3 — use a placeholder if the user hasn't provided it yet):

```javascript
historyGid: 'HISTORY_GID_HERE',
```

**Step 2: Add HISTORY_CSV_URL constant**

Add after the existing `CONFIG_CSV_URL` line:

```javascript
const HISTORY_CSV_URL = CORS_PROXY + encodeURIComponent(`${SHEETS_BASE_URL}&gid=${SHEETS_CONFIG.historyGid}${CACHE_BUST}`);
```

**Step 3: Add global HISTORY array**

Add after the `let CONTESTANTS = [];` line:

```javascript
let HISTORY = [];
```

**Step 4: Add fetchHistoryData function**

Add after the `fetchConfigData` function:

```javascript
async function fetchHistoryData() {
  try {
    const response = await fetch(HISTORY_CSV_URL);
    const csvText = await response.text();
    const data = parseCSV(csvText);

    HISTORY = data
      .filter(row => row['Codename'])
      .map(row => ({
        codename: row['Codename'],
        ranks: Array.from({ length: 12 }, (_, i) => {
          const val = parseInt(row[`Wk${i + 1}`], 10);
          return isNaN(val) ? null : val;
        }),
      }));

    return HISTORY;
  } catch (error) {
    console.error('Failed to fetch history:', error);
    return [];
  }
}
```

**Step 5: Commit**

```bash
git add app.js
git commit -m "Add rank history data fetching from Google Sheets"
```

---

### Task 5: Add chart rendering

**Files:**
- Modify: `app.js`

**Step 1: Add color palette constant**

Add after the `FOOD_IMAGES` array (or near the top of the file with other constants):

```javascript
const CHART_COLORS = [
  '#f5576c', '#4facfe', '#43e97b', '#fa709a',
  '#667eea', '#ffd700', '#ff6b35', '#00f2fe', '#764ba2',
];
```

**Step 2: Add renderChart function**

Add after the `renderLeaderboard` function:

```javascript
function renderChart() {
  if (HISTORY.length === 0) return;

  // (1) Determine how many weeks have data
  const maxWeek = HISTORY.reduce((max, h) => {
    const lastWeek = h.ranks.reduce((last, r, i) => r !== null ? i + 1 : last, 0);
    return Math.max(max, lastWeek);
  }, 0);

  if (maxWeek === 0) return;

  const labels = Array.from({ length: maxWeek }, (_, i) => `Wk${i + 1}`);

  // (2) Build datasets — one line per contestant
  const datasets = HISTORY.map((contestant, i) => ({
    label: contestant.codename,
    data: contestant.ranks.slice(0, maxWeek),
    borderColor: CHART_COLORS[i % CHART_COLORS.length],
    backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
    tension: 0.3,
    pointRadius: 5,
    pointHoverRadius: 8,
    borderWidth: 3,
    spanGaps: false,
  }));

  // (3) Render Chart.js line chart
  const ctx = document.getElementById('rank-chart').getContext('2d');
  new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        y: {
          reverse: true,
          min: 1,
          max: HISTORY.length,
          ticks: {
            stepSize: 1,
            callback: (val) => `#${val}`,
          },
          title: { display: true, text: 'Rank', font: { weight: 'bold' } },
        },
        x: {
          title: { display: true, text: 'Week', font: { weight: 'bold' } },
        },
      },
      plugins: {
        legend: {
          position: 'bottom',
          labels: { usePointStyle: true, padding: 16 },
        },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: Rank #${ctx.parsed.y}`,
          },
        },
      },
    },
  });
}
```

**Step 3: Commit**

```bash
git add app.js
git commit -m "Add Chart.js rank history rendering"
```

---

### Task 6: Wire into init and test

**Files:**
- Modify: `app.js`

**Step 1: Add fetchHistoryData to the init Promise.all**

In the `init()` function, add `fetchHistoryData()` to the existing `Promise.all`:

```javascript
await Promise.all([
  fetchConfigData(),
  fetchLeaderboardData(),
  fetchHistoryData(),
]);
```

**Step 2: Call renderChart after renderLeaderboard**

Add after the `renderLeaderboard();` call in init:

```javascript
renderChart();
```

**Step 3: Commit**

```bash
git add app.js
git commit -m "Wire rank history chart into init"
```

**Step 4: Test locally**

Open `index.html` in a browser. Verify:
- Chart section appears below the split layout
- Lines show for each contestant with distinct colors
- Y-axis is inverted (rank 1 at top)
- Hover tooltips show codename + rank
- Responsive on mobile viewport

---

### Task 7: Final review and push

**Step 1: Review all changes**

```bash
git diff main...HEAD
```

Verify no debug code, console.logs, or hardcoded test data remain.

**Step 2: Push and create PR**

```bash
git push -u origin feature/rank-history-chart
```
