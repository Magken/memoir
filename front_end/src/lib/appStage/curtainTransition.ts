/**
 * Swappable App Stage Curtain Transition recipes.
 * Default pin-stack mirrors ScaleCoverModal exactly:
 * stage scales to 0.9 + radius; cover enters almost together on top (z 140).
 */
import gsap, { easeCarouselWheel } from '../gsap'

export type CurtainTransitionRecipeId = 'pinStackFromRight'

export type CurtainTransitionArgs = {
  fromEl: HTMLElement | null
  toEl: HTMLElement
  /** Optional curtain overlay host (first-boot reveal). */
  curtainEl?: HTMLElement | null
  /** App Stage root — gets pin backdrop styling during the handoff. */
  stageEl?: HTMLElement | null
  reducedMotion?: boolean
  recipe?: CurtainTransitionRecipeId
}

export type CurtainTransitionRecipe = (args: {
  fromEl: HTMLElement | null
  toEl: HTMLElement
  curtainEl?: HTMLElement | null
  stageEl?: HTMLElement | null
  reducedMotion: boolean
}) => Promise<void>

const OUT_CLASS = 'is-outgoing'
const IN_CLASS = 'is-incoming'
const TX_CLASS = 'is-transitioning'
const PARK_CLASS = 'is-parked'
const PIN_ATTR = 'data-app-stage-pinning'

/** Same as ScaleCoverModal / createDefaultGsapPageTiming. */
const EASE = easeCarouselWheel
const DURATION = 1.25
/** Cover starts a hair after stage — identical to ScaleCoverModal `0.05`. */
const COVER_LAG = 0.05
/** ScaleCoverModal `stageScale` default. */
const PIN_SCALE = 0.9
const PIN_RADIUS = '1.25rem'
/** ScaleCoverModal cover `--scale-cover-modal-z`. */
const COVER_Z = 140
/** ScaleCoverModal stage z-index. */
const STAGE_Z = 1

/** Rest pose — never use clearProps('transform') while `is-incoming` CSS may still apply. */
function setLayerRestTransform(el: HTMLElement, options?: { zIndex?: number }) {
  gsap.set(el, {
    x: 0,
    y: 0,
    xPercent: 0,
    yPercent: 0,
    scale: 1,
    rotation: 0,
    borderRadius: 0,
    autoAlpha: 1,
    opacity: 1,
    visibility: 'visible',
    ...(options?.zIndex != null ? { zIndex: options.zIndex } : {}),
  })
}

/**
 * Hide without clearProps / z-index thrash.
 * clearProps('transform') while `.is-incoming` still applies CSS translateX(100%)
 * is what flashed the page after the slide finished.
 */
function muteLayer(el: HTMLElement) {
  el.classList.add(PARK_CLASS)
  gsap.set(el, {
    autoAlpha: 0,
    opacity: 0,
    visibility: 'hidden',
  })
}

function settleHandoffLayers(args: {
  fromEl: HTMLElement | null
  toEl: HTMLElement
  curtainEl?: HTMLElement | null
  pinTarget: HTMLElement | null
  stageEl?: HTMLElement | null
}) {
  const { fromEl, toEl, curtainEl, pinTarget, stageEl } = args

  if (pinTarget) muteLayer(pinTarget)
  if (fromEl && fromEl !== pinTarget) muteLayer(fromEl)
  if (curtainEl && curtainEl !== pinTarget) muteLayer(curtainEl)

  // Keep cover at rest ON TOP — do not clearProps(transform) yet (React may still
  // have is-incoming → CSS translateX(100%) would yank it off-screen for a frame).
  toEl.classList.remove(PARK_CLASS)
  setLayerRestTransform(toEl, { zIndex: COVER_Z })

  if (stageEl) stageEl.removeAttribute(PIN_ATTR)
}

/**
 * Park the next page fully off-stage *before* React adds `is-incoming`.
 */
export function parkCurtainIncomingLayer(toEl: HTMLElement) {
  toEl.classList.remove(PARK_CLASS)
  gsap.set(toEl, {
    xPercent: 100,
    yPercent: 0,
    x: 0,
    y: 0,
    scale: 1,
    autoAlpha: 1,
    opacity: 1,
    visibility: 'visible',
    zIndex: COVER_Z,
    force3D: true,
  })
}

