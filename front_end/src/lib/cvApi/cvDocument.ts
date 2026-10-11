/**
 * Dual-envelope helpers — Drive `files_documents.body` (version 2) ↔ viewer/extract
 * (`schema_version: 2`). Content spine is always `basics` + `sections`.
 */
import type { CvExtractV2 } from './index'
import { normalizeCvViewerDoc } from './cvNormalize'

export type CvDriveBodyV2 = {
  version: 2
  basics: CvExtractV2['basics']
  sections: CvExtractV2['sections']
  discoverable?: boolean
  source?: {
    upload_file_node_id?: string | null
    raw_extract?: unknown
    extract_schema_version?: number
  }
  updated_at?: string
}

function asObject(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return null
}

function emptyBasics(): CvExtractV2['basics'] {
  return {
    display_name: '',
    headline: '',
    summary: '',
    emails: [],
    phones: [],
    locations: [],
    links: [],
    languages: [],
  }
}

/**
 * Normalize a Drive CV body (or already-extract-shaped object) into viewer/extract form.
 */
export function cvDriveBodyToViewerDoc(body: unknown): CvExtractV2 {
  const root = asObject(body) ?? {}
  const source = asObject(root.source)
  const raw = asObject(source?.raw_extract) ?? asObject(root.raw_extract)

  const basicsRaw = asObject(root.basics) ?? asObject(raw?.basics) ?? {}
  const basics: CvExtractV2['basics'] = {
    ...emptyBasics(),
    ...(basicsRaw as CvExtractV2['basics']),
    emails: Array.isArray(basicsRaw.emails) ? (basicsRaw.emails as string[]) : [],
    phones: Array.isArray(basicsRaw.phones)
      ? (basicsRaw.phones as CvExtractV2['basics']['phones'])
      : [],
    locations: Array.isArray(basicsRaw.locations)
      ? (basicsRaw.locations as CvExtractV2['basics']['locations'])
      : [],
    links: Array.isArray(basicsRaw.links)
      ? (basicsRaw.links as CvExtractV2['basics']['links'])
      : [],
    languages: Array.isArray(basicsRaw.languages)
      ? (basicsRaw.languages as NonNullable<CvExtractV2['basics']['languages']>)
      : [],
  }

  const sections = Array.isArray(root.sections)
    ? (root.sections as CvExtractV2['sections'])
    : Array.isArray(raw?.sections)
      ? (raw.sections as CvExtractV2['sections'])
      : []

  const coverage =
    asObject(root.coverage) ?? asObject(raw?.coverage) ?? {
      found_kinds: [],
      missing_common: [],
      warnings: [],
    }
  const missed = Array.isArray(root.missed)
    ? root.missed
    : Array.isArray(raw?.missed)
      ? raw.missed
      : []
  const meta_extract =
    asObject(root.meta_extract) ??
    asObject(raw?.meta_extract) ?? {
      source_chars: 0,
      used_vision: false,
    }

  return normalizeCvViewerDoc({
    schema_version: 2,
    basics,
    sections,
    coverage: coverage as CvExtractV2['coverage'],
    missed: missed as CvExtractV2['missed'],
    meta_extract: meta_extract as CvExtractV2['meta_extract'],
  })
}

export type CvViewerDocToDriveOptions = {
  /** When true, set `updated_at` to now (ISO). Default false — leave to RPC. */
  touchUpdatedAt?: boolean
}

/**
 * Merge viewer/extract basics+sections into an existing Drive body, preserving wrapper keys.
 */
export function cvViewerDocToDrivePatch(
  doc: CvExtractV2,
  existingBody: unknown = null,
  options: CvViewerDocToDriveOptions = {},
): CvDriveBodyV2 {
  const prev = asObject(existingBody) ?? {}
  const prevSource = asObject(prev.source) ?? {}

  const next: CvDriveBodyV2 = {
    version: 2,
    basics: doc.basics ?? emptyBasics(),
    sections: Array.isArray(doc.sections) ? doc.sections : [],
    discoverable: typeof prev.discoverable === 'boolean' ? prev.discoverable : true,
    source: {
      upload_file_node_id:
        (prevSource.upload_file_node_id as string | null | undefined) ?? null,
      raw_extract: prevSource.raw_extract ?? {
        schema_version: 2,
        coverage: doc.coverage,
        missed: doc.missed,
        meta_extract: doc.meta_extract,
      },
      extract_schema_version:
        typeof prevSource.extract_schema_version === 'number'
          ? prevSource.extract_schema_version
          : 2,
    },
  }

  if (options.touchUpdatedAt) {
    next.updated_at = new Date().toISOString()
  } else if (typeof prev.updated_at === 'string') {
    next.updated_at = prev.updated_at
  }

  return next
}
