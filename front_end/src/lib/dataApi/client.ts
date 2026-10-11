import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type {
  FetchOptions,
  FetchResult,
  FilterInput,
  PageMeta,
  PlatformEnvelope,
  ResourceKey,
  WriteOptions,
} from './types'
import { DataApiError } from './types'
import { mapRpcError, unwrapPlatformEnvelope } from './errors'
import { getResourceCatalog } from './resourceCatalog'

let client: SupabaseClient | null = null

function envString(name: string): string {
  const vite =
    typeof import.meta !== 'undefined' && import.meta.env
      ? (import.meta.env as Record<string, unknown>)[name]
      : undefined
  if (typeof vite === 'string' && vite.trim()) return vite.trim()
  const nodeEnv =
    typeof globalThis !== 'undefined'
      ? (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
      : undefined
  const node = nodeEnv?.[name]
  return typeof node === 'string' ? node.trim() : ''
}

export function getSupabaseUrl(): string {
  return envString('VITE_SUPABASE_URL').replace(/\/$/, '')
}

function readPublicKeyRaw(): string {
  return envString('VITE_SUPABASE_PUBLISHABLE_KEY') || envString('VITE_SUPABASE_ANON_KEY')
}

/**
 * Hosted publishable key (`sb_publishable_…`) or local Docker JWT anon.
 * Never put a secret key (`sb_secret_…` / service_role) in a VITE_ var.
 */
export function getSupabasePublicKey(): string {
  const key = readPublicKeyRaw()
  if (key.startsWith('sb_secret_')) {
    throw new DataApiError(
      'unknown',
      'VITE_SUPABASE_* must be the publishable key, not the secret key',
    )
  }
  return key
}

export function hasSupabasePublicConfig(): boolean {
  const key = readPublicKeyRaw()
  return Boolean(getSupabaseUrl() && key && !key.startsWith('sb_secret_'))
}

export function getSupabase(): SupabaseClient {
  if (client) return client
  const url = getSupabaseUrl()
  const key = getSupabasePublicKey()
  if (!url || !key) {
    throw new DataApiError(
      'unknown',
      'Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY in front_end/.env',
    )
  }
  client = createClient(url, key)
  return client
}

function assertResource(key: ResourceKey) {
  getResourceCatalog(key)
}

function unwrapEnvelope<T>(data: unknown): PlatformEnvelope<T> {
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>
    // Soft fails often omit `data` after jsonb_strip_nulls — still an envelope if error/meta present.
    if ('data' in obj || 'error' in obj || 'meta' in obj) {
      return {
        data: ('data' in obj ? obj.data : null) as T,
        meta: (obj.meta as PlatformEnvelope<T>['meta']) ?? null,
        error: obj.error ?? null,
      }
    }
  }
  return { data: data as T, meta: null, error: null }
}

function dataOf<T>(env: PlatformEnvelope<T>): T {
  return unwrapPlatformEnvelope(env)
}

/** Core RPC caller — domain libs use thin wrappers or this for platform ops. */
export async function callPlatform<T = unknown>(
  rpc: string,
  args: Record<string, unknown>,
): Promise<PlatformEnvelope<T>> {
  const { data, error } = await getSupabase().rpc(rpc, args)
  if (error) throw mapRpcError(error.message, error.details)
  return unwrapEnvelope<T>(data)
}

export async function fetchResource(
  resource: ResourceKey,
  options: FetchOptions = {},
): Promise<{ rows: Record<string, unknown>[]; meta: PageMeta }> {
  assertResource(resource)
  const env = await callPlatform<Record<string, unknown>[]>('app_fetch', {
    p_resource: resource,
    p_select: options.select ?? null,
    p_filters: (options.filters ?? {}) as FilterInput,
    p_order: options.order ?? null,
    p_limit: options.limit ?? null,
    p_offset: options.offset ?? null,
    p_page: options.page ?? null,
    p_page_size: options.pageSize ?? null,
    p_count: options.count ?? 'exact',
  })
  const rows = dataOf(env)
  return { rows: Array.isArray(rows) ? rows : [], meta: (env.meta ?? {}) as PageMeta }
}

/** Legacy shape { rows, total } for older callers. */
export async function fetchResourceLegacy(
  resource: ResourceKey,
  options: FetchOptions = {},
): Promise<FetchResult> {
  const { rows, meta } = await fetchResource(resource, options)
  return { rows, total: meta.total ?? rows.length }
}

