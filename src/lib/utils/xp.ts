// XP / level math, shared by client UI and (later) server agents.
//
// Progression: level = floor(sqrt(xp / BASE)). This gives a gentle curve —
// each level costs (2L+1) × BASE more XP than the last. With BASE=500:
//   level 1 → 500 xp · level 2 → 2000 · level 3 → 4500 · level 4 → 8000 …
// Reaching level 10 takes 50,000 XP. Reaching level 20 takes 200,000.
//
// This mirrors the formula used by scripts/seed-suburbs.ts so suburb-level
// progression and resident-level progression share the same shape.

const BASE = 500;

export function levelForXp(xp: number): number {
  return Math.max(1, Math.floor(Math.sqrt(Math.max(0, xp) / BASE)));
}

// XP threshold for entering level L. Level 1 starts at 0 by convention.
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return BASE * (level - 1) * (level - 1);
}

export interface LevelProgress {
  level:           number;
  xpInLevel:       number;     // xp earned since entering the current level
  xpForNextLevel:  number;     // xp needed for the current level's full bar
  progress:        number;     // 0..1
  total:           number;     // raw xp
}

export function levelProgress(xp: number): LevelProgress {
  const safeXp = Math.max(0, Math.floor(xp));
  const level  = levelForXp(safeXp);
  const floor  = xpForLevel(level);
  const ceil   = xpForLevel(level + 1);
  const span   = Math.max(1, ceil - floor);
  return {
    level,
    xpInLevel:      safeXp - floor,
    xpForNextLevel: span,
    progress:       Math.min(1, (safeXp - floor) / span),
    total:          safeXp,
  };
}
