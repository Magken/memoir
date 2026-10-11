import { createElement, type MouseEvent, type ReactNode } from 'react'

export type MarkKind = 'bold' | 'italic' | 'underline'

const MARKERS: Record<MarkKind, { open: string; close: string }> = {
  bold: { open: '**', close: '**' },
  italic: { open: '_', close: '_' },
  underline: { open: '++', close: '++' },
}

const MARK_CLASS: Record<MarkKind, string> = {
  bold: 'theme-vurify-viewer__mark-bold',
  italic: 'theme-vurify-viewer__mark-italic',
  underline: 'theme-vurify-viewer__mark-underline',
}

/** Wrap selection with mark markers, or unwrap if the selection is exactly one marked run. */
export function toggleMarkOnSelection(
  value: string,
  start: number,
  end: number,
  kind: MarkKind,
): { next: string; selectStart: number; selectEnd: number } {
  if (start === end || start < 0 || end > value.length || start > end) {
    return { next: value, selectStart: start, selectEnd: end }
  }

  const { open, close } = MARKERS[kind]
  const selected = value.slice(start, end)

  if (selected.startsWith(open) && selected.endsWith(close) && selected.length > open.length + close.length) {
    const inner = selected.slice(open.length, selected.length - close.length)
    const next = value.slice(0, start) + inner + value.slice(end)
    return { next, selectStart: start, selectEnd: start + inner.length }
  }

  // Selection already tightly wrapped by markers outside
  const before = value.slice(Math.max(0, start - open.length), start)
  const after = value.slice(end, end + close.length)
  if (before === open && after === close) {
    const next = value.slice(0, start - open.length) + selected + value.slice(end + close.length)
    const selectStart = start - open.length
    return { next, selectStart, selectEnd: selectStart + selected.length }
  }

  const wrapped = `${open}${selected}${close}`
  const next = value.slice(0, start) + wrapped + value.slice(end)
  return { next, selectStart: start, selectEnd: start + wrapped.length }
}

export function uppercaseSelection(
  value: string,
  start: number,
  end: number,
): { next: string; selectStart: number; selectEnd: number } {
  if (start === end) return { next: value, selectStart: start, selectEnd: end }
  const selected = value.slice(start, end).toUpperCase()
  const next = value.slice(0, start) + selected + value.slice(end)
  return { next, selectStart: start, selectEnd: start + selected.length }
}

type Token =
  | { type: 'text'; text: string }
  | { type: 'mark'; kind: MarkKind; children: Token[] }
  | { type: 'link'; href: string; text: string }

const URL_RE = /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+)/gi

function hrefFor(raw: string): string {
  return raw.startsWith('http') ? raw : `https://${raw}`
}

function linkifyText(text: string): Token[] {
  const tokens: Token[] = []
  let last = 0
  const re = new RegExp(URL_RE.source, 'gi')
  let match: RegExpExecArray | null
  while ((match = re.exec(text))) {
    if (match.index > last) {
      tokens.push({ type: 'text', text: text.slice(last, match.index) })
    }
    const raw = match[0]
    tokens.push({ type: 'link', href: hrefFor(raw), text: raw })
    last = match.index + raw.length
  }
  if (last < text.length) tokens.push({ type: 'text', text: text.slice(last) })
  return tokens.length > 0 ? tokens : [{ type: 'text', text }]
}

/**
 * Parse nested markers into a token tree (bold / italic / underline).
 * Order: underline, bold, italic — longer delimiters first where needed.
 */
function parseMarks(input: string): Token[] {
  if (!input) return []

  const patterns: Array<{ kind: MarkKind; re: RegExp }> = [
    { kind: 'underline', re: /\+\+(.+?)\+\+/ },
    { kind: 'bold', re: /\*\*(.+?)\*\*/ },
    { kind: 'italic', re: /_(.+?)_/ },
  ]

  let earliest: { kind: MarkKind; index: number; length: number; inner: string } | null = null
  for (const { kind, re } of patterns) {
    const match = re.exec(input)
    if (!match || match.index == null) continue
    if (!earliest || match.index < earliest.index) {
      earliest = {
        kind,
        index: match.index,
        length: match[0].length,
        inner: match[1] ?? '',
      }
    }
  }

  if (!earliest) return linkifyText(input)

  const tokens: Token[] = []
  if (earliest.index > 0) {
    tokens.push(...linkifyText(input.slice(0, earliest.index)))
  }
  tokens.push({
    type: 'mark',
    kind: earliest.kind,
    children: parseMarks(earliest.inner),
  })
  const rest = input.slice(earliest.index + earliest.length)
  if (rest) tokens.push(...parseMarks(rest))
  return tokens
}

function tokensToReact(tokens: Token[], keyPrefix: string): ReactNode[] {
  return tokens.map((token, index) => {
    const key = `${keyPrefix}-${index}`
    if (token.type === 'text') return token.text
    if (token.type === 'link') {
      return createElement(
        'a',
        {
          key,
          className: 'theme-vurify-viewer__link',
          href: token.href,
          target: '_blank',
          rel: 'noopener noreferrer',
          onClick: (e: MouseEvent) => e.stopPropagation(),
          onPointerDown: (e: MouseEvent) => e.stopPropagation(),
        },
        token.text,
      )
    }
    return createElement(
      'span',
      { key, className: MARK_CLASS[token.kind] },
      ...tokensToReact(token.children, key),
    )
  })
}

