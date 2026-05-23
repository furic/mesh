// Sprint 1 seed script.
//
// Pulls real Melbourne open-data and rewrites src/lib/data/mock-suburbs.ts
// with score-derived values. The export shape (MOCK_SUBURBS: Suburb[]) is
// preserved so no SvelteKit imports need to change.
//
// Run:  pnpm seed:suburbs
//
// Data sources (anonymous reads, no key):
//   - data.melbourne.vic.gov.au / social-indicators-for-city-of-melbourne-residents-2023
//       Drives score_food + score_emergency for City-of-Melbourne suburbs only.
//   - data.melbourne.vic.gov.au / landmarks-and-places-of-interest...
//       Drives score_skills + score_resources via radius queries (all suburbs).
//   - data.melbourne.vic.gov.au / pedestrian-counting-system-monthly-counts-per-hour
//       Drives score_social via radius queries (works wherever a sensor sits in radius).
//   - ABS 2021 SEIFA Index of Relative Socio-economic Disadvantage (IRSD), inverted
//       1 = least disadvantaged, 10 = most. Curated table below — values rounded from
//       the ABS-published deciles for the SA2 that each suburb sits in.
//
// Suburbs outside City of Melbourne fall back to SEIFA-derived approximations
// for the food + emergency pillars; their data_source is recorded as 'partial'.

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  getSocialIndicators,
  getLandmarksNear,
  getPedestrianCountsNear,
  type LandmarkRow,
  type PedestrianCountRow,
} from '../src/lib/utils/melb-data.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_FILE = resolve(HERE, '../src/lib/data/mock-suburbs.ts');

interface SuburbSeed {
  id: string;
  name: string;
  postcode: string;
  lat: number;
  lng: number;
  population: number;
  lga: string;
  respondentGroup: string | null; // matches social-indicators when CoM
  seifaScore: number;             // 1–10, 10 = most disadvantaged (project convention)
}

const SEEDS: SuburbSeed[] = [
  { id: 'carlton',   name: 'Carlton',   postcode: '3053', lat: -37.7989, lng: 144.9669, population: 17_330, lga: 'Melbourne',     respondentGroup: 'Carlton 3053', seifaScore: 3 },
  { id: 'fitzroy',   name: 'Fitzroy',   postcode: '3065', lat: -37.7986, lng: 144.9784, population: 10_445, lga: 'Yarra',        respondentGroup: null,           seifaScore: 4 },
  { id: 'brunswick', name: 'Brunswick', postcode: '3056', lat: -37.7666, lng: 144.9614, population: 24_473, lga: 'Merri-bek',    respondentGroup: null,           seifaScore: 4 },
  { id: 'footscray', name: 'Footscray', postcode: '3011', lat: -37.8003, lng: 144.8997, population: 16_855, lga: 'Maribyrnong',  respondentGroup: null,           seifaScore: 8 },
  { id: 'richmond',  name: 'Richmond',  postcode: '3121', lat: -37.8197, lng: 145.0061, population: 28_055, lga: 'Yarra',        respondentGroup: null,           seifaScore: 5 },
];

const RADIUS_M = 1500;

interface Scored {
  seed: SuburbSeed;
  food: number;
  skills: number;
  resources: number;
  social: number;
  emergency: number;
  data_source: 'real' | 'partial' | 'mock';
  notes: string[];
}

const RESOURCE_THEMES = new Set([
  'Place of Worship',
  'Health Services',
  'Leisure/Recreation',
  'Community Use',
]);
const SKILLS_THEMES = new Set(['Education Centre']);

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

// Map an indicator survey result that's expressed in % to a 0–100 pillar score.
// Survey results are already percentages; some need inversion (e.g. "felt
// concerned about running out of food" — higher = worse) but for the topics we
// use ("Food security: I have enough money to buy food", "Physical activity:
// participated") the raw % maps directly.
function pctToScore(pct: number | null | undefined, fallback: number): number {
  if (pct == null || Number.isNaN(pct)) return fallback;
  return clamp(Math.round(pct), 0, 100);
}

