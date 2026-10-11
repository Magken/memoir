import type { ReactNode } from 'react'
import type { TypeAnimPreset, TypeAnimSplit, TypeAnimTrigger } from '../lib/animations/typeAnimPresets'

export type { TypeAnimPreset, TypeAnimSplit, TypeAnimTrigger } from '../lib/animations/typeAnimPresets'
export { TYPE_ANIM_PRESETS } from '../lib/animations/typeAnimPresets'

const presetClass: Record<TypeAnimPreset, string> = {
  flip: 'type-anim--flip',
  'slide-left': 'type-anim--slide-left',
  'slide-right': 'type-anim--slide-right',
  'slide-up': 'type-anim--slide-up',
  'slide-down': 'type-anim--slide-down',
  fade: 'type-anim--fade',
  'blur-in': 'type-anim--blur-in',
  'reveal-up': 'type-anim--reveal-up',
  'reveal-left': 'type-anim--reveal-left',
  'scale-in': 'type-anim--scale-in',
  'pop-in': 'type-anim--pop-in',
  'rotate-y': 'type-anim--rotate-y',
  'drop-in': 'type-anim--drop-in',
}

type TypeAnimTextProps = {
  /** Plain text to animate (char/word split). */
  children: string
  anim: TypeAnimPreset
  /** `hover` — rest → animate on hover; `enter` — play once on mount. */
  trigger?: TypeAnimTrigger
  /** `chars` / `words` for stagger; `line` for whole-line motion. */
  split?: TypeAnimSplit
  /** Inside `.theme-btn--action` — neutral rest, parent hover drives motion. */
  inButton?: boolean
  /** When false, all units animate together (no per-char stagger). */
  sync?: boolean
  as?: 'span' | 'p' | 'div' | 'h1' | 'h2' | 'h3' | 'h4' | 'label' | 'strong' | 'em' | 'b'
  className?: string
}

function CharUnit({ char, useFlipFaces }: { char: string; useFlipFaces: boolean }) {
  const display = char === ' ' ? '\u00a0' : char
  if (!useFlipFaces) {
    return (
      <span className="type-anim__unit">
        <span className="type-anim__unit-inner">
          <span className="type-anim__face">{display}</span>
        </span>
      </span>
    )
  }
  return (
    <span className="type-anim__unit">
      <span className="type-anim__unit-inner">
        <span className="type-anim__face type-anim__face--front">{display}</span>
        <span className="type-anim__face type-anim__face--back" aria-hidden>
          {display}
        </span>
      </span>
    </span>
  )
}

export function TypeAnimText({
  children,
  anim,
  trigger = 'hover',
  split = 'chars',
  inButton = false,
  sync = true,
  as: Tag = 'span',
  className = '',
}: TypeAnimTextProps) {
  const triggerClass = trigger === 'enter' ? 'type-anim--enter' : 'type-anim--hover'
  const lineSplit = split === 'line'
  const rootClass = [
    'type-anim',
    presetClass[anim],
    triggerClass,
    lineSplit ? 'type-anim--line' : '',
    inButton ? 'type-anim--in-button' : '',
    sync ? '' : 'type-anim--sync',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  if (lineSplit) {
    return <Tag className={rootClass}>{children}</Tag>
  }

  const useFlipFaces = anim === 'flip' && trigger === 'hover'
  const units: ReactNode[] = []

  if (split === 'words') {
    const parts = children.split(/(\s+)/)
    parts.forEach((part, index) => {
      if (/^\s+$/.test(part)) {
        units.push(
          <span key={`space-${index}`} className="type-anim__space">
            {part}
          </span>,
        )
        return
      }
      part.split('').forEach((char, charIndex) => {
        units.push(
          <CharUnit key={`${index}-${charIndex}`} char={char} useFlipFaces={useFlipFaces} />,
        )
      })
    })
  } else {
    children.split('').forEach((char, index) => {
      units.push(<CharUnit key={`${char}-${index}`} char={char} useFlipFaces={useFlipFaces} />)
    })
  }

  return (
    <Tag className={rootClass} aria-label={children}>
      <span className="type-anim__track" aria-hidden>
        {units}
      </span>
    </Tag>
  )
}
