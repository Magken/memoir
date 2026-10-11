/**
 * Allowlisted HTML sanitizer for bot message `html` parts.
 * Uses DOMPurify when available; falls back to a strict tag stripper.
 */

const ALLOWED_TAGS = [
  'a',
  'b',
  'strong',
  'i',
  'em',
  'u',
  'p',
  'br',
  'ul',
  'ol',
  'li',
  'h1',
  'h2',
  'h3',
  'h4',
  'blockquote',
  'code',
  'pre',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'img',
  'section',
  'div',
  'span',
  'details',
  'summary',
  'figure',
  'figcaption',
]

const ALLOWED_ATTR = ['href', 'src', 'alt', 'title', 'class', 'target', 'rel', 'colspan', 'rowspan']

function fallbackSanitize(html: string): string {
  if (typeof document === 'undefined') {
    return html
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
      .replace(/\son\w+=(["']).*?\1/gi, '')
      .replace(/javascript:/gi, '')
  }
  const template = document.createElement('template')
  template.innerHTML = html
  const walk = (node: Node) => {
    const children = Array.from(node.childNodes)
    for (const child of children) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as HTMLElement
        const tag = el.tagName.toLowerCase()
        if (!ALLOWED_TAGS.includes(tag)) {
          el.replaceWith(...Array.from(el.childNodes))
          continue
        }
        for (const attr of Array.from(el.attributes)) {
          const name = attr.name.toLowerCase()
          const value = attr.value
          if (!ALLOWED_ATTR.includes(name) || name.startsWith('on')) {
            el.removeAttribute(attr.name)
            continue
          }
          if ((name === 'href' || name === 'src') && /^\s*javascript:/i.test(value)) {
            el.removeAttribute(attr.name)
          }
        }
        if (tag === 'a') {
          el.setAttribute('rel', 'noopener noreferrer')
          if (el.getAttribute('target') === '_blank') {
            el.setAttribute('target', '_blank')
          }
        }
        walk(el)
      }
    }
  }
  walk(template.content)
  return template.innerHTML
}

let purify: { sanitize: (html: string, cfg?: object) => string } | null | undefined

async function loadPurify() {
  if (purify !== undefined) return purify
  try {
    const mod = await import('isomorphic-dompurify')
    purify = (mod.default ?? mod) as { sanitize: (html: string, cfg?: object) => string }
  } catch {
    purify = null
  }
  return purify
}

export function sanitizeChatHtml(html: string): string {
  if (purify) {
    return purify.sanitize(html, {
      ALLOWED_TAGS,
      ALLOWED_ATTR,
      ALLOW_DATA_ATTR: false,
    })
  }
  return fallbackSanitize(html)
}

/** Prefetch DOMPurify when the bot surface mounts. */
export function ensureChatHtmlSanitizer(): Promise<void> {
  return loadPurify().then(() => undefined)
}
