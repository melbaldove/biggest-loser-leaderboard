# Dramatic Reveal Animation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the tame week-12 reveal with a slot-machine scramble + confetti burst that reads well on a live Zoom screen share.

**Architecture:** `handleRevealClick` delegates to a new `scrambleReveal()` that animates text via `setInterval` with decelerating speed, then calls `spawnConfetti()` on the final reveal. All CSS-only particles (absolutely positioned divs). No libraries.

**Tech Stack:** Vanilla JS, CSS animations/transitions

---

### Task 1: Add scramble reveal function

**Files:**
- Modify: `app.js:166-187` (replace `handleRevealClick` and add `scrambleReveal`)

**Step 1: Replace handleRevealClick with scramble-aware version**

Replace the entire `handleRevealClick` function and add `scrambleReveal` above it:

```javascript
// ==============================================
// WEEK 12 REVEAL
// ==============================================

function scrambleReveal(nameEl, finalText, pool, onComplete) {
  // (1) Disable clicks during animation
  const item = nameEl.closest('.leaderboard-item');
  item.style.pointerEvents = 'none';
  item.classList.add('reveal-scrambling');

  // (2) Scramble phase — fast cycling through random pool entries
  const scrambleDuration = 1500;
  const slowdownDuration = 800;
  let elapsed = 0;
  let interval = 60;
  let timer;

  function tick() {
    const randomEntry = pool[Math.floor(Math.random() * pool.length)];
    nameEl.textContent = randomEntry;
    elapsed += interval;

    if (elapsed < scrambleDuration) {
      // Fast phase
      timer = setTimeout(tick, interval);
    } else if (elapsed < scrambleDuration + slowdownDuration) {
      // Slowdown phase — decelerate
      interval = Math.min(interval * 1.5, 400);
      timer = setTimeout(tick, interval);
    } else {
      // Lock in
      nameEl.textContent = finalText;
      item.classList.remove('reveal-scrambling');
      item.style.pointerEvents = '';
      if (onComplete) onComplete();
    }
  }

  timer = setTimeout(tick, interval);
}

function handleRevealClick(e) {
  const item = e.currentTarget;
  const nameEl = item.querySelector('.leaderboard-name');

  // Build scramble pools from all contestants
  const codenames = CONTESTANTS.map(c => c.codename);
  const names = CONTESTANTS.map(c => c.name).filter(Boolean);

  if (item.classList.contains('reveal-hidden')) {
    // Hidden → scramble to codename
    scrambleReveal(nameEl, item.dataset.codename, codenames, () => {
      item.classList.remove('reveal-hidden');
      item.classList.add('reveal-codename', 'reveal-pop-small');
    });
  } else if (item.classList.contains('reveal-codename')) {
    // Codename → scramble to real name (appended)
    const finalText = `${item.dataset.codename} (${item.dataset.name})`;
    scrambleReveal(nameEl, finalText, names, () => {
      item.classList.remove('reveal-codename');
      item.classList.add('reveal-done');
      item.style.cursor = 'default';
      item.removeEventListener('click', handleRevealClick);
      spawnConfetti(item);
    });
  }
}
```

**Step 2: Commit**

```bash
git add app.js
git commit -m "Add slot machine scramble to reveal animation"
```

---

### Task 2: Add confetti burst function

**Files:**
- Modify: `app.js` (add `spawnConfetti` function before `handleRevealClick`)

**Step 1: Add spawnConfetti function**

Insert before the `handleRevealClick` function:

```javascript
function spawnConfetti(item) {
  const rect = item.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const count = 30;

  for (let i = 0; i < count; i++) {
    const particle = document.createElement('div');
    particle.className = 'confetti-particle';
    particle.style.left = `${centerX}px`;
    particle.style.top = `${centerY}px`;
    particle.style.backgroundColor = GRID_COLORS[Math.floor(Math.random() * GRID_COLORS.length)];

    // Random direction and distance
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
    const distance = 80 + Math.random() * 120;
    const dx = Math.cos(angle) * distance;
    const dy = Math.sin(angle) * distance - 40; // bias upward
    particle.style.setProperty('--dx', `${dx}px`);
    particle.style.setProperty('--dy', `${dy}px`);
    particle.style.animationDelay = `${Math.random() * 0.15}s`;

    document.body.appendChild(particle);
    particle.addEventListener('animationend', () => particle.remove());
  }
}
```

**Step 2: Commit**

```bash
git add app.js
git commit -m "Add confetti burst on final name reveal"
```

---

### Task 3: Add rank-colored glow to final reveal

**Files:**
- Modify: `app.js` (update `handleRevealClick` codename→name branch)

