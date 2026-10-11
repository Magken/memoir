import { useRef } from 'react'
import { useGSAP } from '../lib/gsap'
import type { TypeTracePreset, TypeTraceTrigger } from '../lib/animations/typeTracePresets'
import { playStrokeEnter, setStrokeDashLength } from '../lib/animations/textTrace'

export type { TypeTracePreset, TypeTraceTrigger } from '../lib/animations/typeTracePresets'
export { TYPE_TRACE_PRESETS, TYPE_TRACE_PRESET_OPTIONS } from '../lib/animations/typeTracePresets'

type TraceAnimTextProps = {
  children: string
  trace: TypeTracePreset
  trigger?: TypeTraceTrigger
  /** Parent `.theme-card` hover drives play when `trigger="hover"`. */
  parentHover?: boolean
  as?: 'span' | 'p' | 'div' | 'h1' | 'h2' | 'h3' | 'h4' | 'label'
  className?: string
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function TraceAnimText({
  children,
  trace,
  trigger = 'hover',
  parentHover = false,
  as: Tag = 'span',
  className = '',
}: TraceAnimTextProps) {
  const rootRef = useRef<HTMLElement>(null)
  const ghostRef = useRef<HTMLSpanElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const textRef = useRef<SVGTextElement>(null)

  useGSAP(
    () => {
      const root = rootRef.current
      const ghost = ghostRef.current
      const svg = svgRef.current
      const textEl = textRef.current
      if (!root || !ghost || !svg || !textEl) return undefined
      const rootEl = root
      const svgEl = svg
      const textNode = textEl

      let disposed = false
      let enterTl: ReturnType<typeof playStrokeEnter> | null = null

      async function mount() {
        await document.fonts.ready
        if (disposed) return

        enterTl?.kill()
        enterTl = null
        rootEl.classList.remove('type-trace--static', 'type-trace--ready')

        if (prefersReducedMotion()) {
          rootEl.classList.add('type-trace--static')
          return
        }

        textNode.textContent = children

        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
        })
        if (disposed) return

        const len = setStrokeDashLength(svgEl, textNode)
        if (!len) {
          rootEl.classList.add('type-trace--static')
          return
        }

        rootEl.classList.add('type-trace--ready')

        if (trigger === 'enter') {
          enterTl = playStrokeEnter(textNode, len, trace === 'trace-out')
        }
      }

      void mount()

      return () => {
        disposed = true
        enterTl?.kill()
        enterTl = null
      }
    },
    { scope: rootRef, dependencies: [children, trace, trigger, parentHover, className] },
  )

  const rootClass = [
    'type-trace',
    `type-trace--${trace}`,
    trigger === 'enter' ? 'type-trace--enter' : 'type-trace--hover',
    parentHover ? 'type-trace--parent-hover' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <Tag ref={rootRef as never} className={rootClass} aria-label={children}>
      <span ref={ghostRef} className="type-trace__ghost" aria-hidden>
        {children}
      </span>
      <svg ref={svgRef} className="type-trace__svg" aria-hidden xmlns="http://www.w3.org/2000/svg">
        <text ref={textRef} className="type-trace__text" dominantBaseline="hanging" x="0" y="0">
          {children}
        </text>
      </svg>
      <span className="type-trace__fallback" aria-hidden>
        {children}
      </span>
    </Tag>
  )
}
