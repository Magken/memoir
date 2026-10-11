import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { SCROLL_TYPE_FX } from '../../lib/animations/scrollTypeFx'
import { ScrollTrigger } from '../../lib/gsap'
import { ScrollTypeFx } from '../ScrollTypeFx'
import { Select } from '../Select'

export function ScrollTypeFxShowcase() {
  const [searchParams, setSearchParams] = useSearchParams()
  const effectParam = Number(searchParams.get('effect') || '')
  const initialSet = effectParam >= 16 ? 2 : 1
  const [setId, setSetId] = useState<1 | 2>(initialSet)

  const items = useMemo(() => SCROLL_TYPE_FX.filter((fx) => fx.set === setId), [setId])

  useEffect(() => {
    let cancelled = false
    let secondFrame = 0
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => ScrollTrigger.refresh())
    })

    void document.fonts?.ready.then(() => {
      if (!cancelled) ScrollTrigger.refresh()
    })

    return () => {
      cancelled = true
      window.cancelAnimationFrame(firstFrame)
      window.cancelAnimationFrame(secondFrame)
    }
  }, [setId])

  const jumpOptions = [
    { value: '', label: 'Jump to effect…' },
    ...items.map((fx) => ({ value: String(fx.id), label: `${fx.id}. ${fx.label}` })),
  ]

  function jumpTo(value: string) {
    if (!value) return
    const id = Number(value)
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set('section', 'typography-scroll-fx')
        next.set('effect', String(id))
        return next
      },
      { replace: true },
    )
    document.getElementById(`scroll-fx-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <div className="space-y-6">
      <p className="type-body-sm type-muted prose-measure mb-0">
        On-scroll typography from{' '}
        <a
          className="underline"
          href="https://github.com/codrops/OnScrollTypographyAnimations"
          target="_blank"
          rel="noreferrer"
        >
          Codrops
        </a>{' '}
        (MIT). Scroll moderately. Set tabs unmount inactive effects for ScrollTrigger perf. Faces:{' '}
        <Link className="underline" to="/theme?section=typography-display-faces">
          Display faces
        </Link>
        .
      </p>
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex gap-2">
          <button
            type="button"
            className={[
              'type-label rounded border px-3 py-2',
              setId === 1 ? 'border-[var(--theme-accent)]' : 'border-[var(--theme-border)]',
            ].join(' ')}
            onClick={() => setSetId(1)}
          >
            Set 1 (1–15)
          </button>
          <button
            type="button"
            className={[
              'type-label rounded border px-3 py-2',
              setId === 2 ? 'border-[var(--theme-accent)]' : 'border-[var(--theme-border)]',
            ].join(' ')}
            onClick={() => setSetId(2)}
          >
            Set 2 (16–29)
          </button>
        </div>
        <div className="max-w-xs min-w-[14rem]">
          <Select label="Jump" options={jumpOptions} value="" onChange={jumpTo} />
        </div>
      </div>
      <div className="space-y-2">
        {items.map((meta) => (
          <ScrollTypeFx key={meta.id} meta={meta} />
        ))}
      </div>
    </div>
  )
}
