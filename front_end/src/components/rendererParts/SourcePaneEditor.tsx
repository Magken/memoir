import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { ThemeScroll } from '../ThemeScroll'

type SourcePaneEditorProps = {
  classPrefix: 'theme-markdown-renderer' | 'theme-mermaid-renderer' | 'theme-force-graph-renderer'
  value: string
  onChange: (value: string) => void
  'aria-label': string
}

export function SourcePaneEditor({
  classPrefix,
  value,
  onChange,
  'aria-label': ariaLabel,
}: SourcePaneEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const syncHeight = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    const viewport = el.closest('.theme-scroll__viewport') as HTMLElement | null
    const minHeight = viewport?.clientHeight ?? 0
    el.style.height = '0px'
    el.style.height = `${Math.max(minHeight, el.scrollHeight)}px`
  }, [])

  useLayoutEffect(() => {
    syncHeight()
  }, [syncHeight, value])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    const viewport = el.closest('.theme-scroll__viewport') as HTMLElement | null
    if (!viewport) return
    const observer = new ResizeObserver(() => syncHeight())
    observer.observe(viewport)
    return () => observer.disconnect()
  }, [syncHeight])

  return (
    <ThemeScroll
      rail="nano"
      tabIndex={-1}
      className={`${classPrefix}__source-scroll`}
    >
      <textarea
        ref={textareaRef}
        className={`${classPrefix}__source-input`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onInput={syncHeight}
        aria-label={ariaLabel}
        spellCheck={false}
        autoComplete="off"
      />
    </ThemeScroll>
  )
}
