// Pulls suburb boundary polygons from OpenStreetMap Nominatim and writes a
// single JSON file to src/lib/data/suburb-geometries.json.
//
// Why Nominatim:
//   - Free, anonymous, no API key.
//   - Returns a polygon (GeoJSON) when queried by "<suburb> <postcode>,
//     Victoria, Australia" — postcode-only or suburb-only queries can
//     return points or ambiguous matches.
//   - Polite usage: one request per second, identifying User-Agent.
//
// Run:  pnpm fetch:suburb-geo

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT  = resolve(HERE, '../src/lib/data/suburb-geometries.json');

const USER_AGENT = 'MESH-prototype/0.1 (https://mesh-pi-topaz.vercel.app)';

interface SuburbQuery {
  id:        string;
  name:      string;
  postcode:  string;
}

const QUERIES: SuburbQuery[] = [
  { id: 'carlton',   name: 'Carlton',   postcode: '3053' },
  { id: 'fitzroy',   name: 'Fitzroy',   postcode: '3065' },
  { id: 'brunswick', name: 'Brunswick', postcode: '3056' },
  { id: 'footscray', name: 'Footscray', postcode: '3011' },
  { id: 'richmond',  name: 'Richmond',  postcode: '3121' },
];

interface NominatimResult {
  osm_type:     string;
  class:        string;
  type:         string;
  display_name: string;
  boundingbox:  [string, string, string, string];
  geojson:      GeoJSONGeometry;
}

type GeoJSONGeometry =
  | { type: 'Polygon';      coordinates: number[][][] }
  | { type: 'MultiPolygon'; coordinates: number[][][][] };

interface SuburbGeometry {
  id:           string;
  name:         string;
  postcode:     string;
  display_name: string;
  bbox:         [number, number, number, number];  // [west, south, east, north]
  geometry:     GeoJSONGeometry;
  centroid:     [number, number];                  // [lng, lat]
  point_count:  number;
}

async function fetchOne(q: SuburbQuery): Promise<SuburbGeometry> {
  const query = `${q.name} ${q.postcode}, Victoria, Australia`;
  const url   = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&polygon_geojson=1&limit=5`;
  const res   = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) {
    throw new Error(`Nominatim ${q.name} → ${res.status} ${res.statusText}`);
  }
  const results = (await res.json()) as NominatimResult[];
  const match = results.find((r) => r.class === 'boundary' && r.type === 'administrative');
  if (!match) {
    throw new Error(`No boundary match for ${q.name} ${q.postcode}`);
  }
  const bbox = match.boundingbox.map(parseFloat) as [number, number, number, number];
  // boundingbox order is [south, north, west, east]; normalise to [west, south, east, north]
  const normalisedBbox: [number, number, number, number] = [bbox[2], bbox[0], bbox[3], bbox[1]];

  return {
    id:           q.id,
    name:         q.name,
    postcode:     q.postcode,
    display_name: match.display_name,
    bbox:         normalisedBbox,
    geometry:     match.geojson,
    centroid:     centroidOf(match.geojson),
    point_count:  pointCount(match.geojson),
  };
}

function centroidOf(geom: GeoJSONGeometry): [number, number] {
  // Centroid of the bounding box of the largest ring — good enough for the
  // map's flyTo target. Real centroid math is overkill here.
  const rings = geom.type === 'Polygon' ? geom.coordinates : geom.coordinates.flat();
  const largest = rings.reduce((a, r) => (r.length > a.length ? r : a), rings[0]);
  let minLng =  Infinity, minLat =  Infinity;
  let maxLng = -Infinity, maxLat = -Infinity;
  for (const [lng, lat] of largest) {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }
  return [(minLng + maxLng) / 2, (minLat + maxLat) / 2];
}

function pointCount(geom: GeoJSONGeometry): number {
  if (geom.type === 'Polygon')      return geom.coordinates[0].length;
  return geom.coordinates.reduce((a, p) => a + p[0].length, 0);
}

async function main() {
  const results: SuburbGeometry[] = [];
  for (const q of QUERIES) {
    console.log(`  → ${q.name}…`);
    const geo = await fetchOne(q);
    console.log(`     ${geo.point_count} pts · centroid ${geo.centroid[0].toFixed(4)},${geo.centroid[1].toFixed(4)}`);
    results.push(geo);
    await new Promise((r) => setTimeout(r, 1100));  // Nominatim politeness
  }

  const collection = {
    generated_at: new Date().toISOString(),
    source:       'OpenStreetMap via Nominatim (polygon_geojson=1)',
    license:      'OpenStreetMap contributors, ODbL',
    suburbs:      results,
  };
  writeFileSync(OUT, JSON.stringify(collection, null, 2));
  console.log(`\nWrote ${OUT} (${results.length} suburbs, ${results.reduce((a, s) => a + s.point_count, 0)} total points)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
