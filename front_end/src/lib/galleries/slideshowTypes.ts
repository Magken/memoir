import type { gsap as GsapNS } from 'gsap'

export type SlideshowFxId =
  | 'demo1'
  | 'demo2'
  | 'demo3'
  | 'demo4'
  | 'demo5'
  | 'demo6'
  | 'demo7'
  | 'demo8'
  | 'demo9'
  | 'demo10'
  | 'demo11'
  | 'demo12'
  | 'demo13'
  | 'demo14'
  | 'demo15'
  | 'demo16'

export type SlideshowDecoKind = 'none' | 'single' | 'stack12' | 'dual15' | 'multi16'

export type SlideshowNavigateCtx = {
  el: HTMLElement
  slides: HTMLElement[]
  slidesInner: HTMLElement[]
  deco: HTMLElement | HTMLElement[] | null
  current: number
  slidesTotal: number
  isAnimating: boolean
  tl?: ReturnType<typeof GsapNS.timeline> | null
}

export type SlideshowFxMeta = {
  id: SlideshowFxId
  name: string
  purpose: string
  deco: SlideshowDecoKind
  hostModifiers: string[]
  stack: string
}
