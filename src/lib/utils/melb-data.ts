// Typed wrappers around https://data.melbourne.vic.gov.au/ (Opendatasoft v2.1).
// All endpoints used here are anonymous-readable; MELBOURNE_DATA_APP_TOKEN is
// only needed to raise rate limits and is intentionally NOT sent by default.

const BASE = 'https://data.melbourne.vic.gov.au/api/explore/v2.1';

export interface OdsResponse<T> {
  total_count: number;
  results: T[];
}

export interface SocialIndicatorRow {
  indicator: string;
  type: string;
  topic: string;
  description: string;
  response: string;
  year: string;
  respondent_group: string;
  sample_size: number | null;
  result: number | null;
  format: string;
}

export interface LandmarkRow {
  theme: string;
  sub_theme: string;
  feature_name: string;
  co_ordinates: { lon: number; lat: number };
}

export interface PedestrianCountRow {
  id: number;
  location_id: number;
  sensing_date: string;
  hourday: number;
  direction_1: number;
  direction_2: number;
  pedestriancount: number;
  sensor_name: string;
  location: { lon: number; lat: number };
}

export type SocialIndicatorYear = 2018 | 2019 | 2020 | 2021 | 2022 | 2023;

async function odsFetch<T>(dataset: string, params: URLSearchParams): Promise<OdsResponse<T>> {
  // ODS query parser rejects '+' as space inside where-clause expressions
  // (it reads + as a literal arithmetic operator). URLSearchParams encodes
  // spaces as '+', so we post-process to %20.
  const qs = params.toString().replace(/\+/g, '%20');
  const url = `${BASE}/catalog/datasets/${dataset}/records?${qs}`;
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`melb-data ${dataset} → ${res.status} ${res.statusText} (${url})${body ? ` :: ${body.slice(0, 200)}` : ''}`);
  }
  return res.json() as Promise<OdsResponse<T>>;
}

// City-of-Melbourne resident social-indicator survey. Note: respondent_group
// values are CoM suburbs only (e.g. "Carlton 3053", "Docklands 3008") — suburbs
// in other LGAs (Yarra, Merri-bek, Maribyrnong) have no rows here.
export async function getSocialIndicators(opts: {
  year: SocialIndicatorYear;
  respondentGroup?: string;
  topic?: string;
  limit?: number;
}): Promise<SocialIndicatorRow[]> {
  const params = new URLSearchParams({ limit: String(Math.min(opts.limit ?? 100, 100)) });
  const wheres: string[] = [];
  if (opts.respondentGroup) wheres.push(`respondent_group = "${escapeOdsString(opts.respondentGroup)}"`);
  if (opts.topic) wheres.push(`topic = "${escapeOdsString(opts.topic)}"`);
  if (wheres.length) params.set('where', wheres.join(' AND '));
  const dataset = `social-indicators-for-city-of-melbourne-residents-${opts.year}`;
  const res = await odsFetch<SocialIndicatorRow>(dataset, params);
  return res.results;
}

// Spatial query: landmarks within radiusM metres of (lat, lng).
// Uses Opendatasoft's distance() filter against the co_ordinates geo field.
export async function getLandmarksNear(opts: {
  lat: number;
  lng: number;
  radiusM?: number;
  themes?: string[];
  limit?: number;
}): Promise<LandmarkRow[]> {
  const params = new URLSearchParams({ limit: String(Math.min(opts.limit ?? 100, 100)) });
  const radius = opts.radiusM ?? 1500;
  const wheres: string[] = [
    `distance(co_ordinates, GEOM'POINT(${opts.lng} ${opts.lat})', ${radius}m)`,
  ];
  if (opts.themes?.length) {
    const inList = opts.themes.map((t) => `"${escapeOdsString(t)}"`).join(',');
    wheres.push(`theme IN (${inList})`);
  }
  params.set('where', wheres.join(' AND '));
  const res = await odsFetch<LandmarkRow>(
    'landmarks-and-places-of-interest-including-schools-theatres-health-services-spor',
    params,
  );
  return res.results;
}

// Pedestrian counts within radiusM metres of (lat, lng), since sinceDate (YYYY-MM-DD).
// Returns raw hourly rows — caller aggregates.
export async function getPedestrianCountsNear(opts: {
  lat: number;
  lng: number;
  radiusM?: number;
  sinceDate?: string;
  limit?: number;
}): Promise<PedestrianCountRow[]> {
  const params = new URLSearchParams({ limit: String(Math.min(opts.limit ?? 100, 100)) });
  const radius = opts.radiusM ?? 1500;
  const since = opts.sinceDate ?? defaultSinceDate(3);
  params.set(
    'where',
    `distance(location, GEOM'POINT(${opts.lng} ${opts.lat})', ${radius}m) AND sensing_date >= date'${since}'`,
  );
  const res = await odsFetch<PedestrianCountRow>(
    'pedestrian-counting-system-monthly-counts-per-hour',
    params,
  );
  return res.results;
}

function defaultSinceDate(monthsBack: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsBack);
  return d.toISOString().slice(0, 10);
}

function escapeOdsString(s: string): string {
  return s.replace(/"/g, '\\"');
}
