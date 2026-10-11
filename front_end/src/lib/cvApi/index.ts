/**
 * cvApi — CV intake RPCs + Edge cv-extract (FE-first PDF text path).
 *
 * Preferred app path: browser extracts PDF text (pdf.js) → call Edge with
 * { accountId, text } (fileNodeId optional). Drive upload can wait until submit.
 * File-only path (bot / retry): omit text → Edge downloads via signed URL.
 */
import {
  callPlatform,
  getSupabase,
  getSupabasePublicKey,
  getSupabaseUrl,
  DataApiError,
  unwrapPlatformEnvelope,
} from '../dataApi'
import type { PlatformEnvelope } from '../dataApi'
import { loadPdfDocumentTask } from '../docs/pdfDocument'

export type CvLinkKind =
  | 'website'
  | 'portfolio'
  | 'github'
  | 'linkedin'
  | 'gitlab'
  | 'behance'
  | 'dribbble'
  | 'scholar'
  | 'other'

export type CvSectionKind =
  | 'experience'
  | 'education'
  | 'skills'
  | 'projects'
  | 'publications'
  | 'references'
  | 'awards'
  | 'certifications'
  | 'volunteer'
  | 'custom'

export type CvExtractV2 = {
  schema_version: 2
  basics: {
    display_name: string
    headline: string
    summary: string
    emails: string[]
    phones: Array<{ value: string; label?: string | null }>
    locations: Array<{
      city?: string | null
      region?: string | null
      country?: string | null
      raw?: string | null
    }>
    links: Array<{ url: string; label?: string | null; kind: CvLinkKind }>
    languages?: Array<{ name: string; level?: string | null }> | null
  }
  sections: Array<{
    id: string
    kind: CvSectionKind
    title: string
    sort_order: number
    items: Record<string, unknown>[]
  }>
  coverage: {
    found_kinds: string[]
    missing_common: string[]
    warnings: string[]
  }
  missed: Array<{ snippet: string; suggested_kind: string; note?: string | null }>
  meta_extract: {
    source_chars: number
    pass1_ms?: number | null
    pass2_ms?: number | null
    used_vision: boolean
  }
  /** Legacy flat aliases from Edge */
  display_name?: string
  headline?: string
  experience_summary?: string
  summary?: string
  links?: string[]
  raw_extract?: unknown
}

export type CvExtractResult = {
  fields: CvExtractV2
  sourceFileNodeId: string | null
  meta: Record<string, unknown> | null
}

export type PdfTextExtractResult = {
  text: string
  pageCount: number
  charCount: number
  lowText: boolean
}

const LOW_TEXT = 400
const MAX_CHARS = 120_000

function unwrap<T>(env: PlatformEnvelope<T>): T {
  return unwrapPlatformEnvelope(env)
}

/** Extract plain text from a PDF File / bytes in the browser (pdf.js). */
export async function extractPdfText(
  source: File | ArrayBuffer | Uint8Array,
): Promise<PdfTextExtractResult> {
  // pdf.js: destroy() lives on the loading task; the document proxy has cleanup().
  let task: Awaited<ReturnType<typeof loadPdfDocumentTask>>['task'] | null = null
  let doc: Awaited<ReturnType<typeof loadPdfDocumentTask>>['doc']
  try {
    const loaded = await loadPdfDocumentTask(source)
    task = loaded.task
    doc = loaded.doc
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (/password|encrypted/i.test(msg)) {
      throw new DataApiError('pdf_password_protected', msg)
    }
    throw new DataApiError('pdf_read_failed', msg)
  }
  try {
    const parts: string[] = []
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i)
      const content = await page.getTextContent()
      const line = content.items
        .map((item) => ('str' in item ? String(item.str) : ''))
        .filter(Boolean)
        .join(' ')
      if (line.trim()) parts.push(line)
    }
    const text = parts.join('\n').slice(0, MAX_CHARS)
    const trimmed = text.trim()
    if (!trimmed) {
      throw new DataApiError('pdf_text_empty', 'pdf_text_empty')
    }
    if (trimmed.length < LOW_TEXT) {
      throw new DataApiError('pdf_text_too_thin', 'pdf_text_too_thin')
    }
    return {
      text,
      pageCount: doc.numPages,
      charCount: text.length,
      lowText: false,
    }
  } finally {
    await task?.destroy().catch(() => undefined)
  }
}

type EdgeEnvelope = {
  data?: {
    fields?: CvExtractV2
    source_file_node_id?: string | null
  } | null
  meta?: Record<string, unknown> | null
  error?: { code?: string; detail?: string } | string | null
}

/**
 * Call Edge cv-extract.
 * Prefer passing `text` (FE-extracted) so Edge skips PDF download.
 * Pass `fileNodeId` as the Drive source pointer even when text is set.
 */