/**
 * After React dropped `is-incoming` / applied `is-active` — safe to normalize.
 * Still avoid clearProps(transform): leave explicit identity so nothing snaps.
 */
export function settleCurtainIncomingLayer(toEl: HTMLElement) {
  toEl.classList.remove(IN_CLASS, TX_CLASS, OUT_CLASS, PARK_CLASS)
  setLayerRestTransform(toEl, { zIndex: 1 })
}

/** Keep a parked page muted after React drops handoff classes. */
export function settleCurtainParkedLayer(el: HTMLElement) {
  el.classList.add(PARK_CLASS)
  el.classList.remove(OUT_CLASS, IN_CLASS, TX_CLASS)
  gsap.set(el, {
    autoAlpha: 0,
    opacity: 0,
    visibility: 'hidden',
    x: 0,
    y: 0,
    xPercent: 0,
    yPercent: 0,
    scale: 1,
    rotation: 0,
    borderRadius: 0,
  })
}

/**
 * Default 2A — ScaleCoverModal motion language, cover from the right:
 * stage + cover share one page duration; cover sits at z 140 over the pinned stage.
 */
export const pinStackFromRight: CurtainTransitionRecipe = ({
  fromEl,
  toEl,
  curtainEl,
  stageEl,
  reducedMotion,
}) =>
  new Promise((resolve) => {
    const pinTarget = fromEl ?? curtainEl ?? null

    const finish = () => {
      settleHandoffLayers({ fromEl, toEl, curtainEl, pinTarget, stageEl })
      resolve()
    }

    if (reducedMotion) {
      finish()
      return
    }

    if (stageEl) stageEl.setAttribute(PIN_ATTR, 'true')

    toEl.classList.add(IN_CLASS, TX_CLASS)
    toEl.classList.remove(PARK_CLASS)
    if (fromEl) {
      fromEl.classList.add(OUT_CLASS, TX_CLASS)
      fromEl.classList.remove(PARK_CLASS)
    }
    if (curtainEl) {
      curtainEl.classList.add(TX_CLASS)
      curtainEl.classList.remove(PARK_CLASS)
    }

    gsap.set(toEl, {
      xPercent: 100,
      autoAlpha: 1,
      opacity: 1,
      visibility: 'visible',
      zIndex: COVER_Z,
      force3D: true,
    })

    if (pinTarget) {
      gsap.set(pinTarget, {
        transformOrigin: '50% 50%',
        scale: 1,
        borderRadius: 0,
        autoAlpha: 1,
        opacity: 1,
        visibility: 'visible',
        force3D: true,
        zIndex: STAGE_Z,
      })
    }

    const tl = gsap.timeline({
      defaults: { duration: DURATION, ease: EASE },
      onComplete: finish,
    })

    if (pinTarget) {
      tl.fromTo(
        pinTarget,
        { scale: 1, borderRadius: 0 },
        {
          scale: PIN_SCALE,
          borderRadius: PIN_RADIUS,
          transformOrigin: '50% 50%',
        },
        0,
      )
    }

    tl.fromTo(toEl, { xPercent: 100 }, { xPercent: 0 }, COVER_LAG)

    if (pinTarget) {
      tl.set(
        pinTarget,
        { autoAlpha: 0, opacity: 0, visibility: 'hidden' },
        COVER_LAG + DURATION,
      )
      tl.call(() => pinTarget.classList.add(PARK_CLASS), undefined, COVER_LAG + DURATION)
    }

    if (curtainEl && fromEl) {
      tl.to(curtainEl, { autoAlpha: 0, duration: 0.25 }, 0)
    }
  })

export const curtainRecipes: Record<CurtainTransitionRecipeId, CurtainTransitionRecipe> = {
  pinStackFromRight,
}

export const DEFAULT_CURTAIN_RECIPE: CurtainTransitionRecipeId = 'pinStackFromRight'

export function runCurtainTransition(args: CurtainTransitionArgs): Promise<void> {
  const recipeId = args.recipe ?? DEFAULT_CURTAIN_RECIPE
  const recipe = curtainRecipes[recipeId] ?? curtainRecipes[DEFAULT_CURTAIN_RECIPE]
  return recipe({
    fromEl: args.fromEl,
    toEl: args.toEl,
    curtainEl: args.curtainEl,
    stageEl: args.stageEl,
    reducedMotion: args.reducedMotion ?? false,
  })
}