**Step 1: Add glow color data attribute in renderLeaderboard**

In `renderLeaderboard`, inside the HTML template (around line 222), add a `data-glow` attribute:

The glow colors: rank 1 = `#ffd700` (gold), rank 2 = `#c0c0c0` (silver), rank 3 = `#cd7f32` (bronze), others = `#667eea` (purple).

In the template, add to the div attributes:

```javascript
data-glow="${rank === 1 ? '#ffd700' : rank === 2 ? '#c0c0c0' : rank === 3 ? '#cd7f32' : '#667eea'}"
```

**Step 2: Apply glow in spawnConfetti callback**

In the `handleRevealClick` codename→name `onComplete`, after `spawnConfetti(item)`, add:

```javascript
const glowColor = item.dataset.glow || '#667eea';
item.style.boxShadow = `0 0 30px ${glowColor}, 0 0 60px ${glowColor}`;
setTimeout(() => { item.style.boxShadow = ''; }, 1500);
```

**Step 3: Commit**

```bash
git add app.js
git commit -m "Add rank-colored glow on final reveal"
```

---

### Task 4: Update CSS for scramble, confetti, and enhanced pop

**Files:**
- Modify: `styles.css:526-563` (replace existing WEEK 12 REVEAL section)

**Step 1: Replace the WEEK 12 REVEAL CSS section**

Replace everything between the `WEEK 12 REVEAL` and `CHEAT MEAL CHAMPIONS` section comments:

```css
/* ==============================================
   WEEK 12 REVEAL
   ============================================== */

.leaderboard-item.reveal-hidden .leaderboard-name,
.leaderboard-item.reveal-codename .leaderboard-name {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.leaderboard-item.reveal-hidden .leaderboard-name {
  font-style: italic;
  color: #999;
  letter-spacing: 4px;
  background: linear-gradient(90deg, #999 0%, #ccc 50%, #999 100%);
  background-size: 200% 100%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: shimmer-text 2s ease-in-out infinite;
}

.leaderboard-item.reveal-hidden,
.leaderboard-item.reveal-codename {
  animation: reveal-pulse 2s ease-in-out infinite;
}

/* Scrambling state — rapid text cycling */
.leaderboard-item.reveal-scrambling .leaderboard-name {
  font-style: normal;
  color: #1a1a1a;
  letter-spacing: 0.5px;
  background: none;
  -webkit-text-fill-color: unset;
}

/* Small pop after codename reveal */
.leaderboard-item.reveal-pop-small {
  animation: reveal-pop-small 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* Big pop after final name reveal */
.leaderboard-item.reveal-done {
  animation: reveal-pop-big 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
  transition: box-shadow 1.5s ease-out;
}

.leaderboard-item.reveal-done .leaderboard-name {
  font-weight: 800;
}

/* Confetti particles */
.confetti-particle {
  position: fixed;
  width: 8px;
  height: 8px;
  border-radius: 2px;
  pointer-events: none;
  z-index: 9999;
  animation: confetti-fly 1s ease-out forwards;
}

@keyframes shimmer-text {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

@keyframes reveal-pulse {
  0%, 100% { box-shadow: 4px 4px 0 #222; }
  50% { box-shadow: 4px 4px 12px rgba(34, 34, 34, 0.4); }
}

@keyframes reveal-pop-small {
  0% { transform: scale(1); }
  50% { transform: scale(1.04); }
  100% { transform: scale(1); }
}

@keyframes reveal-pop-big {
  0% { transform: scale(1); }
  40% { transform: scale(1.06); }
  100% { transform: scale(1); }
}

@keyframes confetti-fly {
  0% {
    opacity: 1;
    transform: translate(0, 0) rotate(0deg) scale(1);
  }
  100% {
    opacity: 0;
    transform: translate(var(--dx), var(--dy)) rotate(720deg) scale(0.3);
  }
}
```

**Step 2: Commit**

```bash
git add styles.css
git commit -m "Add scramble, confetti, and shimmer CSS for dramatic reveal"
```

---

### Task 5: Final integration and push

**Step 1: Test locally**

Open `index.html` in browser. Temporarily set `CONFIG.currentWeek = 12` in the console (or in the config sheet) and verify:

- "???" slots shimmer
- Click 1: text scrambles through codenames (~2.3s), lands on codename, small pop
- Click 2: text scrambles through names (~2.3s), lands on "CODENAME (Name)", big pop + confetti + glow
- Other rank clicks: scramble + confetti + glow on single click
- Confetti particles clean themselves up (no DOM leak)

**Step 2: Push to main**

```bash
git push origin main
```
