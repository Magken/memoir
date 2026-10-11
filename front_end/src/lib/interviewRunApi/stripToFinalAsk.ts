/**
 * Keep framing statements + the final answer-seeking question.
 * Preserves Markdown newlines (### / lists / > quotes) — never flatten to one line.
 */
export function countAnswerSeekingAsks(text: string): number {
  return (text.match(/\?/g) ?? []).length
}

/** Collapse horizontal whitespace only; keep Markdown line breaks. */
export function normalizeTalkMarkdownWhitespace(text: string): string {
  return text
    .replace(/[\u2014\u2013]/g, '-')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

function mapOutsideFences(text: string, fn: (chunk: string) => string): string {
  return text
    .split(/(```[\s\S]*?```)/g)
    .map((chunk, i) => (i % 2 === 1 ? chunk : fn(chunk)))
    .join('')
}

/**
 * CommonMark will not treat `- item` as a list if it continues a paragraph.
 * Also split inline ": - Item" soup the model still emits.
 * Never flatten `\n- ` into ` - ` (that glued bot bubbles into one blob).
 */
export function ensureTalkMarkdownListBreaks(text: string): string {
  return mapOutsideFences(text, (part) => {
    let t = part
    // Inline soup after colon or sentence end: "files: - Item" / "Done. - first"
    t = t.replace(/([:!?]|[.])[ \t]+-[ \t]+/g, '$1\n\n- ')
    t = t.replace(/([^\n])\n(?=[-*] |\d+\. )/g, (_m, prev: string, offset: number, str: string) => {
      const lastLine = str.slice(0, offset).split('\n').pop() ?? ''
      if (/^\s*(?:[-*] |\d+\. )/.test(lastLine) || !lastLine.trim()) return `${prev}\n`
      return `${prev}\n\n`
    })
    t = t.replace(/([^\n]) - (?=[A-Z*])/g, '$1\n- ')
    return t
  })
}

/** Em/en dash → ASCII; do not eat markdown list newlines. */
export function scrubChatDashMarkers(text: string): string {
  return ensureTalkMarkdownListBreaks(
    String(text ?? '')
      .replace(/\u2014/g, ' - ')
      .replace(/\u2013/g, ' - ')
      .replace(/[ \t]+-[ \t]+/g, ' - '),
  )
}

/**
 * Ensure **bold** / *italic* / `code` markers are not glued to adjacent words.
 * Covers: `**Use Next**when` → `**Use Next** when`, `on*cue*` → `on *cue*`,
 * `in\`src/helpers.ts\`` stays spaced, `function\`incrementOneTo200\`` → `function \`incrementOneTo200\``.
 * Does not insert spaces before punctuation (.,!?;:).
 */
export function ensureTalkMarkdownEmphasisSpacing(text: string): string {
  let t = text
  // Bold glued on the left: word**span** → word **span**
  t = t.replace(/([A-Za-z0-9])\*\*([A-Za-z0-9][^*]*?)\*\*/g, '$1 **$2**')
  // Bold glued on the right: **span**word → **span** word
  t = t.replace(/\*\*([^*]+?)\*\*(?=[A-Za-z0-9])/g, '**$1** ')
  // Italic glued on the right: *span*word → *span* word
  t = t.replace(/(?<!\*)\*([^*\n]+?)\*(?!\*)(?=[A-Za-z0-9])/g, '*$1* ')
  // Italic glued on the left: word*span* → word *span*
  // Require the closing * to end the run (space/punct/EOL) so we never treat a
  // real closing * as an opener (e.g. *security*or).
  t = t.replace(
    /([A-Za-z0-9])\*(?!\*)([A-Za-z0-9][^*\n]*?)\*(?!\*)(?=[\s.,:;!?)"'\]]|$)/g,
    '$1 *$2*',
  )
  t = ensureInlineCodeSpacing(t)
  return ensureTalkMarkdownListBreaks(t)
}

/** Inline `code` glued on either side — keep type-code chrome readable. */
export function ensureInlineCodeSpacing(text: string): string {
  return mapOutsideFences(text, (part) => {
    let t = part
    t = t.replace(/([A-Za-z0-9])`([^`\n]+)`/g, '$1 `$2`')
    t = t.replace(/`([^`\n]+)`(?=[A-Za-z0-9])/g, '`$1` ')
    return t
  })
}

/** Fix common broken bold / empty markers the model emits. */
export function scrubBrokenTalkMarkdown(text: string): string {
  let t = String(text ?? '')
  t = t.replace(/\*\*\s*\*\*/g, '')
  // Normalize paired bold with optional spaces inside markers: ** foo ** / **foo ** / ** foo**
  t = t.replace(/\*\*[ \t]*([^*\n]+?)[ \t]*\*\*/g, (_m, inner: string) => {
    const trimmed = String(inner).trim()
    return trimmed ? `**${trimmed}**` : ''
  })
  t = ensureTalkMarkdownEmphasisSpacing(t)
  // Re-normalize if glue spacing reintroduced inner pads
  t = t.replace(/\*\*[ \t]*([^*\n]+?)[ \t]*\*\*/g, (_m, inner: string) => {
    const trimmed = String(inner).trim()
    return trimmed ? `**${trimmed}**` : ''
  })
  t = stripOrphanBoldMarkers(t)
  return t
}

/**
 * Odd count of `**` leaves literal asterisks in chat MD. Drop the leftover
 * (prefer a stray leading opener — common model slip: `** Happy to…`).
 */
export function stripOrphanBoldMarkers(text: string): string {
  const marks = text.match(/\*\*/g)
  if (!marks || marks.length % 2 === 0) return text
  // Prefer stripping a leading opener at start of string / paragraph.
  if (/^\s*\*\*/.test(text)) {
    return text.replace(/^\s*\*\*[ \t]*/, '')
  }
  if (/\n\n\*\*/.test(text)) {
    return text.replace(/(\n\n)\*\*[ \t]*/, '$1')
  }
  // Else drop the last marker.
  const idx = text.lastIndexOf('**')
  if (idx < 0) return text
  return text.slice(0, idx) + text.slice(idx + 2)
}

export function stripToFinalAsk(text: string): string {
  const t = scrubBrokenTalkMarkdown(normalizeTalkMarkdownWhitespace(text))
  if (!t) return t
  if (countAnswerSeekingAsks(t) <= 1) return t

  const parts: string[] = []
  let buf = ''
  for (const ch of t) {
    buf += ch
    if (ch === '.' || ch === '!' || ch === '?') {
      parts.push(buf)
      buf = ''
    }
  }
  if (buf) parts.push(buf)

  const questions = parts.filter((p) => p.trimEnd().endsWith('?'))
  if (questions.length <= 1) return t
  const lastQ = questions[questions.length - 1]!.trim()
  const framing = parts
    .filter((p) => !p.trimEnd().endsWith('?'))
    .join('')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return [framing, lastQ].filter(Boolean).join(framing ? '\n\n' : '').trim()
}