export async function extractCv(input: {
  accountId: string
  text?: string
  fileNodeId?: string | null
  signal?: AbortSignal
}): Promise<CvExtractResult> {
  return callCvExtract({
    accountId: input.accountId,
    text: input.text,
    fileNodeId: input.fileNodeId,
    signal: input.signal,
  })
}

export type CvExtractStreamPhase =
  | 'resolve'
  | 'pass1'
  | 'polish'
  | 'polish_skipped'
  | 'done'
  /** FE-only: NDJSON truncated → non-stream retry. */
  | 'retry'

export type CvExtractStreamHandlers = {
  onPhase?: (phase: CvExtractStreamPhase) => void
  /** Coarse live doc snapshots during pass-1 (read-only preview). */
  onDoc?: (doc: CvExtractV2, focusId: string | null) => void
  onDone?: (result: CvExtractResult) => void
}

/**
 * Path A streaming extract (NDJSON). Falls back to non-streaming extractCv once
 * if the response is not an NDJSON stream.
 */
export async function extractCvStream(input: {
  accountId: string
  text: string
  fileNodeId?: string | null
  signal?: AbortSignal
  handlers: CvExtractStreamHandlers
}): Promise<CvExtractResult> {
  const text = input.text.trim()
  if (!text) throw new DataApiError('validation_failed', 'text')

  const supabase = getSupabase()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.access_token) {
    throw new DataApiError('not_authenticated', 'not_authenticated')
  }

  const base = getSupabaseUrl()
  const anon = getSupabasePublicKey()
  const res = await fetch(`${base}/functions/v1/cv-extract`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: anon,
      'Content-Type': 'application/json',
      Accept: 'application/x-ndjson, application/json',
    },
    body: JSON.stringify({
      accountId: input.accountId,
      text,
      fileNodeId: input.fileNodeId ?? undefined,
      stream: true,
    }),
    signal: input.signal,
  })

  const ctype = (res.headers.get('content-type') || '').toLowerCase()
  const isNdjson = ctype.includes('ndjson') || ctype.includes('x-ndjson')

  if (!res.ok || !isNdjson || !res.body) {
    // Buffered / non-stream response — fall back to classic extract.
    if (res.ok && !isNdjson) {
      const body = (await res.json().catch(() => ({}))) as EdgeEnvelope
      return unwrapEdgeEnvelope(body, input.fileNodeId ?? null)
    }
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as EdgeEnvelope
      throwEdgeError(body, res.status)
    }
    return extractCv({
      accountId: input.accountId,
      text,
      fileNodeId: input.fileNodeId,
      signal: input.signal,
    })
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let carry = ''
  let finalResult: CvExtractResult | null = null
  let streamBroke = false

  const consumeLine = (trimmed: string) => {
    let event: Record<string, unknown>
    try {
      event = JSON.parse(trimmed) as Record<string, unknown>
    } catch {
      return
    }
    const type = String(event.type ?? '')
    if (type === 'ping') return
    if (type === 'phase') {
      const phase = String(event.phase ?? '') as CvExtractStreamPhase
      if (
        phase === 'resolve' ||
        phase === 'pass1' ||
        phase === 'polish' ||
        phase === 'polish_skipped' ||
        phase === 'done'
      ) {
        input.handlers.onPhase?.(phase)
      }
    } else if (type === 'doc' && event.doc && typeof event.doc === 'object') {
      const partial = event.doc as Partial<CvExtractV2>
      const doc = softDocFromPartial(partial)
      const focusId =
        typeof event.focusId === 'string' && event.focusId ? event.focusId : null
      input.handlers.onDoc?.(doc, focusId)
    } else if (type === 'done' && event.data && typeof event.data === 'object') {
      const data = event.data as {
        fields?: CvExtractV2
        source_file_node_id?: string | null
      }
      if (!data.fields) throw new DataApiError('unknown', 'cv_extract_empty')
      finalResult = {
        fields: data.fields,
        sourceFileNodeId: data.source_file_node_id ?? input.fileNodeId ?? null,
        meta: (event.meta as Record<string, unknown>) ?? null,
      }
      input.handlers.onPhase?.('done')
      input.handlers.onDone?.(finalResult)
    } else if (type === 'error') {
      const errObj = event.error
      if (errObj && typeof errObj === 'object') {
        const code = String((errObj as { code?: string }).code ?? 'cv_extract_failed')
        const detail = String((errObj as { detail?: string }).detail ?? '')
        throw new DataApiError(code as never, detail || code, detail)
      }
      throw new DataApiError('cv_extract_failed', 'cv_extract_failed')
    }
  }

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      carry += decoder.decode(value, { stream: true })
      const lines = carry.split('\n')
      carry = lines.pop() ?? ''
      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed) consumeLine(trimmed)
      }
    }
    carry += decoder.decode()
    const trailing = carry.trim()
    if (trailing) consumeLine(trailing)
  } catch (e) {
    if (e instanceof DataApiError) throw e
    // net::ERR_INCOMPLETE_CHUNKED_ENCODING and similar mid-stream drops
    streamBroke = true
    try {
      await reader.cancel()
    } catch {
      /* ignore */
    }
  }

  if (!finalResult) {
    // Truncated NDJSON (idle proxy kill, worker drop) — retry non-streaming.
    if (streamBroke) {
      input.handlers.onPhase?.('retry')
    }
    return extractCv({
      accountId: input.accountId,
      text,
      fileNodeId: input.fileNodeId,
      signal: input.signal,
    })
  }
  return finalResult
}