export async function fetchResourceOne(
  resource: ResourceKey,
  id: string,
  select?: string[],
): Promise<Record<string, unknown>> {
  assertResource(resource)
  const env = await callPlatform<Record<string, unknown>>('app_fetch_one', {
    p_resource: resource,
    p_id: id,
    p_select: select ?? null,
  })
  return (dataOf(env) ?? {}) as Record<string, unknown>
}

export async function existsResource(
  resource: ResourceKey,
  filters: FilterInput = {},
): Promise<boolean> {
  assertResource(resource)
  const env = await callPlatform<boolean>('app_exists', {
    p_resource: resource,
    p_filters: filters,
  })
  return Boolean(dataOf(env))
}

export async function countResource(
  resource: ResourceKey,
  filters: FilterInput = {},
): Promise<number> {
  assertResource(resource)
  const env = await callPlatform<number>('app_count', {
    p_resource: resource,
    p_filters: filters,
  })
  return Number(dataOf(env) ?? 0)
}

export async function createResource(
  resource: ResourceKey,
  row: Record<string, unknown>,
  options: WriteOptions = {},
): Promise<Record<string, unknown>> {
  assertResource(resource)
  const env = await callPlatform<Record<string, unknown>>('app_create', {
    p_resource: resource,
    p_row: row,
    p_return: options.return ?? 'representation',
  })
  return (dataOf(env) ?? {}) as Record<string, unknown>
}

export async function createResources(
  resource: ResourceKey,
  rows: Record<string, unknown>[],
  options: WriteOptions = {},
): Promise<Record<string, unknown>[]> {
  assertResource(resource)
  const env = await callPlatform<Record<string, unknown>[]>('app_create_many', {
    p_resource: resource,
    p_rows: rows,
    p_return: options.return ?? 'representation',
  })
  const data = dataOf(env)
  return Array.isArray(data) ? data : []
}

export async function updateResource(
  resource: ResourceKey,
  id: string,
  patch: Record<string, unknown>,
  options: WriteOptions = {},
): Promise<Record<string, unknown>> {
  assertResource(resource)
  const env = await callPlatform<Record<string, unknown>>('app_update', {
    p_resource: resource,
    p_id: id,
    p_patch: patch,
    p_if_match: options.ifMatch ?? null,
    p_return: options.return ?? 'representation',
  })
  return (dataOf(env) ?? {}) as Record<string, unknown>
}

export async function updateResources(
  resource: ResourceKey,
  ids: string[],
  patch: Record<string, unknown>,
  options: WriteOptions = {},
): Promise<Record<string, unknown>[] | string[]> {
  assertResource(resource)
  const env = await callPlatform<Record<string, unknown>[] | string[]>('app_update_many', {
    p_resource: resource,
    p_ids: ids,
    p_patch: patch,
    p_return: options.return ?? 'representation',
  })
  const data = dataOf(env)
  return (Array.isArray(data) ? data : []) as Record<string, unknown>[] | string[]
}

export async function upsertResource(
  resource: ResourceKey,
  row: Record<string, unknown>,
  options: WriteOptions = {},
): Promise<Record<string, unknown>> {
  assertResource(resource)
  const env = await callPlatform<Record<string, unknown>>('app_upsert', {
    p_resource: resource,
    p_row: row,
    p_if_match: options.ifMatch ?? null,
    p_return: options.return ?? 'representation',
  })
  return (dataOf(env) ?? {}) as Record<string, unknown>
}

export async function deleteResource(
  resource: ResourceKey,
  id: string,
  options: WriteOptions = {},
): Promise<Record<string, unknown>> {
  assertResource(resource)
  const env = await callPlatform<Record<string, unknown>>('app_delete', {
    p_resource: resource,
    p_id: id,
    p_if_match: options.ifMatch ?? null,
    p_return: options.return ?? 'representation',
  })
  return (dataOf(env) ?? {}) as Record<string, unknown>
}

export async function deleteResources(
  resource: ResourceKey,
  ids: string[],
  options: WriteOptions = {},
): Promise<Record<string, unknown>[] | string[]> {
  assertResource(resource)
  const env = await callPlatform<Record<string, unknown>[] | string[]>('app_delete_many', {
    p_resource: resource,
    p_ids: ids,
    p_return: options.return ?? 'representation',
  })
  const data = dataOf(env)
  return (Array.isArray(data) ? data : []) as Record<string, unknown>[] | string[]
}

export async function describeResource(resource: ResourceKey): Promise<Record<string, unknown>> {
  assertResource(resource)
  const env = await callPlatform<Record<string, unknown>>('app_describe_resource', {
    p_resource: resource,
  })
  return (dataOf(env) ?? {}) as Record<string, unknown>
}
