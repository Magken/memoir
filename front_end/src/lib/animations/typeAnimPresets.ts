/** Shared typography motion presets — CSS in typography-animations.css */

export const TYPE_ANIM_PRESETS = [
  'flip',
  'slide-left',
  'slide-right',
  'slide-up',
  'slide-down',
  'fade',
  'blur-in',
  /** Masked slide up — GSAP SplitText-style reveal */
  'reveal-up',
  /** Masked slide from left */
  'reveal-left',
  /** Scale up from small */
  'scale-in',
  /** Elastic overshoot scale */
  'pop-in',
  /** 3D rotateY entrance */
  'rotate-y',
  /** Drop from above with slight bounce */
  'drop-in',
] as const

export type TypeAnimPreset = (typeof TYPE_ANIM_PRESETS)[number]

export type TypeAnimTrigger = 'hover' | 'enter'

export type TypeAnimSplit = 'chars' | 'words' | 'line'