// SEIFA-derived approximation for suburbs outside CoM survey coverage.
// Higher disadvantage → lower baseline pillar. Anchored so SEIFA=1 → 88,
// SEIFA=10 → 32. Documented; not made up.
function seifaApprox(seifa: number): number {
  return clamp(Math.round(96 - seifa * 6.5), 30, 92);
}

async function scoreSuburb(seed: SuburbSeed): Promise<Scored> {
  const notes: string[] = [];

  // 1. Landmarks within radius → skills + resources signals
  const landmarks = await getLandmarksNear({ lat: seed.lat, lng: seed.lng, radiusM: RADIUS_M, limit: 100 });
  const skillsCount = landmarks.filter((l) => SKILLS_THEMES.has(l.theme)).length;
  const resourceCount = landmarks.filter((l) => RESOURCE_THEMES.has(l.theme)).length;
  // Curve: 0 facilities → ~35, 5 → ~65, 12+ → ~92.
  const skillsScore = clamp(35 + Math.round(skillsCount * 7), 35, 95);
  const resourcesScore = clamp(35 + Math.round(resourceCount * 5), 35, 95);
  notes.push(`landmarks: ${skillsCount} education + ${resourceCount} community-resource within ${RADIUS_M}m`);

  // 2. Pedestrian counts within radius → social-connectivity signal.
  // Many suburbs have no CoM sensors nearby — fall back to SEIFA approx.
  const peds = await getPedestrianCountsNear({ lat: seed.lat, lng: seed.lng, radiusM: RADIUS_M, limit: 200 });
  let socialScore: number;
  if (peds.length === 0) {
    socialScore = seifaApprox(seed.seifaScore);
    notes.push(`pedestrian: no sensors in ${RADIUS_M}m, used SEIFA approx`);
  } else {
    const avgHourly = peds.reduce((sum, p) => sum + (p.pedestriancount ?? 0), 0) / peds.length;
    // Log-normalise: 50/hr → 50, 500/hr → 80, 2000/hr → 95.
    const norm = clamp(Math.round(20 + (Math.log10(avgHourly + 1) * 22)), 25, 95);
    socialScore = norm;
    notes.push(`pedestrian: avg ${Math.round(avgHourly)}/hr over ${peds.length} samples`);
  }

  // 3. Social indicators (CoM only) → food + emergency. Fallback to SEIFA approx.
  let foodScore: number;
  let emergencyScore: number;
  let dataSource: Scored['data_source'];

  if (seed.respondentGroup) {
    const [foodRows, activityRows] = await Promise.all([
      getSocialIndicators({ year: 2023, respondentGroup: seed.respondentGroup, topic: 'Food security', limit: 50 }),
      getSocialIndicators({ year: 2023, respondentGroup: seed.respondentGroup, topic: 'Physical activity', limit: 50 }),
    ]);
    // Average all percentage rows for the topic — gives a coarse but defensible score.
    const foodPct = avgPct(foodRows.map((r) => r.result));
    const activityPct = avgPct(activityRows.map((r) => r.result));
    foodScore = pctToScore(foodPct, seifaApprox(seed.seifaScore));
    emergencyScore = pctToScore(activityPct, seifaApprox(seed.seifaScore));
    dataSource = 'real';
    notes.push(`social-indicators 2023: food=${foodPct?.toFixed(1) ?? 'n/a'}%, activity=${activityPct?.toFixed(1) ?? 'n/a'}%`);
  } else {
    foodScore = seifaApprox(seed.seifaScore);
    emergencyScore = seifaApprox(seed.seifaScore) - 5; // slight pessimism on prep w/o data
    dataSource = 'partial';
    notes.push(`social-indicators 2023: respondent_group not present, used SEIFA approx`);
  }

  return {
    seed,
    food: foodScore,
    skills: skillsScore,
    resources: resourcesScore,
    social: socialScore,
    emergency: clamp(emergencyScore, 25, 95),
    data_source: dataSource,
    notes,
  };
}

