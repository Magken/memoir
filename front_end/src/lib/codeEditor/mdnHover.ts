/** MDN hover — inline summary, never navigate off-site. */

const MDN_HOST = /(?:www\.)?developer\.mozilla\.org/i
const MDN_URL_RE =
  /https?:\/\/(?:www\.)?developer\.mozilla\.org\/[^\s)\]>"']+/gi
const MDN_MD_LINK_RE =
  /\[([^\]]*)\]\((https?:\/\/(?:www\.)?developer\.mozilla\.org\/[^)]+)\)/gi

const FETCH_MS = 1200
const cache = new Map<string, Promise<MdnDoc | null>>()

export type MdnDoc = {
  title: string
  summary: string
  url: string
}

export function isMdnUrl(href: string): boolean {
  try {
    const u = new URL(href)
    return MDN_HOST.test(u.hostname) && u.pathname.includes('/docs/')
  } catch {
    return /developer\.mozilla\.org\/.+\/docs\//i.test(href)
  }
}

export function extractMdnUrls(text: string): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  const raw = String(text ?? '')
  for (const match of raw.matchAll(MDN_URL_RE)) {
    const url = String(match[0] ?? '').replace(/[.,;:]+$/, '')
    if (!url || seen.has(url) || !isMdnUrl(url)) continue
    seen.add(url)
    out.push(url)
  }
  return out
}

export function mdnIndexJsonUrl(pageUrl: string): string | null {
  if (!isMdnUrl(pageUrl)) return null
  try {
    const u = new URL(pageUrl)
    u.hash = ''
    u.search = ''
    let path = u.pathname.replace(/\/+$/, '')
    if (!path.endsWith('/index.json')) path = `${path}/index.json`
    u.pathname = path
    return u.toString()
  } catch {
    return null
  }
}

export function stripMdnMarkdownLinks(markdown: string): string {
  return String(markdown ?? '').replace(MDN_MD_LINK_RE, (_all, label: string) => {
    const t = String(label ?? '').trim()
    return t && !/^mdn reference$/i.test(t) ? t : 'MDN'
  })
}

export function rewriteMdnHoverMarkdown(
  markdown: string,
  docs: readonly MdnDoc[],
): string {
  let body = stripMdnMarkdownLinks(markdown)
  body = body.replace(MDN_URL_RE, '').replace(/\n{3,}/g, '\n\n').trim()
  if (!docs.length) return body
  const blocks = docs
    .map((d) => {
      const title = d.title.trim() || 'MDN'
      const summary = d.summary.trim()
      return summary ? `**${title}**\n\n${summary}` : `**${title}**`
    })
    .join('\n\n')
  return body ? `${body}\n\n${blocks}` : blocks
}

export function parseMdnIndexJson(raw: unknown, pageUrl: string): MdnDoc | null {
  if (!raw || typeof raw !== 'object') return null
  const root = raw as Record<string, unknown>
  const doc = (root.doc && typeof root.doc === 'object' ? root.doc : root) as Record<
    string,
    unknown
  >
  const title = String(doc.title ?? doc.short_title ?? '').trim()
  let summary = String(doc.summary ?? '').trim()
  if (!summary && typeof doc.excerpt === 'string') summary = doc.excerpt.trim()
  if (!summary) return title ? { title, summary: '', url: pageUrl } : null
  return { title: title || 'MDN', summary, url: pageUrl }
}

export async function fetchMdnDoc(pageUrl: string): Promise<MdnDoc | null> {
  const jsonUrl = mdnIndexJsonUrl(pageUrl)
  if (!jsonUrl) return null
  const hit = cache.get(jsonUrl)
  if (hit) return hit
  const pending = (async () => {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), FETCH_MS)
    try {
      const res = await fetch(jsonUrl, {
        signal: ctrl.signal,
        headers: { Accept: 'application/json' },
      })
      if (!res.ok) return null
      return parseMdnIndexJson(await res.json(), pageUrl)
    } catch {
      return null
    } finally {
      clearTimeout(timer)
    }
  })()
  cache.set(jsonUrl, pending)
  return pending
}

