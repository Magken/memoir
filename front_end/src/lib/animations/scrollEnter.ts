/**
 * Codrops Enter (blenkcode/codrops-demo) as ThemeScroll-aware GSAP scroll in/out.
 * Chars start yPercent 100 + rotateX 60, ease expo.out. Leave reverses.
 */
import type { gsap as GsapType } from 'gsap'
import type { ScrollTrigger as STType } from 'gsap/ScrollTrigger'

type Gsap = typeof GsapType
type ScrollTrigger = typeof STType

export type ScrollEnterMode = 'scrub' | 'enter'

/** Start pose from wrap_chars in the Codrops demo. */
export const SCROLL_ENTER_FROM = {
  yPercent: 100,
  rotateX: 60,
  force3D: true,
} as const

/** Hairline wipe: enter from the right; reverse exits toward the right. */
export const SCROLL_HAIRLINE_FROM = {
  scaleX: 0,
  transformOrigin: '100% 50%',
  force3D: true,
} as const

export type ApplyScrollEnterOptions = {
  root: HTMLElement
  gsap: Gsap
  ScrollTrigger: ScrollTrigger
  scroller?: HTMLElement | string | null
  mode?: ScrollEnterMode
  scrub?: boolean | number
  start?: string
  end?: string
  trigger?: HTMLElement | string
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function applyScrollEnter(options: ApplyScrollEnterOptions): gsap.core.Tween[] {
  const { root, gsap } = options
  const chars = root.querySelectorAll('.theme-scroll-enter__char')
  const tweens: gsap.core.Tween[] = []
  if (!chars.length) return tweens

  if (prefersReducedMotion()) {
    gsap.set(chars, { yPercent: 0, rotateX: 0, clearProps: 'transform' })
    return tweens
  }

  gsap.set(chars, { ...SCROLL_ENTER_FROM })

  const mode = options.mode ?? 'enter'
  const trigger = options.trigger ?? options.root
  const scroller = options.scroller ?? undefined
  const scrollTrigger =
    mode === 'enter'
      ? {
          trigger,
          scroller,
          start: options.start ?? 'top 88%',
          toggleActions: 'play none none reverse' as const,
          invalidateOnRefresh: true,
        }
      : {
          trigger,
          scroller,
          start: options.start ?? 'top 90%',
          end: options.end ?? 'bottom 20%',
          scrub: options.scrub ?? 0.6,
          invalidateOnRefresh: true,
        }

  tweens.push(
    gsap.fromTo(
      chars,
      { ...SCROLL_ENTER_FROM },
      {
        yPercent: 0,
        rotateX: 0,
        duration: mode === 'enter' ? 1.2 : 1,
        stagger: 0.035,
        ease: 'expo.out',
        force3D: true,
        overwrite: 'auto',
        scrollTrigger,
      },
    ),
  )
  return tweens
}

export function applyScrollHairline(options: ApplyScrollEnterOptions): gsap.core.Tween[] {
  const { root, gsap } = options
  const lines = root.querySelectorAll<HTMLElement>('.theme-hairline-fx__wipe')
  const tweens: gsap.core.Tween[] = []
  if (!lines.length) return tweens

  if (prefersReducedMotion()) {
    gsap.set(lines, { scaleX: 1, transformOrigin: '100% 50%', clearProps: 'transform' })
    return tweens
  }

  const mode = options.mode ?? 'enter'
  const scroller = options.scroller ?? undefined

  lines.forEach((line) => {
    const trigger = options.trigger ?? line.closest('.theme-hairline-fx') ?? line
    gsap.set(line, { ...SCROLL_HAIRLINE_FROM })
    const scrollTrigger =
      mode === 'enter'
        ? {
            trigger,
            scroller,
            start: options.start ?? 'top 88%',
            toggleActions: 'play none none reverse' as const,
            invalidateOnRefresh: true,
          }
        : {
            trigger,
            scroller,
            start: options.start ?? 'top 90%',
            end: options.end ?? 'bottom 20%',
            scrub: options.scrub ?? 0.6,
            invalidateOnRefresh: true,
          }
    tweens.push(
      gsap.fromTo(
        line,
        { ...SCROLL_HAIRLINE_FROM },
        {
          scaleX: 1,
          transformOrigin: '100% 50%',
          duration: mode === 'enter' ? 1.2 : 1,
          ease: 'expo.out',
          force3D: true,
          overwrite: 'auto',
          scrollTrigger,
        },
      ),
    )
  })
  return tweens
}

function tweenDone(tween: gsap.core.Tween | null): Promise<void> {
  if (!tween) return Promise.resolve()
  return new Promise((resolve) => {
    tween.eventCallback('onComplete', resolve)
  })
}

/** Fraction of a play at which the next LCL step may start (overlap, not speed-up). */
export const LCL_CHAIN_AT = 0.2

export type LclPlayUntil = number | 'complete'

/** Resolve once a tween reaches `at` progress (or completes). Lets the next step overlap. */
export function tweenChainReady(
  tween: gsap.core.Tween | null,
  until: LclPlayUntil = LCL_CHAIN_AT,
): Promise<void> {
  if (!tween) return Promise.resolve()
  if (until === 'complete') return tweenDone(tween)
  const at = until
  return new Promise((resolve) => {
    let released = false
    const release = () => {
      if (released) return
      released = true
      resolve()
    }
    const onUpdate = () => {
      if (tween.progress() >= at) release()
    }
    tween.eventCallback('onUpdate', onUpdate)
    tween.eventCallback('onComplete', release)
    onUpdate()
  })
}

async function awaitPlays(tweens: Array<gsap.core.Tween | null>, until: LclPlayUntil) {
  await Promise.all(tweens.map((tween) => tweenChainReady(tween, until)))
}

function playCrumbChromeIn(root: HTMLElement, gsap: Gsap, duration: number): gsap.core.Tween | null {
  const parts = root.querySelectorAll<HTMLElement>(
    '.theme-lcl-breadcrumb__arrow, .theme-lcl-breadcrumb__sep',
  )
  if (!parts.length) return null
  gsap.killTweensOf(parts)
  if (prefersReducedMotion()) {
    gsap.set(parts, { yPercent: 0, opacity: 1, clearProps: 'transform,opacity' })
    return null
  }
  gsap.set(parts, { yPercent: 100, opacity: 0, force3D: true })
  return gsap.to(parts, {
    yPercent: 0,
    opacity: 1,
    duration,
    stagger: 0.04,
    ease: 'expo.out',
    force3D: true,
    overwrite: 'auto',
  })
}

function playCrumbChromeOut(root: HTMLElement, gsap: Gsap, duration: number): gsap.core.Tween | null {
  const parts = root.querySelectorAll<HTMLElement>(
    '.theme-lcl-breadcrumb__arrow, .theme-lcl-breadcrumb__sep',
  )
  if (!parts.length) return null
  gsap.killTweensOf(parts)
  if (prefersReducedMotion()) {
    gsap.set(parts, { yPercent: 100, opacity: 0 })
    return null
  }
  return gsap.to(parts, {
    yPercent: 100,
    opacity: 0,
    duration,
    stagger: 0.02,
    ease: 'expo.in',
    overwrite: 'auto',
  })
}

export function playScrollCharsOut(root: HTMLElement, gsap: Gsap, duration = 0.7): gsap.core.Tween | null {
  const chars = root.querySelectorAll('.theme-scroll-enter__char')
  if (!chars.length) return null
  gsap.killTweensOf(chars)
  if (prefersReducedMotion()) {
    gsap.set(chars, { ...SCROLL_ENTER_FROM })
    return null
  }
  return gsap.to(chars, {
    ...SCROLL_ENTER_FROM,
    duration,
    stagger: 0.02,
    ease: 'expo.in',
    overwrite: 'auto',
  })
}

export function playScrollCharsIn(root: HTMLElement, gsap: Gsap, duration = 1.2): gsap.core.Tween | null {
  const chars = root.querySelectorAll('.theme-scroll-enter__char')
  if (!chars.length) return null
  gsap.killTweensOf(chars)
  if (prefersReducedMotion()) {
    gsap.set(chars, { yPercent: 0, rotateX: 0, clearProps: 'transform' })
    return null
  }
  gsap.set(chars, { ...SCROLL_ENTER_FROM })
  return gsap.to(chars, {
    yPercent: 0,
    rotateX: 0,
    duration,
    stagger: 0.035,
    ease: 'expo.out',
    force3D: true,
    overwrite: 'auto',
  })
}

/**
 * Sideways / tall-strip enter. Horizontal Codrops `yPercent` + `rotateX` fights
 * `writing-mode: sideways-lr` — slide along the flipped line with a matching `rotateY` tilt.
 */
export const SIDEWAYS_ENTER_FROM = {
  xPercent: 110,
  rotateY: 60,
  force3D: true,
} as const

export function playSidewaysCharsOut(root: HTMLElement, gsap: Gsap, duration = 0.7): gsap.core.Tween | null {
  const chars = root.querySelectorAll('.theme-scroll-enter__char')
  if (!chars.length) return null
  gsap.killTweensOf(chars)
  if (prefersReducedMotion()) {
    gsap.set(chars, { ...SIDEWAYS_ENTER_FROM })
    return null
  }
  return gsap.to(chars, {
    ...SIDEWAYS_ENTER_FROM,
    duration,
    stagger: 0.02,
    ease: 'expo.in',
    overwrite: 'auto',
  })
}

export function playSidewaysCharsIn(root: HTMLElement, gsap: Gsap, duration = 1.2): gsap.core.Tween | null {
  const chars = root.querySelectorAll('.theme-scroll-enter__char')
  if (!chars.length) return null
  gsap.killTweensOf(chars)
  if (prefersReducedMotion()) {
    gsap.set(chars, { xPercent: 0, rotateY: 0, clearProps: 'transform' })
    return null
  }
  gsap.set(chars, { ...SIDEWAYS_ENTER_FROM })
  return gsap.to(chars, {
    xPercent: 0,
    rotateY: 0,
    duration,
    stagger: 0.04,
    ease: 'expo.out',
    force3D: true,
    overwrite: 'auto',
  })
}

/**
 * Right-strip enter. `writing-mode: sideways-rl` faces the note on its left.
 * The yaw is the opposite of the left strip (`rotateY` -60), along that line.
 */
export const SIDEWAYS_RL_ENTER_FROM = {
  xPercent: -110,
  rotateY: -60,
  force3D: true,
} as const

export function playSidewaysRlCharsOut(root: HTMLElement, gsap: Gsap, duration = 0.7): gsap.core.Tween | null {
  const chars = root.querySelectorAll('.theme-scroll-enter__char')
  if (!chars.length) return null
  gsap.killTweensOf(chars)
  if (prefersReducedMotion()) {
    gsap.set(chars, { ...SIDEWAYS_RL_ENTER_FROM })
    return null
  }
  return gsap.to(chars, {
    ...SIDEWAYS_RL_ENTER_FROM,
    duration,
    stagger: 0.02,
    ease: 'expo.in',
    overwrite: 'auto',
  })
}

export function playSidewaysRlCharsIn(root: HTMLElement, gsap: Gsap, duration = 1.2): gsap.core.Tween | null {
  const chars = root.querySelectorAll('.theme-scroll-enter__char')
  if (!chars.length) return null
  gsap.killTweensOf(chars)
  if (prefersReducedMotion()) {
    gsap.set(chars, { xPercent: 0, rotateY: 0, clearProps: 'transform' })
    return null
  }
  gsap.set(chars, { ...SIDEWAYS_RL_ENTER_FROM })
  return gsap.to(chars, {
    xPercent: 0,
    rotateY: 0,
    duration,
    stagger: 0.04,
    ease: 'expo.out',
    force3D: true,
    overwrite: 'auto',
  })
}

export function playScrollHairlineOut(root: HTMLElement, gsap: Gsap, duration = 0.7): gsap.core.Tween | null {
  const lines = root.querySelectorAll<HTMLElement>('.theme-hairline-fx__wipe')
  if (!lines.length) return null
  gsap.killTweensOf(lines)
  if (prefersReducedMotion()) {
    gsap.set(lines, { ...SCROLL_HAIRLINE_FROM })
    return null
  }
  return gsap.to(lines, {
    scaleX: 0,
    transformOrigin: '100% 50%',
    duration,
    ease: 'expo.in',
    overwrite: 'auto',
  })
}

/** Paragraphs plus the external links that sit under them. Both share the side clip. */
function lclProseMotionTargets(root: HTMLElement): HTMLElement[] {
  const nodes = [
    ...root.querySelectorAll<HTMLElement>('.theme-prose-inline__p'),
    ...root.querySelectorAll<HTMLElement>('.theme-about-home-lcl__ref-link'),
  ]
  return nodes.length > 0 ? nodes : [root]
}

/**
 * LCL prose (preview s3 / About intro). Clip from the right and slide from the
 * left. Never scroll-enter chars on a paragraph. Out wipes left-to-right
 * (clip from the left), not up. External links under the paragraph use the same clip.
 */
export function playLclProseOut(root: HTMLElement, gsap: Gsap, duration = 0.42): LclPlayHandle {
  const targets = lclProseMotionTargets(root)
  gsap.killTweensOf(targets)
  const tw = gsap.to(targets, {
    autoAlpha: 0,
    x: 20,
    clipPath: 'inset(0 0 0 100%)',
    duration,
    ease: 'expo.in',
    overwrite: 'auto',
  })
  return {
    ready: new Promise<void>((resolve) => {
      let settled = false
      const settle = () => {
        if (settled) return
        settled = true
        resolve()
      }
      tw.eventCallback('onUpdate', () => {
        if (tw.progress() >= LCL_CHAIN_AT) settle()
      })
      void tw.then(settle)
    }),
    done: Promise.resolve(tw).then(() => undefined),
  }
}

export function playLclProseIn(root: HTMLElement, gsap: Gsap, duration = 1.2): gsap.core.Tween | null {
  if (prefersReducedMotion()) {
    gsap.set(root, { autoAlpha: 1, x: 0, clipPath: 'none' })
    return null
  }
  const targets = lclProseMotionTargets(root)
  gsap.set(root, { autoAlpha: 1 })
  return gsap.fromTo(
    targets,
    { autoAlpha: 0, x: -20, clipPath: 'inset(0 100% 0 0)' },
    {
      autoAlpha: 1,
      x: 0,
      clipPath: 'inset(0 0% 0 0)',
      duration,
      ease: 'expo.out',
      stagger: 0.16,
      overwrite: 'auto',
    },
  )
}

export function playScrollHairlineIn(root: HTMLElement, gsap: Gsap, duration = 1.2): gsap.core.Tween | null {
  const lines = root.querySelectorAll<HTMLElement>('.theme-hairline-fx__wipe')
  if (!lines.length) return null
  gsap.killTweensOf(lines)
  if (prefersReducedMotion()) {
    gsap.set(lines, { scaleX: 1, transformOrigin: '100% 50%' })
    return null
  }
  gsap.set(lines, { ...SCROLL_HAIRLINE_FROM })
  return gsap.to(lines, {
    scaleX: 1,
    transformOrigin: '100% 50%',
    duration,
    ease: 'expo.out',
    force3D: true,
    overwrite: 'auto',
  })
}

/** Pin a hairline at rest so a sibling title can leave without wiping the rule. */
export function holdScrollHairline(root: HTMLElement, gsap: Gsap) {
  const lines = root.querySelectorAll<HTMLElement>('.theme-hairline-fx__wipe')
  if (!lines.length) return
  gsap.killTweensOf(lines)
  gsap.set(lines, { scaleX: 1, transformOrigin: '100% 50%' })
}

export type LclPlayHandle = {
  /** Fires at `LCL_CHAIN_AT` so the next step can start while this one keeps playing. */
  ready: Promise<void>
  /** Fires when every tween finishes — safe to unmount. */
  done: Promise<void>
}

function makePlayHandle(tweens: Array<gsap.core.Tween | null>): LclPlayHandle {
  return {
    ready: awaitPlays(tweens, LCL_CHAIN_AT),
    done: awaitPlays(tweens, 'complete'),
  }
}

export function startLclListOut(root: HTMLElement, gsap: Gsap): LclPlayHandle {
  return makePlayHandle([playScrollCharsOut(root, gsap), playScrollHairlineOut(root, gsap)])
}

export function startLclTitleOut(root: HTMLElement, gsap: Gsap): LclPlayHandle {
  return makePlayHandle([playScrollCharsOut(root, gsap)])
}

export function startLclTitleIn(root: HTMLElement, gsap: Gsap): LclPlayHandle {
  return makePlayHandle([playScrollCharsIn(root, gsap)])
}

export function startLclCrumbIn(root: HTMLElement, gsap: Gsap): LclPlayHandle {
  return makePlayHandle([playScrollCharsIn(root, gsap, 0.9), playCrumbChromeIn(root, gsap, 0.9)])
}

export function startLclCrumbOut(root: HTMLElement, gsap: Gsap): LclPlayHandle {
  return makePlayHandle([playScrollCharsOut(root, gsap, 0.5), playCrumbChromeOut(root, gsap, 0.5)])
}

export function startLclListIn(root: HTMLElement, gsap: Gsap): LclPlayHandle {
  return makePlayHandle([playScrollCharsIn(root, gsap), playScrollHairlineIn(root, gsap)])
}

export function startLclProseIn(root: HTMLElement, gsap: Gsap): LclPlayHandle {
  return makePlayHandle([playLclProseIn(root, gsap)])
}

/** About Home tall-left display: sideways char slide + hairline wipe. */
export function startAboutHomeLclIn(root: HTMLElement, gsap: Gsap): LclPlayHandle {
  return makePlayHandle([playSidewaysCharsIn(root, gsap), playScrollHairlineIn(root, gsap)])
}

export function startAboutHomeLclOut(root: HTMLElement, gsap: Gsap): LclPlayHandle {
  return makePlayHandle([playSidewaysCharsOut(root, gsap), playScrollHairlineOut(root, gsap)])
}

/** About collaborate right strip: opposite yaw so the title faces the note. */
export function startAboutCollabLclIn(root: HTMLElement, gsap: Gsap): LclPlayHandle {
  return makePlayHandle([playSidewaysRlCharsIn(root, gsap), playScrollHairlineIn(root, gsap)])
}

export function startAboutCollabLclOut(root: HTMLElement, gsap: Gsap): LclPlayHandle {
  return makePlayHandle([playSidewaysRlCharsOut(root, gsap), playScrollHairlineOut(root, gsap)])
}

/** Full play to completion (durations unchanged). Prefer `startLcl*` + `.ready` to overlap steps. */
export async function playLclListOut(root: HTMLElement, gsap: Gsap, until: LclPlayUntil = 'complete') {
  await awaitPlays([playScrollCharsOut(root, gsap), playScrollHairlineOut(root, gsap)], until)
}

export async function playLclTitleOut(root: HTMLElement, gsap: Gsap, until: LclPlayUntil = 'complete') {
  await awaitPlays([playScrollCharsOut(root, gsap)], until)
}

export async function playLclTitleIn(root: HTMLElement, gsap: Gsap, until: LclPlayUntil = 'complete') {
  await awaitPlays([playScrollCharsIn(root, gsap)], until)
}

export async function playLclCrumbIn(root: HTMLElement, gsap: Gsap, until: LclPlayUntil = 'complete') {
  await awaitPlays([playScrollCharsIn(root, gsap, 0.9), playCrumbChromeIn(root, gsap, 0.9)], until)
}

export async function playLclCrumbOut(root: HTMLElement, gsap: Gsap, until: LclPlayUntil = 'complete') {
  await awaitPlays([playScrollCharsOut(root, gsap, 0.5), playCrumbChromeOut(root, gsap, 0.5)], until)
}

export async function playLclListIn(root: HTMLElement, gsap: Gsap, until: LclPlayUntil = 'complete') {
  await awaitPlays([playScrollCharsIn(root, gsap), playScrollHairlineIn(root, gsap)], until)
}

const DECODE_GLYPHS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'

export async function lclImageReady(img: HTMLImageElement, timeoutMs = 1500): Promise<void> {
  if (img.complete && img.naturalWidth > 0) return
  const decode = typeof img.decode === 'function' ? img.decode().catch(() => undefined) : Promise.resolve()
  await Promise.race([
    decode,
    new Promise<void>((resolve) => {
      setTimeout(resolve, timeoutMs)
    }),
  ])
}

function mediaClipTo(dir: number): string {
  return dir < 0 ? 'inset(0 100% 0 0)' : 'inset(0 0 0 100%)'
}

function mediaClipFrom(dir: number): string {
  return dir < 0 ? 'inset(0 0 0 100%)' : 'inset(0 100% 0 0)'
}

export function startLclMediaOut(frame: HTMLElement, gsap: Gsap, dir = 1): LclPlayHandle {
  const img = frame.querySelector<HTMLElement>('.theme-lcl-media__img')
  const hair = playScrollHairlineOut(frame, gsap)
  if (!img) return makePlayHandle([hair])
  gsap.killTweensOf(img)
  if (prefersReducedMotion()) {
    gsap.set(img, { autoAlpha: 0, x: 0, clipPath: 'none' })
    return makePlayHandle([hair])
  }
  const tw = gsap.to(img, {
    autoAlpha: 0,
    x: 20 * dir,
    clipPath: mediaClipTo(dir),
    duration: 0.42,
    ease: 'expo.in',
    overwrite: 'auto',
  })
  return makePlayHandle([tw, hair])
}

export function startLclMediaIn(frame: HTMLElement, gsap: Gsap, dir = 1): LclPlayHandle {
  const img = frame.querySelector<HTMLElement>('.theme-lcl-media__img')
  const hair = playScrollHairlineIn(frame, gsap)
  if (!img) return makePlayHandle([hair])
  gsap.killTweensOf(img)
  if (prefersReducedMotion()) {
    gsap.set(img, { autoAlpha: 1, x: 0, clipPath: 'none' })
    return makePlayHandle([hair])
  }
  gsap.set(img, { autoAlpha: 0, x: -20 * dir, clipPath: mediaClipFrom(dir) })
  const tw = gsap.to(img, {
    autoAlpha: 1,
    x: 0,
    clipPath: 'inset(0 0% 0 0)',
    duration: 1.2,
    ease: 'expo.out',
    overwrite: 'auto',
  })
  return makePlayHandle([tw, hair])
}

export function startLclCountIn(
  el: HTMLElement,
  gsap: Gsap,
  to: number,
  from = 0,
): LclPlayHandle {
  const fmt = new Intl.NumberFormat()
  gsap.killTweensOf(el)
  if (prefersReducedMotion()) {
    el.textContent = fmt.format(to)
    gsap.set(el, { autoAlpha: 1 })
    return { ready: Promise.resolve(), done: Promise.resolve() }
  }
  const proxy = { n: from }
  const tw = gsap.to(proxy, {
    n: to,
    duration: 1.2,
    ease: 'expo.out',
    overwrite: 'auto',
    onUpdate: () => {
      el.textContent = fmt.format(Math.round(proxy.n))
    },
  })
  el.textContent = fmt.format(from)
  const chars = playScrollCharsIn(el, gsap)
  return makePlayHandle([tw, chars])
}

export function startLclDimIn(
  _root: HTMLElement,
  gsap: Gsap,
  targets: HTMLElement[],
): LclPlayHandle {
  if (!targets.length) return { ready: Promise.resolve(), done: Promise.resolve() }
  gsap.killTweensOf(targets)
  if (prefersReducedMotion()) {
    gsap.set(targets, { opacity: 0.38 })
    return { ready: Promise.resolve(), done: Promise.resolve() }
  }
  const tw = gsap.to(targets, {
    opacity: 0.38,
    duration: 0.28,
    ease: 'power2.out',
    overwrite: 'auto',
  })
  return makePlayHandle([tw])
}

export function startLclDimOut(
  _root: HTMLElement,
  gsap: Gsap,
  targets: HTMLElement[],
): LclPlayHandle {
  if (!targets.length) return { ready: Promise.resolve(), done: Promise.resolve() }
  gsap.killTweensOf(targets)
  if (prefersReducedMotion()) {
    gsap.set(targets, { opacity: 1 })
    return { ready: Promise.resolve(), done: Promise.resolve() }
  }
  const tw = gsap.to(targets, {
    opacity: 1,
    duration: 0.28,
    ease: 'power2.out',
    overwrite: 'auto',
  })
  return makePlayHandle([tw])
}

export function startLclDecodeIn(el: HTMLElement, gsap: Gsap, text: string): LclPlayHandle {
  gsap.killTweensOf(el)
  if (prefersReducedMotion()) {
    el.textContent = text
    gsap.set(el, { autoAlpha: 1 })
    return { ready: Promise.resolve(), done: Promise.resolve() }
  }
  const proxy = { i: 0 }
  const tw = gsap.to(proxy, {
    i: text.length,
    duration: 1.2,
    ease: 'expo.out',
    overwrite: 'auto',
    onUpdate: () => {
      const settled = Math.min(text.length, Math.floor(proxy.i))
      let out = text.slice(0, settled)
      for (let n = settled; n < text.length; n += 1) {
        if (text[n] === ' ') {
          out += ' '
          continue
        }
        out += DECODE_GLYPHS[(n + Math.floor(proxy.i * 4)) % DECODE_GLYPHS.length]
      }
      el.textContent = out
    },
    onComplete: () => {
      el.textContent = text
    },
  })
  return makePlayHandle([tw])
}
