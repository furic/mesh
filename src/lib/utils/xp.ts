// XP / level math, shared by client UI and (later) server agents.
//
// Progression: level = floor(sqrt(xp / BASE)) + 1. Level 1 spans 0..BASE-1
// XP; each subsequent level requires increasingly more XP. With BASE=500:
//   Level 1 → 0–499 xp     · Level 2 →   500 (+500)
//   Level 3 → 2,000 (+1500) · Level 4 → 4,500 (+2500)
//   Level 5 → 8,000 (+3500) · Level 6 → 12,500 (+4500)
//   Level 7 → 18,000        · Level 10 → 40,500
//
// Inverse identity: levelForXp(xpForLevel(L)) === L for L >= 1.

const BASE = 500;

export function levelForXp(xp: number): number {
  const safe = Math.max(0, xp);
  return Math.floor(Math.sqrt(safe / BASE)) + 1;
}

// XP threshold to *enter* level L. Level 1 starts at 0 by convention.
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