/** Idle display of marker-formatted plain text (URLs become links). */
export function formatMarksToReact(value: string): ReactNode {
  if (!value) return null
  return tokensToReact(parseMarks(value), 'm')
}

/** Idle display for a dedicated URL / link field. */
export function formatLinkToReact(value: string, label?: string): ReactNode {
  const trimmed = value.trim()
  if (!trimmed) return null
  const href = hrefFor(trimmed)
  return createElement(
    'a',
    {
      className: 'theme-vurify-viewer__link',
      href,
      target: '_blank',
      rel: 'noopener noreferrer',
      onClick: (e: MouseEvent) => e.stopPropagation(),
      onPointerDown: (e: MouseEvent) => e.stopPropagation(),
    },
    label?.trim() || trimmed,
  )
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function tokensToHtml(tokens: Token[]): string {
  return tokens
    .map((token) => {
      if (token.type === 'text') return escapeHtml(token.text).replace(/\n/g, '<br>')
      if (token.type === 'link') return escapeHtml(token.text)
      const tag = token.kind === 'bold' ? 'strong' : token.kind === 'italic' ? 'em' : 'u'
      return `<${tag}>${tokensToHtml(token.children)}</${tag}>`
    })
    .join('')
}

/** Marker string to HTML for contenteditable editing (visual marks; markers stay in storage only). */
export function marksToHtml(value: string): string {
  if (!value) return ''
  return tokensToHtml(parseMarks(value))
}

function nodeToMarks(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? ''
  if (node.nodeType !== Node.ELEMENT_NODE) return ''
  const el = node as HTMLElement
  const tag = el.tagName.toLowerCase()
  if (tag === 'br') return '\n'
  const inner = Array.from(el.childNodes).map(nodeToMarks).join('')
  if (tag === 'strong' || tag === 'b') return `**${inner}**`
  if (tag === 'em' || tag === 'i') return `_${inner}_`
  if (tag === 'u') return `++${inner}++`
  // Block wrappers from contenteditable — join with newline only between siblings.
  if (tag === 'div' || tag === 'p') return inner
  return inner
}

/** Contenteditable HTML → marker string for storage. */
export function htmlToMarks(root: HTMLElement): string {
  const hasMarks = Boolean(root.querySelector('strong, b, em, i, u'))
  if (!hasMarks) {
    return (root.innerText ?? '').replace(/\u00a0/g, ' ').replace(/\n+/g, '\n')
  }
  const parts: string[] = []
  root.childNodes.forEach((node, index) => {
    const piece = nodeToMarks(node)
    if (!piece) return
    const prev = root.childNodes[index - 1]
    const block =
      node.nodeType === Node.ELEMENT_NODE &&
      /^(div|p)$/i.test((node as HTMLElement).tagName)
    const prevBlock =
      prev &&
      prev.nodeType === Node.ELEMENT_NODE &&
      /^(div|p)$/i.test((prev as HTMLElement).tagName)
    if (parts.length > 0 && (block || prevBlock)) parts.push('\n')
    parts.push(piece)
  })
  return parts.join('').replace(/\u00a0/g, ' ')
}

function applyCapsToSelection(): boolean {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return false
  const text = sel.toString()
  if (!text) return false
  const range = sel.getRangeAt(0)
  range.deleteContents()
  range.insertNode(document.createTextNode(text.toUpperCase()))
  sel.removeAllRanges()
  return true
}

/** Apply emphasis to focused viewer control (contenteditable WYSIWYG or plain input). */
export function applyToActiveControl(kind: MarkKind | 'caps'): boolean {
  const el = document.activeElement
  if (!(el instanceof HTMLElement) || !el.closest('.theme-vurify-viewer')) return false

  if (el.isContentEditable) {
    if (kind === 'caps') {
      if (!applyCapsToSelection()) return false
    } else {
      const cmd = kind === 'bold' ? 'bold' : kind === 'italic' ? 'italic' : 'underline'
      document.execCommand(cmd)
    }
    el.dispatchEvent(new Event('input', { bubbles: true }))
    return true
  }

  if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return false
  const start = el.selectionStart
  const end = el.selectionEnd
  if (start == null || end == null || start === end) return false

  const result =
    kind === 'caps'
      ? uppercaseSelection(el.value, start, end)
      : toggleMarkOnSelection(el.value, start, end, kind)

  const proto =
    el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  const descriptor = Object.getOwnPropertyDescriptor(proto, 'value')
  descriptor?.set?.call(el, result.next)
  // Prefer InputEvent so React controlled onChange picks up the marked draft.
  el.dispatchEvent(
    new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertFromPaste' }),
  )
  el.setSelectionRange(result.selectStart, result.selectEnd)
  return true
}
