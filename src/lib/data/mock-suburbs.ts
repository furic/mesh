// Mock Melbourne suburbs for the Sprint-0 visible prototype.
// Real data will come from data.vic.gov.au + data.melbourne.vic.gov.au in Sprint 1.
// Coordinates are real centroids; SEIFA + pillar scores are illustrative.

import type { Suburb } from '../types'

function rIndex(s: { food: number; skills: number; resources: number; social: number; emergency: number }): number {
  return Math.round((s.food + s.skills + s.resources + s.social + s.emergency) / 5)
}

const raw: Omit<Suburb, 'r_index'>[] = [
  {
    id:           'carlton',
    name:         'Carlton',
    postcode:     '3053',
    lat:          -37.7989,
    lng:          144.9669,
    seifa_score:  3,
    population:   17_330,
    scores:       { food: 78, skills: 82, resources: 64, social: 71, emergency: 65 },
    xp_total:     12_400,
    level:        5,
  },
  {
    id:           'fitzroy',
    name:         'Fitzroy',
    postcode:     '3065',
    lat:          -37.7986,
    lng:          144.9784,
    seifa_score:  4,
    population:   10_445,
    scores:       { food: 66, skills: 72, resources: 58, social: 63, emergency: 47 },
    xp_total:     8_100,
    level:        4,
  },
  {
    id:           'brunswick',
    name:         'Brunswick',
    postcode:     '3056',
    lat:          -37.7666,
    lng:          144.9614,
    seifa_score:  4,
    population:   24_473,
    scores:       { food: 88, skills: 84, resources: 81, social: 86, emergency: 80 },
    xp_total:     19_700,
    level:        7,
  },
  {
    id:           'footscray',
    name:         'Footscray',
    postcode:     '3011',
    lat:          -37.8003,
    lng:          144.8997,
    seifa_score:  8,
    population:   16_855,
    scores:       { food: 52, skills: 48, resources: 51, social: 49, emergency: 46 },
    xp_total:     3_200,
    level:        2,
  },
  {
    id:           'richmond',
    name:         'Richmond',
    postcode:     '3121',
    lat:          -37.8197,
    lng:          145.0061,
    seifa_score:  5,
    population:   28_055,
    scores:       { food: 71, skills: 70, resources: 66, social: 68, emergency: 56 },
    xp_total:     9_650,
    level:        4,
  },
]

export const MOCK_SUBURBS: Suburb[] = raw.map((s) => ({
  ...s,
  r_index: rIndex(s.scores),
}))
