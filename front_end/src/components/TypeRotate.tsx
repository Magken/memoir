import { useRef } from 'react'
import type { TypeAnimPreset, TypeAnimSplit } from '../lib/animations/typeAnimPresets'
import { useTypeMessageCycle } from '../hooks/useTypeMessageCycle'
import { TypeAnimText } from './TypeAnimText'

export type TypeRotateProps = {
  items: readonly string[]
  typeClass?: string
  anim?: TypeAnimPreset
  split?: TypeAnimSplit
  sync?: boolean
  interval?: number
  className?: string
  label?: string
}

/** Rotating display headline — TypeAnimText enter on each phrase. */
export function TypeRotate({
  items,
  typeClass = 'type-display-md type-light',
  anim = 'slide-up',
  split = 'line',
  sync = true,
  interval,
  className = '',
  label,
}: TypeRotateProps) {
  const slotRef = useRef<HTMLDivElement>(null)
  const { index, phrase } = useTypeMessageCycle(slotRef, items, { interval })

  if (items.length === 0) return null

  const rootClass = ['theme-type-rotate', className].filter(Boolean).join(' ')

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
      <p className={['theme-type-rotate__static', typeClass, 'mb-0'].join(' ')}>
        {items[items.length - 1]}
      </p>
    </div>
  )
}