function softDocFromPartial(partial: Partial<CvExtractV2>): CvExtractV2 {
  const empty = emptyViewerDoc()
  return {
    ...empty,
    ...partial,
    schema_version: 2,
    basics: { ...empty.basics, ...(partial.basics ?? {}) },
    sections: Array.isArray(partial.sections) ? partial.sections : [],
    coverage: {
      found_kinds: partial.coverage?.found_kinds ?? [],
      missing_common: partial.coverage?.missing_common ?? [],
      warnings: partial.coverage?.warnings ?? [],
    },
    missed: Array.isArray(partial.missed) ? partial.missed : [],
    meta_extract: {
      source_chars: partial.meta_extract?.source_chars ?? 0,
      pass1_ms: partial.meta_extract?.pass1_ms ?? null,
      pass2_ms: partial.meta_extract?.pass2_ms ?? null,
      used_vision: Boolean(partial.meta_extract?.used_vision),
    },
  }
}

function emptyViewerDoc(): CvExtractV2 {
  return {
    schema_version: 2,
    basics: {
      display_name: '',
      headline: '',
      summary: '',
      emails: [],
      phones: [],
      locations: [],
      links: [],
      languages: null,
    },
    sections: [],
    coverage: { found_kinds: [], missing_common: [], warnings: [] },
    missed: [],
    meta_extract: { source_chars: 0, used_vision: false },
  }
}

/**
 * Pass-2 only: compare SOURCE text against an already-edited draft.
 * Kept for later (no signup button for now).
 */
export async function reviewCvDraft(input: {
  accountId: string
  text: string
  draft: Pick<CvExtractV2, 'basics' | 'sections' | 'coverage'>
  fileNodeId?: string | null
  signal?: AbortSignal
}): Promise<CvExtractResult> {
  const text = input.text.trim()
  if (!text) throw new DataApiError('validation_failed', 'text')
  return callCvExtract({
    accountId: input.accountId,
    text,
    fileNodeId: input.fileNodeId,
    mode: 'review',
    draft: {
      basics: input.draft.basics,
      sections: input.draft.sections,
      coverage: input.draft.coverage,
    },
    signal: input.signal,
  })
}

async function callCvExtract(input: {
  accountId: string
  text?: string
  fileNodeId?: string | null
  mode?: 'extract' | 'review'
  draft?: {
    basics: CvExtractV2['basics']
    sections: CvExtractV2['sections']
    coverage: CvExtractV2['coverage']
  }
  signal?: AbortSignal
}): Promise<CvExtractResult> {
  const text = input.text?.trim() ?? ''
  if (!text && !input.fileNodeId) {
    throw new DataApiError('validation_failed', 'text_or_fileNodeId')
  }
  if (input.mode === 'review' && !input.draft) {
    throw new DataApiError('validation_failed', 'draft')
  }

  const supabase = getSupabase()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.access_token) {
    throw new DataApiError('not_authenticated', 'not_authenticated')
  }

  const base = getSupabaseUrl()
  const anon = getSupabasePublicKey()
  const res = await fetch(`${base}/functions/v1/cv-extract`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: anon,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      accountId: input.accountId,
      text: text || undefined,
      fileNodeId: input.fileNodeId ?? undefined,
      mode: input.mode === 'review' ? 'review' : undefined,
      draft: input.draft,
    }),
    signal: input.signal,
  })

  const body = (await res.json().catch(() => ({}))) as EdgeEnvelope
  if (!res.ok) throwEdgeError(body, res.status)
  return unwrapEdgeEnvelope(body, input.fileNodeId ?? null)
}

