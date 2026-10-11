import { useEffect, useRef, useState } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'

type EquationBlockProps = {
  latex: string
  /** Skip outer shell — use inside embed preview or nested hosts */
  bare?: boolean
  className?: string
}

export function EquationBlock({ latex, bare = false, className = '' }: EquationBlockProps) {
  const displayRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const el = displayRef.current
    if (!el) return
    if (!latex.trim()) {
      el.textContent = ''
      setError(null)
      return
    }
    try {
      katex.render(latex, el, { displayMode: true, throwOnError: true })
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid equation')
      el.textContent = latex
    }
  }, [latex])

  const display = (
    <>
      <div
        className={['theme-equation-block__katex', className].filter(Boolean).join(' ')}
        ref={displayRef}
      />
      {error ? <p className="theme-equation-block__error type-caption">{error}</p> : null}
    </>
  )

  if (bare) return display

  return (
    <div className={['theme-equation-block', className].filter(Boolean).join(' ')}>
      <div className="theme-equation-block__display">{display}</div>
    </div>
  )
}
