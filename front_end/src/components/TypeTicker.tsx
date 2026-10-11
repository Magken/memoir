import { useRef } from 'react'
import type { TypeAnimPreset, TypeAnimSplit } from '../lib/animations/typeAnimPresets'
import { useTypeMessageCycle } from '../hooks/useTypeMessageCycle'
import { TypeAnimText } from './TypeAnimText'

export type TypeTickerProps = {
  items: readonly string[]
  /** Typography scale — passed to TypeAnimText `className`. */
  typeClass?: string
  /** Same preset ids as TypeAnimText / typography-animations.css */
  anim?: TypeAnimPreset
  split?: TypeAnimSplit
  sync?: boolean
  interval?: number
  className?: string
  label?: string
}

/** Discrete status ticker — TypeAnimText enter replay on each message swap. */
export function TypeTicker({
  items,
  typeClass = 'type-body-sm',
  anim = 'slide-up',
  split = 'line',
  sync = true,
  interval,
  className = '',
  label,
}: TypeTickerProps) {
  const slotRef = useRef<HTMLDivElement>(null)
  const { index, phrase } = useTypeMessageCycle(slotRef, items, { interval })

  if (items.length === 0) return null

  const rootClass = ['theme-type-ticker', className].filter(Boolean).join(' ')

  return (
    <div ref={slotRef} className={rootClass} aria-live="polite" aria-label={label ?? items.join(', ')}>
      <TypeAnimText
        key={`${index}-${phrase}`}
        anim={anim}
        trigger="enter"
        split={split}
        sync={sync}
        className={typeClass}
      >
        {phrase}
      </TypeAnimText>
      <p className="theme-type-ticker__static type-body-sm type-muted mb-0">{items[0]}</p>
    </div>
  )
}
