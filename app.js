// ==============================================
// GOOGLE SHEETS INTEGRATION
// ==============================================

const SHEETS_CONFIG = {
  // Public spreadsheet (only exposes codenames and ranks - no weights or names)
  spreadsheetId: '1htoeLmi-aczeAOJpHjf3hFnT5L26kUaGHukXX6l920g',
  leaderboardGid: '0',
  configGid: '136070622',
  historyGid: '917061774',
};

// Build CSV export URLs with CORS proxy
const SHEETS_BASE_URL = `https://docs.google.com/spreadsheets/d/${SHEETS_CONFIG.spreadsheetId}/export?format=csv`;
const CORS_PROXY = 'https://api.codetabs.com/v1/proxy?quest=';

const CACHE_BUST = `&_=${Date.now()}`;
const LEADERBOARD_CSV_URL = CORS_PROXY + encodeURIComponent(`${SHEETS_BASE_URL}&gid=${SHEETS_CONFIG.leaderboardGid}${CACHE_BUST}`);
const CONFIG_CSV_URL = CORS_PROXY + encodeURIComponent(`${SHEETS_BASE_URL}&gid=${SHEETS_CONFIG.configGid}${CACHE_BUST}`);
const HISTORY_CSV_URL = CORS_PROXY + encodeURIComponent(`${SHEETS_BASE_URL}&gid=${SHEETS_CONFIG.historyGid}${CACHE_BUST}`);

// Runtime config (populated from Google Sheets)
const CONFIG = {
  deadline: null,
  currentWeek: null,
};

// Contestants data (populated from Google Sheets)
let CONTESTANTS = [];
let HISTORY = [];

// ==============================================
// CSV PARSING & DATA FETCHING
// ==============================================

function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

  return lines.slice(1).map(line => {
    // Handle quoted values with commas inside
    const values = [];
    let current = '';
    let inQuotes = false;

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    const row = {};
    headers.forEach((header, i) => {
      row[header] = values[i] || '';
    });
    return row;
  });
}

async function fetchLeaderboardData() {
  try {
    const response = await fetch(LEADERBOARD_CSV_URL);
    const csvText = await response.text();
    const data = parseCSV(csvText);

    // Map to expected format (columns: Codename, Current Rank, Previous Rank, Shamed, Name)
    CONTESTANTS = data
      .filter(row => row['Codename'] && row['Current Rank'])
      .map(row => ({
        codename: row['Codename'],
        name: row['Name'] || '',
        currentRank: parseInt(row['Current Rank'], 10),
        previousRank: parseInt(row['Previous Rank'], 10) || parseInt(row['Current Rank'], 10),
        shamed: row['Shamed'] === 'TRUE',
      }))
      .sort((a, b) => a.currentRank - b.currentRank);

    return CONTESTANTS;
  } catch (error) {
    console.error('Failed to fetch leaderboard:', error);
    return [];
  }
}

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

async function fetchConfigData() {
  try {
    const response = await fetch(CONFIG_CSV_URL);
    const csvText = await response.text();
    const data = parseCSV(csvText);

    // Config sheet has key-value pairs in columns A and B
    data.forEach(row => {
      const key = Object.values(row)[0];
      const value = Object.values(row)[1];

      if (key === 'deadline') {
        CONFIG.deadline = value;
      } else if (key === 'current_week') {
        CONFIG.currentWeek = parseInt(value, 10);
      }
    });

    return CONFIG;
  } catch (error) {
    console.error('Failed to fetch config:', error);
    return CONFIG;
  }
}

// ==============================================
// CALCULATIONS (ranking done in spreadsheet)
// ==============================================

function getMovement(currentRank, previousRank) {
  const diff = previousRank - currentRank;
  if (diff > 0) return { symbol: `↑${diff}`, class: 'movement-up' };
  if (diff < 0) return { symbol: `↓${Math.abs(diff)}`, class: 'movement-down' };
  return { symbol: '–', class: 'movement-same' };
}

