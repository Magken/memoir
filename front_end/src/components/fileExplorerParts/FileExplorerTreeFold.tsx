import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'

const FOLD_MS = 240

/** Measured-height fold so expand/collapse always animates (grid 0fr/1fr is flaky). */
export function FileExplorerTreeFold({
  open,
  children,
}: {
  open: boolean
  children: ReactNode
}) {
  const innerRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState<number | 'auto'>(open ? 'auto' : 0)
  const [visible, setVisible] = useState(open)
  const first = useRef(true)

  useLayoutEffect(() => {
    const el = innerRef.current
    if (!el) return

    if (first.current) {
      first.current = false
      setHeight(open ? 'auto' : 0)
      setVisible(open)
      return
    }

    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reduce) {
      setHeight(open ? 'auto' : 0)
      setVisible(open)
      return
    }

    if (open) {
      setVisible(true)
      const target = el.scrollHeight
      setHeight(0)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setHeight(target))
      })
      const done = window.setTimeout(() => setHeight('auto'), FOLD_MS)
      return () => window.clearTimeout(done)
    }

    const current = el.scrollHeight
    setHeight(current)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setHeight(0))
    })
    const done = window.setTimeout(() => setVisible(false), FOLD_MS)
    return () => window.clearTimeout(done)
  }, [open])

  return (
    <div
      className={[
        'theme-file-explorer__tree-fold',
        open || visible ? 'theme-file-explorer__tree-fold--open' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ height: typeof height === 'number' ? `${height}px` : height }}
      aria-hidden={!open}
    >
      <div ref={innerRef} className="theme-file-explorer__tree-fold-inner">
        {children}
      </div>
    </div>
  )
}
