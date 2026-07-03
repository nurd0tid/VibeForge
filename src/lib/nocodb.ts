import type { NocoDBListResponse } from '@/types';

const BASE_URL = process.env.NOCODB_BASE_URL || 'https://app.nocodb.com';
const BASE_ID = process.env.NOCODB_BASE_ID || '';
const API_TOKEN = process.env.NOCODB_API_TOKEN || '';

const TABLE_IDS: Record<string, string> = {
  projects: 'miu4xpf5wshy72e',
  tasks: 'm5cfiohztwypl8e',
  providers: 'mqqngj8c2ubdg74',
  daily_logs: 'mhytd487q05xf2m',
  weekly_logs: 'msone9gdlik156q',
  agent_runs: 'mtlce7ezzr549lb',
  task_plans: 'mcltsy4uv9qrs1f',
  schedules: 'mbm9ixlqoe2fx1a',
  project_context_updates: 'm84n6muf62dlvqz',
  agent_logs: 'm33hd9gy4znn2ls',
  skills: 'mlv4a734zhd7qwo',
  decisions: 'mjxivjy2obtx307',
  blockers: 'mxgew9h6xn5vu4g',
};

function getTableId(tableName: string): string {
  const id = TABLE_IDS[tableName];
  if (!id) throw new Error(`Unknown table: ${tableName}. Add it to TABLE_IDS in nocodb.ts`);
  return id;
}

function buildUrl(tableName: string, recordId?: number): string {
  const tableId = getTableId(tableName);
  const base = `${BASE_URL}/api/v1/db/data/noco/${BASE_ID}/${tableId}`;
  return recordId ? `${base}/${recordId}` : base;
}

export class NocoDBError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown,
  ) {
    super(message);
    this.name = 'NocoDBError';
  }
}

async function nocodbFetch<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(15000), // 15 second timeout to prevent hanging
    headers: {
      'Content-Type': 'application/json',
      'xc-token': API_TOKEN,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => null);
    throw new NocoDBError(
      `NocoDB request failed: ${res.status} ${res.statusText}`,
      res.status,
      body,
    );
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export interface ListParams {
  where?: string;
  limit?: number;
  offset?: number;
  sort?: string;
  fields?: string;
}

export async function listRecords<T>(
  table: string,
  params?: ListParams,
): Promise<NocoDBListResponse<T>> {
  const url = new URL(buildUrl(table));
  if (params?.where) url.searchParams.set('where', params.where);
  if (params?.limit) url.searchParams.set('limit', String(params.limit));
  if (params?.offset) url.searchParams.set('offset', String(params.offset));
  if (params?.sort) url.searchParams.set('sort', params.sort);
  if (params?.fields) url.searchParams.set('fields', params.fields);

  return nocodbFetch<NocoDBListResponse<T>>(url.toString());
}

export async function getRecord<T>(
  table: string,
  id: number,
): Promise<T> {
  return nocodbFetch<T>(buildUrl(table, id));
}

export async function createRecord<T>(
  table: string,
  data: Partial<T>,
): Promise<T> {
  return nocodbFetch<T>(buildUrl(table), {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateRecord<T>(
  table: string,
  id: number,
  data: Partial<T>,
): Promise<T> {
  return nocodbFetch<T>(buildUrl(table, id), {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteRecord(
  table: string,
  id: number,
): Promise<void> {
  await nocodbFetch(buildUrl(table, id), { method: 'DELETE' });
}