function getRankClass(rank) {
  if (rank === 1) return 'gold';
  if (rank === 2) return 'silver';
  if (rank === 3) return 'bronze';
  return '';
}

function getRankEmoji(rank) {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `${rank}.`;
}

// ==============================================
// WEEK 12 REVEAL
// ==============================================

function handleRevealClick(e) {
  const item = e.currentTarget;
  const nameEl = item.querySelector('.leaderboard-name');

  if (item.classList.contains('reveal-hidden')) {
    // Hidden → show codename
    nameEl.textContent = item.dataset.codename;
    item.classList.remove('reveal-hidden');
    item.classList.add('reveal-codename');
  } else if (item.classList.contains('reveal-codename')) {
    // Codename → show real name
    nameEl.textContent = item.dataset.name;
    item.classList.remove('reveal-codename');
    item.classList.add('reveal-done');
    item.style.cursor = 'default';
    item.removeEventListener('click', handleRevealClick);
  }
}

// ==============================================
// RENDER LEADERBOARD
// ==============================================

function renderLeaderboard() {
  const container = document.getElementById('leaderboard');

  if (CONTESTANTS.length === 0) {
    container.innerHTML = '<div class="loading">Loading leaderboard...</div>';
    return;
  }

  // All contestants appear in leaderboard; shamed ones also appear in wall of shame
  const leaders = CONTESTANTS;
  const shamed = CONTESTANTS.filter(c => c.shamed);

  const isFinalWeek = CONFIG.currentWeek === 12;

  // Render main leaderboard
  container.innerHTML = leaders.map(contestant => {
    const movement = getMovement(contestant.currentRank, contestant.previousRank);
    const rankClass = getRankClass(contestant.currentRank);
    const itemRankClass = contestant.currentRank <= 3 ? `rank-${contestant.currentRank}` : '';
    const rank = contestant.currentRank;

    // Week 12 reveal: rank 1 & 3 start hidden (two clicks), others show codename (one click)
    const needsTwoClicks = isFinalWeek && (rank === 1 || rank === 3);
    const needsOneClick = isFinalWeek && !needsTwoClicks;
    const revealClass = needsTwoClicks ? 'reveal-hidden' : needsOneClick ? 'reveal-codename' : '';
    const displayName = needsTwoClicks ? '???' : contestant.codename;

    return `
      <div class="leaderboard-item ${itemRankClass} ${revealClass}"
           ${isFinalWeek ? `data-codename="${contestant.codename}" data-name="${contestant.name}"` : ''}>
        <span class="leaderboard-rank ${rankClass}">${getRankEmoji(rank)}</span>
        <span class="leaderboard-name">${displayName}</span>
        <span class="leaderboard-movement ${movement.class}">${movement.symbol}</span>
      </div>
    `;
  }).join('');

  // Week 12: attach click handlers for progressive reveal
  if (isFinalWeek) {
    container.querySelectorAll('.leaderboard-item').forEach(item => {
      item.style.cursor = 'pointer';
      item.addEventListener('click', handleRevealClick);
    });
  }

  // Render Cheat Meal Champions (shamed contestants)
  const shameContainer = document.getElementById('shame-list');
  const shameSection = document.getElementById('shame-section');

  // Always show the section, but with different content based on shamed count
  shameSection.style.display = 'block';

  if (shamed.length > 0) {
    shameContainer.innerHTML = shamed.map(contestant => `
      <div class="shame-item">
        <span class="shame-rank">🍔</span>
        <span class="shame-name">${contestant.codename}</span>
      </div>
    `).join('');
  } else {
    // Empty state - everyone is doing well!
    shameContainer.innerHTML = `
      <div class="shame-empty">
        <span class="shame-empty-emoji">🎉</span>
        <span class="shame-empty-headline">Cravings under control!</span>
        <span class="shame-empty-text">Good job, everyone! 💪</span>
      </div>
    `;
  }
}

// ==============================================
// RANK HISTORY GRID
// ==============================================