export function isHandledHoverLink(
  href: string,
  opts?: { blockAllHttps?: boolean },
): boolean {
  const value = String(href ?? '').trim()
  if (!value) return false
  if (isMdnUrl(value)) return true
  if (opts?.blockAllHttps && /^https?:\/\//i.test(value)) return true
  return false
}

type MonacoApi = {
  languages: {
    registerHoverProvider: (
      lang: string,
      provider: { provideHover: (...args: never[]) => unknown },
    ) => { dispose: () => void }
    typescript?: {
      getTypeScriptWorker?: () => Promise<(uri: unknown) => Promise<QuickInfoClient>>
      getJavaScriptWorker?: () => Promise<(uri: unknown) => Promise<QuickInfoClient>>
    }
  }
  editor?: {
    registerLinkOpener?: (opener: {
      open: (resource: { toString: () => string }) => boolean
    }) => { dispose: () => void }
  }
}

type QuickInfoClient = {
  getQuickInfoAtPosition: (
    file: string,
    offset: number,
  ) => Promise<{
    documentation?: Array<{ text?: string }>
    tags?: Array<{ name?: string; text?: Array<{ text?: string }> | string }>
  } | null>
}

function quickInfoText(info: {
  documentation?: Array<{ text?: string }>
  tags?: Array<{ name?: string; text?: Array<{ text?: string }> | string }>
}): string {
  const parts: string[] = []
  for (const d of info.documentation ?? []) {
    if (d.text) parts.push(d.text)
  }
  for (const tag of info.tags ?? []) {
    const body = Array.isArray(tag.text)
      ? tag.text.map((t) => t.text ?? '').join('')
      : String(tag.text ?? '')
    if (body) parts.push(body)
  }
  return parts.join('\n')
}

let installed = false
const disposers: Array<{ dispose: () => void }> = []

function swallowHoverLinkClicks(event: MouseEvent, blockAllHttps: boolean) {
  const el = event.target as HTMLElement | null
  const a = el?.closest?.('a')
  if (!a) return
  const href = a.getAttribute('href') || (a as HTMLAnchorElement).href || ''
  if (!isHandledHoverLink(href, { blockAllHttps })) return
  event.preventDefault()
  event.stopPropagation()
}

/**
 * Install once: extra MDN hover contents for JS/TS + swallow outbound hover links.
 * Hover widgets live on the themed Monaco overflow host (not a bare body node).
 */
export function installMdnHover(
  monaco: MonacoApi,
  opts?: { blockAllHttps?: boolean },
): void {
  if (installed) return
  installed = true
  const blockAllHttps = Boolean(opts?.blockAllHttps)

  const onClick = (event: MouseEvent) => swallowHoverLinkClicks(event, blockAllHttps)
  document.addEventListener('click', onClick, true)
  disposers.push({
    dispose: () => document.removeEventListener('click', onClick, true),
  })

  if (typeof monaco.editor?.registerLinkOpener === 'function') {
    disposers.push(
      monaco.editor.registerLinkOpener({
        open: (resource) => isHandledHoverLink(resource.toString(), { blockAllHttps }),
      }),
    )
  }

  const provideHover = async (
    model: {
      uri?: { toString: () => string }
      getLanguageId?: () => string
      getOffsetAt?: (pos: { lineNumber: number; column: number }) => number
      getWordAtPosition: (pos: { lineNumber: number; column: number }) => {
        word: string
        startColumn: number
        endColumn: number
      } | null
      getLineContent: (line: number) => string
    },
    position: { lineNumber: number; column: number },
  ) => {
    const word = model.getWordAtPosition(position)
    const line = model.getLineContent(position.lineNumber)
    let blob = `${word?.word ?? ''} ${line}`
    try {
      const lang = model.getLanguageId?.() ?? ''
      const ts = monaco.languages.typescript
      const getWorker =
        lang === 'javascript' ? ts?.getJavaScriptWorker : ts?.getTypeScriptWorker
      if (getWorker && model.uri && model.getOffsetAt) {
        const factory = await getWorker()
        const client = await factory(model.uri)
        const info = await client.getQuickInfoAtPosition(
          model.uri.toString(),
          model.getOffsetAt(position),
        )
        if (info) blob = `${blob}\n${quickInfoText(info)}`
      }
    } catch {
      /* worker optional */
    }
    const urls = extractMdnUrls(blob)
    if (!urls.length) return null
    const docs = (await Promise.all(urls.map((u) => fetchMdnDoc(u)))).filter(
      (d): d is MdnDoc => Boolean(d?.summary || d?.title),
    )
    if (!docs.length) return null
    const range = word
      ? {
          startLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endLineNumber: position.lineNumber,
          endColumn: word.endColumn,
        }
      : {
          startLineNumber: position.lineNumber,
          startColumn: position.column,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        }
    return {
      range,
      contents: [{ value: rewriteMdnHoverMarkdown('', docs) }],
    }
  }

  for (const lang of ['typescript', 'javascript']) {
    disposers.push(
      monaco.languages.registerHoverProvider(lang, {
        provideHover: ((model: unknown, position: unknown) =>
          provideHover(
            model as Parameters<typeof provideHover>[0],
            position as Parameters<typeof provideHover>[1],
          )) as (model: never, position: never) => unknown,
      }),
    )
  }
}
