// Typed wrappers around https://discover.data.vic.gov.au/ (CKAN v3 API).
//
// Caveat: most VIC government datasets host raw XLS/XLSX/PDF files rather than
// expose their tabular data via the CKAN datastore. As of 2026-05, neither the
// VGCCC SEIFA-by-LGA dataset nor the neighbourhood-houses dataset has a
// `datastore_active: true` resource, so the `datastoreSearch()` helper below
// only returns rows for the small set of CSV/JSON datasets that opted in to
// the datastore. We keep the wrapper typed and generic so it works the day a
// relevant dataset becomes queryable.
//
// VIC_DATA_API_KEY is reserved for write/admin operations and is not required
// for any read endpoint exercised here.

const BASE = 'https://discover.data.vic.gov.au/api/3/action';

export interface CkanEnvelope<T> {
  success: boolean;
  help: string;
  result: T;
  error?: { __type: string; [key: string]: unknown };
}

export interface CkanResource {
  id: string;
  name: string;
  format: string;
  url: string;
  datastore_active?: boolean;
  description?: string;
}

export interface CkanPackage {
  id: string;
  name: string;
  title: string;
  notes: string;
  metadata_modified: string;
  resources: CkanResource[];
  organization?: { name: string; title: string };
}

export interface CkanPackageSearchResult {
  count: number;
  results: CkanPackage[];
  facets: Record<string, unknown>;
}

export interface DatastoreField {
  id: string;
  type: string;
  info?: { label?: string; notes?: string };
}

export interface DatastoreSearchResult<Row = Record<string, unknown>> {
  resource_id: string;
  fields: DatastoreField[];
  records: Row[];
  total: number;
  limit?: number;
  offset?: number;
}

async function ckanFetch<T>(action: string, params: URLSearchParams): Promise<T> {
  const url = `${BASE}/${action}?${params}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`vic-data ${action} → ${res.status} ${res.statusText} (${url})`);
  }
  const body = (await res.json()) as CkanEnvelope<T>;
  if (!body.success) {
    throw new Error(
      `vic-data ${action} returned success=false: ${JSON.stringify(body.error ?? {})}`,
    );
  }
  return body.result;
}

export async function packageSearch(opts: {
  query?: string;
  rows?: number;
  start?: number;
}): Promise<CkanPackageSearchResult> {
  const params = new URLSearchParams({
    q: opts.query ?? '*:*',
    rows: String(opts.rows ?? 10),
    start: String(opts.start ?? 0),
  });
  return ckanFetch<CkanPackageSearchResult>('package_search', params);
}

export async function packageShow(packageNameOrId: string): Promise<CkanPackage> {
  const params = new URLSearchParams({ id: packageNameOrId });
  return ckanFetch<CkanPackage>('package_show', params);
}

// Only resources with `datastore_active: true` accept this query.
// Throws clearly when called against a flat-file resource.
export async function datastoreSearch<Row = Record<string, unknown>>(opts: {
  resourceId: string;
  query?: string;
  limit?: number;
  offset?: number;
  filters?: Record<string, string | number>;
}): Promise<DatastoreSearchResult<Row>> {
  const params = new URLSearchParams({
    resource_id: opts.resourceId,
    limit: String(opts.limit ?? 100),
    offset: String(opts.offset ?? 0),
  });
  if (opts.query) params.set('q', opts.query);
  if (opts.filters) params.set('filters', JSON.stringify(opts.filters));
  return ckanFetch<DatastoreSearchResult<Row>>('datastore_search', params);
}

// Convenience: find a package's first datastore-active resource id, or null.
export async function firstDatastoreResource(packageNameOrId: string): Promise<CkanResource | null> {
  const pkg = await packageShow(packageNameOrId);
  return pkg.resources.find((r) => r.datastore_active) ?? null;
}
