/**
 * In-sitting copy/paste routes — hash buffer only, never clipboard text.
 */
export const COPY_SURFACE_ATTR = 'data-copy-surface'

export const COPY_SURFACES = ['brief', 'editor', 'terminal', 'chat', 'form', 'doc'] as const

export type CopySurface = (typeof COPY_SURFACES)[number]

export type PasteRouteFrom = 'internal' | 'external'

export type PasteRoute = {
  from: PasteRouteFrom
  srcSurface?: CopySurface
  destSurface: CopySurface | 'unknown'
  chars: number
  label: 'internal_assist_help' | 'external_dump' | 'internal_editor' | 'external_small'
}

type BufferEntry = {
  hash: string
  chars: number
  surface: CopySurface | null
  t: number
}

const HASH_WINDOW_MS = 30 * 60 * 1000

let buffer: BufferEntry | null = null

export function hashClipboardText(text: string): string {
  let h = 2166136261 >>> 0
  const s = String(text ?? '')
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return h.toString(16).padStart(8, '0')
}

export function isCopySurface(raw: unknown): raw is CopySurface {
  return COPY_SURFACES.includes(String(raw ?? '') as CopySurface)
}

export function resolveCopySurface(node: Node | null): CopySurface | null {
  const el = node instanceof Element ? node : node?.parentElement ?? null
  if (!el) return null
  const hit = el.closest(`[${COPY_SURFACE_ATTR}]`)
  if (!(hit instanceof Element)) return null
  const raw = hit.getAttribute(COPY_SURFACE_ATTR)
  return isCopySurface(raw) ? raw : null
}

export function resetClipboardBuffer(): void {
  buffer = null
}

export function rememberSittingCopy(text: string, surface: CopySurface | null, t = Date.now()): void {
  const body = String(text ?? '')
  if (!body) return
  buffer = {
    hash: hashClipboardText(body),
    chars: body.length,
    surface,
    t,
  }
}

export function routeSittingPaste(
  text: string,
  destSurface: CopySurface | null,
  t = Date.now(),
): PasteRoute {
  const body = String(text ?? '')
  const chars = body.length
  const dest: CopySurface | 'unknown' = destSurface ?? 'unknown'
  const live = buffer && t - buffer.t <= HASH_WINDOW_MS ? buffer : null
  const internal = Boolean(live && live.hash === hashClipboardText(body))
  const from: PasteRouteFrom = internal ? 'internal' : 'external'
  const srcSurface = internal ? live?.surface ?? undefined : undefined
  let label: PasteRoute['label'] = from === 'internal' ? 'internal_editor' : 'external_dump'
  if (from === 'internal' && (srcSurface === 'chat' || dest === 'chat')) label = 'internal_assist_help'
  if (from === 'external' && chars < 40) label = 'external_small'
  return { from, srcSurface, destSurface: dest, chars, label }
}

export function formatPasteRouteNote(route: PasteRoute): string {
  const src = route.srcSurface ?? (route.from === 'internal' ? 'unknown' : '')
  const dest = route.destSurface
  const hop = src ? `${src}->${dest}` : dest
  return `${route.from}|${hop}|${route.chars}|${route.label}`
}

/** Test seam — never expose stored text. */
export function peekClipboardBufferForTests(): BufferEntry | null {
  return buffer ? { ...buffer } : null
}
