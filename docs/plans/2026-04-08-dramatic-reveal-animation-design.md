# Dramatic Week 12 Reveal Animation Design

**Context:** Week 12 is the final week of the PHP 30K Weight Loss Challenge. The leaderboard is revealed live over Zoom. The current reveal animation (subtle box-shadow pulse + tiny scale pop) is too tame for a live reveal party.

**Goal:** Make each name reveal feel like an award show moment — build suspense, reward the click, read well on compressed Zoom video.

**Approach:** Slot Machine Scramble + Confetti Burst. Vanilla JS/CSS, no libraries.

---

## Scramble Mechanic

On each click that reveals text, instead of instantly setting the value:

1. **Scramble phase (~1.5s)** — text rapidly cycles through random codenames/names from the contestant pool every 60ms, creating a lottery feel.
2. **Slowdown phase (~0.8s)** — interval gradually increases (100ms > 200ms > 400ms) like a roulette wheel winding down.
3. **Lock-in** — final real value snaps into place.

Applies to both reveal stages:
- Click 1 (??? > codename): scrambles through codenames
- Click 2 (codename > name): scrambles through real names

## Lock-in Celebration

When the scramble finishes:

- **Row pop** — row scales to ~1.06x with spring ease, settles back. Visible on Zoom.
- **Confetti burst (final reveal only)** — ~30 colored particles (from GRID_COLORS palette) shoot from the row in random directions, fade over ~1s. Absolutely positioned divs, no library.
- **Rank-colored glow (final reveal only)** — brief box-shadow glow: gold for rank 1, silver for rank 2, bronze for rank 3.

Codename reveal (click 1) gets scramble + smaller pop only. Name reveal (click 2) gets the full celebration.

## Pre-reveal State

- Existing pulsing box-shadow (signals clickability)
- Subtle shimmer/gradient shift across "???" text for Zoom visibility

## Effect Matrix

| Moment | Effect |
|--------|--------|
| Pre-click | Pulsing box-shadow + text shimmer on "???" slots |
| Click 1 (??? > codename) | Scramble (~2.3s) + small row pop |
| Click 2 (codename > name) | Scramble (~2.3s) + big row pop + confetti + rank glow |
| Other ranks (codename > name) | Scramble (~2.3s) + confetti + rank glow |

## Constraints

- Vanilla JS/CSS only (no libraries)
- Must read well on compressed Zoom screen share
- Bold, high-contrast effects over subtle ones