function renderChart() {
  if (HISTORY.length === 0) return;

  const container = document.getElementById('rank-grid');
  if (!container) return;

  // (1) Determine how many weeks have data
  const maxWeek = HISTORY.reduce((max, h) => {
    const lastWeek = h.ranks.reduce((last, r, i) => r !== null ? i + 1 : last, 0);
    return Math.max(max, lastWeek);
  }, 0);

  if (maxWeek === 0) return;

  // (2) Assign a consistent color to each contestant
  const colorMap = {};
  HISTORY.forEach((h, i) => {
    colorMap[h.codename] = GRID_COLORS[i % GRID_COLORS.length];
  });

  // (3) Build grid using DOM methods
  const inner = document.createElement('div');
  inner.className = 'rank-grid-inner';

  // Rank labels column
  const rankCol = document.createElement('div');
  rankCol.className = 'rank-grid-col rank-grid-labels';
  const labelHeader = document.createElement('div');
  labelHeader.className = 'rank-grid-header';
  labelHeader.textContent = '';
  rankCol.appendChild(labelHeader);
  for (let r = 1; r <= HISTORY.length; r++) {
    const label = document.createElement('div');
    label.className = 'rank-grid-label';
    label.textContent = `#${r}`;
    rankCol.appendChild(label);
  }
  inner.appendChild(rankCol);

  for (let w = 0; w < maxWeek; w++) {
    const weekEntries = HISTORY
      .filter(h => h.ranks[w] !== null)
      .map(h => ({ codename: h.codename, rank: h.ranks[w] }))
      .sort((a, b) => a.rank - b.rank);

    const col = document.createElement('div');
    col.className = 'rank-grid-col';

    const header = document.createElement('div');
    header.className = 'rank-grid-header';
    header.textContent = `Wk${w + 1}`;
    col.appendChild(header);

    weekEntries.forEach(entry => {
      const cell = document.createElement('div');
      cell.className = 'rank-grid-cell';
      cell.style.background = colorMap[entry.codename];
      cell.textContent = entry.codename;
      col.appendChild(cell);
    });

    inner.appendChild(col);
  }

  container.replaceChildren(inner);
}

// ==============================================
// COUNTDOWN TIMER
// ==============================================

function updateCountdown() {
  const deadline = new Date(CONFIG.deadline).getTime();
  const now = new Date().getTime();
  const distance = deadline - now;

  const countdownEl = document.getElementById('countdown');

  if (distance < 0) {
    document.getElementById('days').textContent = '0';
    document.getElementById('hours').textContent = '0';
    document.getElementById('minutes').textContent = '0';
    document.getElementById('seconds').textContent = '0';
    return;
  }

  const days = Math.floor(distance / (1000 * 60 * 60 * 24));
  const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((distance % (1000 * 60)) / 1000);

  document.getElementById('days').textContent = days;
  document.getElementById('hours').textContent = hours;
  document.getElementById('minutes').textContent = minutes;
  document.getElementById('seconds').textContent = seconds;

  // Add urgency classes
  if (days < 7) {
    countdownEl.classList.add('urgent');
  }
  if (days < 3) {
    countdownEl.classList.add('critical');
  }
}

// ==============================================
// FOOD SLIDESHOW - Stacking Photos
// ==============================================

const GRID_COLORS = [
  '#e74c3c', '#3498db', '#27ae60', '#e67e22',
  '#8e44ad', '#f1c40f', '#1abc9c', '#d35400', '#2c3e50',
];

