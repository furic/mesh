// Per-suburb data provenance. Surfaces:
//   - the (i) tooltip on the home page's suburb detail card
//   - the "Datasets used" list under section 07 of /pitch
// so we tell viewers exactly which dataset(s) drove the scores they're
// looking at. Aligns with what `scripts/seed-suburbs.ts` actually pulled.

export type ProvLevel = 'real' | 'partial' | 'seifa';

export interface Dataset {
  label: string;
  url:   string;
}

export interface SuburbDataSource {
  level:    ProvLevel;
  // One-line summary used for the tooltip — keep under ~120 chars.
  summary:  string;
  // Plus the underlying datasets, with links. Used by the pitch page.
  datasets: Dataset[];
}

const OPENMAPS = 'https://data.melbourne.vic.gov.au/api/explore/v2.1/catalog/datasets';
const ABS_IRSD = 'https://www.abs.gov.au/statistics/people/people-and-communities/socio-economic-indexes-areas-seifa-australia/latest-release';

const SOCIAL_INDICATORS: Dataset = {
  label: 'data.melbourne.vic.gov.au / social-indicators-for-city-of-melbourne-residents-2023',
  url:   `${OPENMAPS}/social-indicators-for-city-of-melbourne-residents-2023/information`,
};
const LANDMARKS: Dataset = {
  label: 'data.melbourne.vic.gov.au / landmarks-and-places-of-interest',
  url:   `${OPENMAPS}/landmarks-and-places-of-interest-including-schools-theatres-health-services-spor/information`,
};
const PEDESTRIAN: Dataset = {
  label: 'data.melbourne.vic.gov.au / pedestrian-counting-system-monthly-counts-per-hour',
  url:   `${OPENMAPS}/pedestrian-counting-system-monthly-counts-per-hour/information`,
};
const SEIFA: Dataset = {
  label: 'ABS 2021 IRSD decile (hand-curated reference values in scripts/seed-suburbs.ts)',
  url:   ABS_IRSD,
};

export const SUBURB_DATA_SOURCES: Record<string, SuburbDataSource> = {
  carlton: {
    level:    'real',
    summary:  'Full real coverage — Carlton sits inside the City of Melbourne LGA, so all five pillar scores come from CoM open data.',
    datasets: [SOCIAL_INDICATORS, LANDMARKS, PEDESTRIAN, SEIFA],
  },
  fitzroy: {
    level:    'partial',
    summary:  'Partial coverage — landmarks + pedestrian sensors reach across the LGA border, but the CoM social-indicators survey doesn\'t cover Yarra residents, so food + emergency fall back to SEIFA.',
    datasets: [LANDMARKS, PEDESTRIAN, SEIFA],
  },
  brunswick: {
    level:    'seifa',
    summary:  'Brunswick is in Merri-bek, outside the City of Melbourne open-data scope. All five pillars are SEIFA-derived approximations.',
    datasets: [SEIFA],
  },
  footscray: {
    level:    'seifa',
    summary:  'Footscray is in Maribyrnong, outside the City of Melbourne open-data scope. All five pillars are SEIFA-derived approximations.',
    datasets: [SEIFA],
  },
  richmond: {
    level:    'seifa',
    summary:  'Richmond is in Yarra, outside the City of Melbourne open-data scope. All five pillars are SEIFA-derived approximations.',
    datasets: [SEIFA],
  },
};

export function dataSourceFor(suburbId: string): SuburbDataSource {
  return SUBURB_DATA_SOURCES[suburbId] ?? {
    level:    'seifa',
    summary:  'No mapped data source for this suburb. Scores fall back to SEIFA-derived approximations.',
    datasets: [SEIFA],
  };
}