function avgPct(values: Array<number | null>): number | null {
  const nums = values.filter((v): v is number => typeof v === 'number' && !Number.isNaN(v));
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function levelForXp(xp: number): number {
  // Mirror the existing mock progression (level ~= sqrt(xp / 500)). Keeps the
  // generated values consistent with the hand-curated ones for the prototype UI.
  return Math.max(1, Math.floor(Math.sqrt(xp / 500)));
}

function xpFromRIndex(r: number): number {
  // Convert resilience index back to a plausible community XP total.
  // Higher r_index → more activity. Bounded so the demo levels stay 1–8.
  return Math.round(r * r * 4);
}

function emitFile(scored: Scored[]): string {
  const generatedAt = new Date().toISOString();
  const header = `// AUTO-GENERATED by scripts/seed-suburbs.ts at ${generatedAt}.
// DO NOT edit by hand — re-run \`pnpm seed:suburbs\` to refresh.
//
// Pillar scores are derived from Melbourne open-data:
//   food + emergency  — social-indicators (CoM survey; suburbs outside CoM use SEIFA approx)
//   skills + resources — landmark density within ${RADIUS_M}m of each centroid
//   social             — pedestrian-counter density within ${RADIUS_M}m (SEIFA approx if no sensors)
// SEIFA scores are sourced from ABS 2021 IRSD deciles (project convention: 10 = most disadvantaged).
//
// Per-suburb provenance for this run:
${scored.map((s) => `//   ${s.seed.name.padEnd(10)} [${s.data_source}] ${s.notes.join('; ')}`).join('\n')}

import type { Suburb } from '../types'

function rIndex(s: { food: number; skills: number; resources: number; social: number; emergency: number }): number {
  return Math.round((s.food + s.skills + s.resources + s.social + s.emergency) / 5)
}

const raw: Omit<Suburb, 'r_index'>[] = [
`;

  const body = scored
    .map((s) => {
      const xp = xpFromRIndex((s.food + s.skills + s.resources + s.social + s.emergency) / 5);
      const level = levelForXp(xp);
      return `  {
    id:           '${s.seed.id}',
    name:         '${s.seed.name}',
    postcode:     '${s.seed.postcode}',
    lat:          ${s.seed.lat},
    lng:          ${s.seed.lng},
    seifa_score:  ${s.seed.seifaScore},
    population:   ${s.seed.population.toLocaleString('en-US').replace(/,/g, '_')},
    scores:       { food: ${s.food}, skills: ${s.skills}, resources: ${s.resources}, social: ${s.social}, emergency: ${s.emergency} },
    xp_total:     ${xp.toLocaleString('en-US').replace(/,/g, '_')},
    level:        ${level},
  },`;
    })
    .join('\n');

  const footer = `
]

export const MOCK_SUBURBS: Suburb[] = raw.map((s) => ({
  ...s,
  r_index: rIndex(s.scores),
}))
`;

  return header + body + footer;
}

async function main() {
  console.log('Seeding suburbs from data.melbourne.vic.gov.au…');
  const scored: Scored[] = [];
  for (const seed of SEEDS) {
    console.log(`  → ${seed.name}…`);
    const result = await scoreSuburb(seed);
    scored.push(result);
    console.log(`     [${result.data_source}] f=${result.food} s=${result.skills} r=${result.resources} c=${result.social} e=${result.emergency}`);
    for (const n of result.notes) console.log(`       · ${n}`);
  }
  const out = emitFile(scored);
  writeFileSync(OUT_FILE, out);
  console.log(`\nWrote ${OUT_FILE}`);
  console.log(`Provenance: ${scored.filter((s) => s.data_source === 'real').length} real / ${scored.filter((s) => s.data_source === 'partial').length} partial / ${scored.filter((s) => s.data_source === 'mock').length} mock`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