const FOOD_IMAGES = [
  'https://panlasangpinoy.com/wp-content/uploads/2020/11/Pork-sisig-with-calamansi.jpg',
  'https://panlasangpinoy.com/wp-content/uploads/2011/05/512px-Halo_halo1.jpg',
  'https://panlasangpinoy.com/wp-content/uploads/2024/04/Chicken-Adobo-Panlasang-Pinoy.jpg',
  'https://panlasangpinoy.com/wp-content/uploads/2009/05/how-to-cook-kare-kare.jpg',
  'https://panlasangpinoy.com/wp-content/uploads/2009/02/menudo-recipe.jpg',
  'https://panlasangpinoy.com/wp-content/uploads/2009/03/garlic-butter-shrimp-1.jpg',
  'https://www.kawalingpinoy.com/wp-content/uploads/2020/06/authentic-chicken-inasal-8.jpg',
  'https://panlasangpinoy.com/wp-content/uploads/2018/12/Lumpiang-Shanghai.jpg',
  'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=800',
  'https://my-pinoy-store.s3.cdn-upgates.com/_cache/2/e/2e3049bd7e35955bac538b47e7366508-y5e0e4dc38a288-san-miguel-beer.jpg',
];

let currentPhotoIndex = 0;
let photoStackCount = 0;
const MAX_VISIBLE_PHOTOS = 5;

function getRandomRotation() {
  return (Math.random() - 0.5) * 20; // -10 to +10 degrees
}

function getRandomOffset() {
  return {
    x: (Math.random() - 0.5) * 30, // -15 to +15 px
    y: (Math.random() - 0.5) * 30,
  };
}

function addPhotoToStack() {
  const stack = document.getElementById('photo-stack');
  if (!stack) return;

  const imageUrl = FOOD_IMAGES[currentPhotoIndex];
  const rotation = getRandomRotation();
  const offset = getRandomOffset();

  const photoEl = document.createElement('div');
  photoEl.className = 'stacked-photo';
  photoEl.style.zIndex = photoStackCount;
  photoEl.innerHTML = `<img src="${imageUrl}" alt="Delicious food">`;

  // Start off-screen (from top)
  photoEl.style.transform = `translate(calc(-50% + ${offset.x}px), -150%) rotate(${rotation}deg)`;

  stack.appendChild(photoEl);

  // Animate into place
  requestAnimationFrame(() => {
    photoEl.classList.add('visible');
    photoEl.style.transform = `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) rotate(${rotation}deg)`;
  });

  // Remove old photos if too many
  const photos = stack.querySelectorAll('.stacked-photo');
  if (photos.length > MAX_VISIBLE_PHOTOS) {
    const oldPhoto = photos[0];
    oldPhoto.style.opacity = '0';
    setTimeout(() => oldPhoto.remove(), 600);
  }

  currentPhotoIndex = (currentPhotoIndex + 1) % FOOD_IMAGES.length;
  photoStackCount++;
}

function initPhotoSlideshow() {
  // Add first photo immediately
  addPhotoToStack();

  // Add new photos every 2.5 seconds
  setInterval(addPhotoToStack, 2500);
}

// ==============================================
// CURTAIN REVEAL
// ==============================================

function initCurtainReveal() {
  const curtain = document.getElementById('curtain');
  const button = document.getElementById('curtain-button');
  const mainContent = document.getElementById('main-content');

  button.addEventListener('click', () => {
    // Open the curtain
    curtain.classList.add('opening');

    // Reveal main content
    mainContent.classList.add('revealed');

    // Start the photo slideshow after curtain opens
    setTimeout(() => {
      initPhotoSlideshow();
    }, 800);

    // Hide curtain completely after animation
    setTimeout(() => {
      curtain.classList.add('hidden');
    }, 1500);
  });
}

// ==============================================
// INIT
// ==============================================

async function init() {
  // Show loading state
  renderLeaderboard();

  // Setup curtain reveal (while data loads)
  initCurtainReveal();

  // Fetch data from Google Sheets
  await Promise.all([
    fetchConfigData(),
    fetchLeaderboardData(),
    fetchHistoryData(),
  ]);

  // Render with live data
  renderLeaderboard();
  renderChart();
  updateCountdown();
  setInterval(updateCountdown, 1000);

  // Auto-refresh leaderboard every 5 minutes
  setInterval(async () => {
    await fetchLeaderboardData();
    renderLeaderboard();
  }, 5 * 60 * 1000);
}

document.addEventListener('DOMContentLoaded', init);

// Deploy trigger 1770131954
// Deploy trigger 1770132140
