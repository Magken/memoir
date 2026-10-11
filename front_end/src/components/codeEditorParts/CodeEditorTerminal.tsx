import { Eraser } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import {
  type CodeTerminalItem,
  parseTerminalLineSegments,
} from '../../lib/interviewRunApi/formatCodeRunTerminal'
import { IconButton } from '../IconButton'
import { ThemeScroll } from '../ThemeScroll'

type TerminalRevealKind = 'error' | 'pass'

type CodeEditorTerminalProps = {
  open: boolean
  items: readonly CodeTerminalItem[]
  onSubmit: (line: string) => void
  onAppend: (line: string) => void
  onClear?: () => void
  onRevealLocation?: (
    path: string,
    line: number,
    column: number,
    kind?: TerminalRevealKind,
  ) => void
}

export function CodeEditorTerminal({
  open,
  items,
  onSubmit,
  onClear,
  onRevealLocation,
}: CodeEditorTerminalProps) {
  const [draft, setDraft] = useState('')
  const scrollViewportRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    // Scroll only inside the terminal ThemeScroll — never scrollIntoView (that
    // walks page ancestors and jumps the interview brief/editor scroll).
    const stickBottom = () => {
      const viewport = scrollViewportRef.current
      if (!viewport) return
      viewport.scrollTop = viewport.scrollHeight
    }
    stickBottom()
    const raf = window.requestAnimationFrame(stickBottom)
    return () => window.cancelAnimationFrame(raf)
  }, [items, open])

  return (
    <div className="theme-code-editor__terminal" role="log" aria-label="Terminal">
      <div className="theme-code-editor__terminal-header">
        <div className="theme-code-editor__terminal-label type-caption">Terminal</div>
        {onClear ? (
          <IconButton
            icon={Eraser}
            aria-label="Clear terminal"
            size="xs"
            variant="ghost"
            className="theme-code-editor__terminal-clear"
            disabled={!open || items.length === 0}
            onClick={onClear}
          />
        ) : null}
      </div>
      <ThemeScroll
        axis="vertical"
        rail="nano"
        className="theme-code-editor__terminal-scroll"
        viewportRef={scrollViewportRef}
      >
        <div className="theme-code-editor__terminal-body">
          {items.map((item, index) => (
            <TerminalItemRow
              key={`${index}-${itemKey(item)}`}
              item={item}
              onRevealLocation={onRevealLocation}
            />
          ))}
        </div>
      </ThemeScroll>
      <form
        className="theme-code-editor__terminal-input-row"
        onSubmit={(e) => {
          e.preventDefault()
          if (!open) return
          const next = draft.trimEnd()
          if (!next) return
          onSubmit(next)
          setDraft('')
        }}
      >
        <span className="theme-code-editor__terminal-prompt type-caption" aria-hidden>
          ›
        </span>
        <input
          className="theme-code-editor__terminal-input type-caption"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          aria-label="Terminal input"
          spellCheck={false}
          autoComplete="off"
          disabled={!open}
        />
      </form>
    </div>
  )
}

function itemKey(item: CodeTerminalItem): string {
  switch (item.kind) {
    case 'divider':
      return 'div'
    case 'header':
      return `h-${item.title}`
    case 'section':
      return `s-${item.title}`
    case 'goto':
      return `g-${item.path}:${item.line}`
    case 'pass':
    case 'fail':
    case 'text':
      return item.text.slice(0, 28)
    default:
      return 'x'
  }
}

function TerminalItemRow({
  item,
  onRevealLocation,
}: {
  item: CodeTerminalItem
  onRevealLocation?: (
    path: string,
    line: number,
    column: number,
    kind?: 'error' | 'pass',
  ) => void
}) {
  if (item.kind === 'divider') {
    return <div className="theme-code-editor__terminal-divider" role="separator" aria-hidden />
  }
  if (item.kind === 'header') {
    return (
      <div className="theme-code-editor__terminal-runhead type-caption">
        <span className="theme-code-editor__terminal-runhead-title">{item.title}</span>
        <span className="theme-code-editor__terminal-runhead-time">{item.time}</span>
      </div>
    )
  }
  if (item.kind === 'section') {
    return (
      <div className="theme-code-editor__terminal-section type-caption" role="presentation">
        {item.title}
      </div>
    )
  }
  if (item.kind === 'goto') {
    const label = item.label || `${item.path}:${item.line}${item.column > 1 ? `:${item.column}` : ''}`
    return (
      <div className="theme-code-editor__terminal-line theme-code-editor__terminal-line--error type-caption">
        <button
          type="button"
          className="theme-code-editor__terminal-loc"
          onClick={() => onRevealLocation?.(item.path, item.line, item.column, 'error')}
          title={`Go to ${label}`}
        >
          {label}
        </button>
      </div>
    )
  }
  if (item.kind === 'pass' || item.kind === 'fail') {
    return (
      <div
        className={[
          'theme-code-editor__terminal-line',
          'type-caption',
          item.kind === 'pass'
            ? 'theme-code-editor__terminal-line--pass'
            : 'theme-code-editor__terminal-line--fail',
        ].join(' ')}
      >
        {item.kind === 'pass' ? 'PASS' : 'FAIL'} {item.text}
      </div>
    )
  }

  const tone = item.tone && item.tone !== 'default' ? item.tone : null
  const segs = onRevealLocation ? parseTerminalLineSegments(item.text) : null
  const hasLoc = Boolean(segs?.some((s) => s.kind === 'loc'))
  return (
    <div
      className={[
        'theme-code-editor__terminal-line',
        'type-caption',
        tone ? `theme-code-editor__terminal-line--${tone}` : '',
        hasLoc ? 'theme-code-editor__terminal-line--has-loc' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {segs
        ? segs.map((seg, i) =>
            seg.kind === 'loc' ? (
              <button
                key={`${i}-${seg.text}`}
                type="button"
                className="theme-code-editor__terminal-loc"
                onClick={() =>
                  onRevealLocation?.(
                    seg.path,
                    seg.line,
                    seg.column,
                    tone === 'pass' ? 'pass' : tone === 'fail' || tone === 'error' ? 'error' : undefined,
                  )
                }
                title={`Go to ${seg.path}:${seg.line}`}
              >
                {seg.text}
              </button>
            ) : (
              <span key={`${i}-${seg.text.slice(0, 12)}`}>{seg.text}</span>
            ),
          )
        : item.text}
    </div>
  )
}

export function runStubTerminalCommand(line: string): string[] {
  const trimmed = line.trim()
  if (!trimmed) return []
  if (trimmed === 'clear') return ['__CLEAR__']
  if (trimmed === 'help') {
    return [
      '› help',
      'Commands: help · clear · echo <text>',
      'Press Run to execute tests against the active solve file.',
    ]
  }
  if (trimmed.startsWith('echo ')) {
    return [`› ${trimmed}`, trimmed.slice(5)]
  }
  return [`› ${trimmed}`, `command not found: ${trimmed.split(/\s+/)[0]}`]
}