function throwEdgeError(body: EdgeEnvelope, status: number): never {
  const code =
    typeof body.error === 'object' && body.error?.code
      ? body.error.code
      : `cv_extract_http_${status}`
  const detail =
    typeof body.error === 'object' && body.error ? body.error.detail ?? '' : String(body.error ?? '')
  throw new DataApiError(code as never, detail || code, detail)
}

function unwrapEdgeEnvelope(
  body: EdgeEnvelope,
  fallbackFileNodeId: string | null,
): CvExtractResult {
  if (body.error) {
    const code =
      typeof body.error === 'object' && body.error?.code
        ? body.error.code
        : String(body.error)
    const detail =
      typeof body.error === 'object' ? String(body.error.detail ?? '') : ''
    throw new DataApiError(code as never, detail || code, detail)
  }
  if (!body.data?.fields) {
    throw new DataApiError('unknown', 'cv_extract_empty')
  }
  return {
    fields: body.data.fields,
    sourceFileNodeId: body.data.source_file_node_id ?? fallbackFileNodeId,
    meta: body.meta ?? null,
  }
}

/**
 * Path A (app default): pdf.js text in browser → Edge with text + optional fileNodeId.
 * Edge does not re-download the PDF when text is present.
 */
export async function extractCvFromPdfFile(input: {
  accountId: string
  file: File
  fileNodeId?: string | null
  signal?: AbortSignal
  stream?: boolean
  handlers?: CvExtractStreamHandlers
}): Promise<CvExtractResult & { pdfText: PdfTextExtractResult }> {
  const pdfText = await extractPdfText(input.file)
  if (input.stream && input.handlers) {
    const result = await extractCvStream({
      accountId: input.accountId,
      text: pdfText.text,
      fileNodeId: input.fileNodeId,
      signal: input.signal,
      handlers: input.handlers,
    })
    return { ...result, pdfText }
  }
  const result = await extractCv({
    accountId: input.accountId,
    text: pdfText.text,
    fileNodeId: input.fileNodeId,
    signal: input.signal,
  })
  return { ...result, pdfText }
}

/**
 * Path B (bot / retry): Edge downloads fileNodeId and extracts text server-side.
 */
export async function extractCvFromFileNode(input: {
  accountId: string
  fileNodeId: string
  signal?: AbortSignal
}): Promise<CvExtractResult> {
  return extractCv({
    accountId: input.accountId,
    fileNodeId: input.fileNodeId,
    signal: input.signal,
  })
}

/* ── Intake / lifecycle RPCs (UI wires these after extract) ─────────────── */

export async function cvIntakeBegin() {
  return unwrap(await callPlatform('app_profile_cv_intake_begin', {}))
}

export async function cvIntakeStatus() {
  return unwrap(await callPlatform('app_profile_cv_intake_status', {}))
}

export async function cvIntakeComplete(fields: Record<string, unknown>, fileNodeId?: string | null) {
  return unwrap(
    await callPlatform('app_profile_cv_intake_complete', {
      p_fields: fields,
      p_file_node_id: fileNodeId ?? null,
    }),
  )
}

export async function cvGet(): Promise<{
  documentNodeId: string
  body: unknown
  onboarding?: unknown
}> {
  return unwrap(await callPlatform('app_profile_cv_get', {})) as {
    documentNodeId: string
    body: unknown
    onboarding?: unknown
  }
}

export async function cvUpdate(body: Record<string, unknown>) {
  return unwrap(await callPlatform('app_profile_cv_update', { p_body: body }))
}

export async function cvSectionUpsert(section: Record<string, unknown>) {
  return unwrap(await callPlatform('app_profile_cv_section_upsert', { p_section: section }))
}

export async function cvSectionDelete(sectionId: string) {
  return unwrap(await callPlatform('app_profile_cv_section_delete', { p_section_id: sectionId }))
}

export async function cvGetFor(subjectUserId: string) {
  return unwrap(
    await callPlatform('app_profile_cv_get_for', { p_subject_user_id: subjectUserId }),
  )
}

export async function cvListDiscoverable(opts: {
  limit?: number
  offset?: number
  query?: string | null
} = {}) {
  return unwrap(
    await callPlatform('app_profile_cv_list_discoverable', {
      p_limit: opts.limit ?? 50,
      p_offset: opts.offset ?? 0,
      p_query: opts.query ?? null,
    }),
  )
}

export {
  cvDriveBodyToViewerDoc,
  cvViewerDocToDrivePatch,
  type CvDriveBodyV2,
  type CvViewerDocToDriveOptions,
} from './cvDocument'

export {
  normalizeCvViewerDoc,
  softNormalizeCvStreamDoc,
  formatCvDateStored,
  formatCvTitleCase,
  SECTION_KIND_ORDER,
} from './cvNormalize'

export { buildCvReviewTips, isConfirmatoryTip } from './cvTips'
