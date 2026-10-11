/**
 * Full-viewport LCL canvas — s1 hairline list, s2 Title + LclBreadcrumb, s3 prose.
 * Kindling → Ember keeps the visited crumb trail and opens inline prose links
 * in the top-right tile. Unopened links are not crumbs.
 */
import { forwardRef, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react'
import { gsap, ScrollTrigger, useGSAP } from '../../lib/gsap'
import {
  applyScrollHairline,
  holdScrollHairline,
  startLclCrumbIn,
  startLclCrumbOut,
  startLclListIn,
  startLclListOut,
  startLclTitleIn,
  startLclTitleOut,
  type LclPlayHandle,
} from '../../lib/animations/scrollEnter'
import {
  PROSE_INLINE_CLASS,
  PROSE_INLINE_P_CLASS,
  proseInlineLinkClass,
} from '../../lib/animations/proseInlineLinks'
import { LclBreadcrumb } from '../LclBreadcrumb'
import { GrasUnderlineButton } from '../GrasUnderlineButton'
import { ScrollEnterText } from '../ScrollEnterText'
import { TypeAnimText } from '../TypeAnimText'
import {
  LCL_PREVIEW_FIXTURE,
  gridPlacementFromCells,
} from '../../lib/lcl/viewportSections'
import type { LclPreviewHandle } from '../../lib/lcl/lclChoreo'

const INDEX_TITLES = ['Kindling', 'Ashfall', 'Rook', 'Harbor']
const KINDLING_NEST = ['Ember', 'Spark', 'Wick', 'Cinder']
const NEST_BY_PARENT: Record<string, string[]> = {
  Kindling: KINDLING_NEST,
}
/** First-branch depth ≥ 2 uses inline prose links instead of the hairline list. */
const TEXT_STEPS_BY_PARENT: Record<string, string[]> = {
  Ember: ['Flare', 'Coal'],
}
const DISPLAY_TITLE = 'Title'

function startProseStepsOut(root: HTMLElement): LclPlayHandle {
  const tw = gsap.to(root, {
    autoAlpha: 0,
    y: -10,
    duration: 0.42,
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
        if (tw.progress() >= 0.2) settle()
      })
      void tw.then(settle)
    }),
    done: Promise.resolve(tw).then(() => undefined),
  }
}

function titlesForPath(path: string[]): string[] {
  if (path.length === 0) return INDEX_TITLES
  const parent = path[path.length - 1]
  if (TEXT_STEPS_BY_PARENT[parent]) return []
  return NEST_BY_PARENT[parent] ?? []
}

/** Kindling → Ember (and deeper on that branch): text steps own forward nav. */
function usesTextSteps(path: string[]): boolean {
  return path.length >= 2 && path[0] === 'Kindling'
}

function textStepsForPath(path: string[]): string[] {
  if (!usesTextSteps(path)) return []
  const parent = path[path.length - 1]
  return TEXT_STEPS_BY_PARENT[parent] ?? []
}

export const LclViewportPreview = forwardRef<LclPreviewHandle>(function LclViewportPreview(_, ref) {
  const hostRef = useRef<HTMLElement | null>(null)
  const scrollerRef = useRef<HTMLElement | null>(null)
  const nestRef = useRef<HTMLUListElement | null>(null)
  const stepsRef = useRef<HTMLDivElement | null>(null)
  const titleHostRef = useRef<HTMLDivElement | null>(null)
  const headRef = useRef<HTMLDivElement | null>(null)
  const crumbHostRef = useRef<HTMLElement | null>(null)
  const busyRef = useRef(false)
  const scriptedRef = useRef(false)
  const pendingIn = useRef<'title' | 'crumb' | 'list' | 'steps' | null>(null)

  const [path, setPath] = useState<string[]>([])
  const [showList, setShowList] = useState(true)
  const [showCrumb, setShowCrumb] = useState(false)
  const [showSteps, setShowSteps] = useState(false)

  const displayCopy = path[path.length - 1] ?? DISPLAY_TITLE
  const listTitles = titlesForPath(path)
  const stepTitles = textStepsForPath(path)
  const textStepMode = usesTextSteps(path)
  const typeBind = scriptedRef.current ? 'none' : 'scroll'
  const atRoot = path.length === 0

  useGSAP(
    () => {
      const root = hostRef.current
      if (!root) return

      let cancelled = false
      let attempts = 0
      let frameId = 0
      const tweens: gsap.core.Tween[] = []

      const attachHairlines = () => {
        if (cancelled) return
        const scroller = scrollerRef.current
        if (!scroller) {
          attempts += 1
          if (attempts < 16) frameId = requestAnimationFrame(attachHairlines)
          return
        }
        tweens.push(
          ...applyScrollHairline({
            root,
            gsap,
            ScrollTrigger,
            scroller,
          }),
        )
      }

      frameId = requestAnimationFrame(attachHairlines)
      return () => {
        cancelled = true
        cancelAnimationFrame(frameId)
        tweens.forEach((tween) => tween.scrollTrigger?.kill())
        tweens.forEach((tween) => tween.kill())
      }
    },
    { scope: hostRef, revertOnUpdate: true },
  )

  useLayoutEffect(() => {
    if (pendingIn.current !== 'title' || atRoot) return
    const title = titleHostRef.current
    if (!title) return
    pendingIn.current = null
    void startLclTitleIn(title, gsap).ready.then(() => {
      pendingIn.current = 'crumb'
      setShowCrumb(true)
    })
  }, [path, atRoot])

  useLayoutEffect(() => {
    if (pendingIn.current !== 'crumb' || !showCrumb) return
    const crumb = crumbHostRef.current
    if (!crumb) return
    pendingIn.current = null
    void startLclCrumbIn(crumb, gsap).ready.then(() => {
      if (listTitles.length > 0) {
        pendingIn.current = 'list'
        setShowList(true)
        return
      }
      if (textStepsForPath(path).length > 0) {
        pendingIn.current = 'steps'
        setShowSteps(true)
        return
      }
      busyRef.current = false
    })
  }, [showCrumb, listTitles.length, path])

  useLayoutEffect(() => {
    if (pendingIn.current !== 'steps' || !showSteps) return
    const steps = stepsRef.current
    if (!steps) {
      busyRef.current = false
      pendingIn.current = null
      return
    }
    pendingIn.current = null
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.set(steps, { autoAlpha: 1, x: 0, clipPath: 'none' })
      busyRef.current = false
      return
    }
    const paras = steps.querySelectorAll<HTMLElement>('.theme-prose-inline__p')
    const targets = paras.length > 0 ? paras : [steps]
    gsap.set(steps, { autoAlpha: 1 })
    const tween = gsap.fromTo(
      targets,
      { autoAlpha: 0, x: -20, clipPath: 'inset(0 100% 0 0)' },
      {
        autoAlpha: 1,
        x: 0,
        clipPath: 'inset(0 0% 0 0)',
        duration: 1.2,
        ease: 'expo.out',
        stagger: 0.16,
        overwrite: 'auto',
        onComplete: () => {
          busyRef.current = false
        },
      },
    )
    return () => {
      tween.kill()
    }
  }, [showSteps, path])

  useLayoutEffect(() => {
    if (pendingIn.current !== 'list' || !showList) return
    const title = titleHostRef.current
    const list = nestRef.current
    const needsTitle = atRoot
    pendingIn.current = null
    void (async () => {
      let titleIn: LclPlayHandle | null = null
      if (needsTitle && title) {
        titleIn = startLclTitleIn(title, gsap)
        await titleIn.ready
      }
      if (list) {
        const listIn = startLclListIn(list, gsap)
        await listIn.done
      } else if (titleIn) {
        await titleIn.done
      }
      busyRef.current = false
    })()
  }, [showList, atRoot, path])

  async function openItem(name: string) {
    if (busyRef.current) return
    const list = nestRef.current
    const steps = stepsRef.current
    const title = titleHostRef.current
    const head = headRef.current
    if (!title) return
    if (!list && !steps && !atRoot && !textStepMode) return
    busyRef.current = true
    scriptedRef.current = true
    if (head) holdScrollHairline(head, gsap)

    let listOut: LclPlayHandle | null = null
    if (list && showList) {
      listOut = startLclListOut(list, gsap)
      await listOut.ready
    }

    let stepsOut: LclPlayHandle | null = null
    if (steps && showSteps) {
      stepsOut = startProseStepsOut(steps)
      await stepsOut.ready
    }

    let crumbOut: LclPlayHandle | null = null
    if (showCrumb) {
      const crumb = crumbHostRef.current
      if (crumb) {
        crumbOut = startLclCrumbOut(crumb, gsap)
        await crumbOut.ready
      }
    }

    const titleOut = startLclTitleOut(title, gsap)
    await titleOut.ready

    await Promise.all([
      listOut?.done ?? Promise.resolve(),
      stepsOut?.done ?? Promise.resolve(),
      crumbOut?.done ?? Promise.resolve(),
      titleOut.done,
    ])
    setShowCrumb(false)
    setShowList(false)
    setShowSteps(false)
    pendingIn.current = 'title'
    setPath((prev) => [...prev, name])
  }

  async function goToDepth(depth: number) {
    if (busyRef.current || atRoot || depth >= path.length) return
    const crumb = crumbHostRef.current
    const title = titleHostRef.current
    const head = headRef.current
    const list = nestRef.current
    const steps = stepsRef.current
    busyRef.current = true
    if (head) holdScrollHairline(head, gsap)

    let listOut: LclPlayHandle | null = null
    if (list && showList) {
      listOut = startLclListOut(list, gsap)
      await listOut.ready
    }

    let stepsOut: LclPlayHandle | null = null
    if (steps && showSteps) {
      stepsOut = startProseStepsOut(steps)
      await stepsOut.ready
    }

    let crumbOut: LclPlayHandle | null = null
    if (crumb && showCrumb) {
      crumbOut = startLclCrumbOut(crumb, gsap)
      await crumbOut.ready
    }

    let titleOut: LclPlayHandle | null = null
    if (title) {
      titleOut = startLclTitleOut(title, gsap)
      await titleOut.ready
    }

    await Promise.all([
      listOut?.done ?? Promise.resolve(),
      stepsOut?.done ?? Promise.resolve(),
      crumbOut?.done ?? Promise.resolve(),
      titleOut?.done ?? Promise.resolve(),
    ])

    setShowCrumb(false)
    setShowList(false)
    setShowSteps(false)
    const next = path.slice(0, depth)
    setPath(next)
    if (next.length === 0) {
      pendingIn.current = 'list'
      setShowList(true)
      return
    }
    pendingIn.current = 'title'
  }

  useImperativeHandle(ref, () => ({
    leave: async () => {
      if (busyRef.current) return
      busyRef.current = true
      const list = nestRef.current
      const steps = stepsRef.current
      const crumb = crumbHostRef.current
      const title = titleHostRef.current
      const plays: Promise<void>[] = []
      if (list) plays.push(startLclListOut(list, gsap).done)
      if (steps) plays.push(startProseStepsOut(steps).done)
      if (crumb) plays.push(startLclCrumbOut(crumb, gsap).done)
      if (title) plays.push(startLclTitleOut(title, gsap).done)
      await Promise.all(plays)
      busyRef.current = false
    },
  }))

  return (
    <section
      ref={(node) => {
        hostRef.current = node
        scrollerRef.current = node?.closest('.theme-webgl-toolkit') ?? null
      }}
      className="theme-lcl-preview"
      aria-label="LCL full viewport"
    >
      <div className="theme-lcl-layout">
        {LCL_PREVIEW_FIXTURE.sections.map((section, index) => {
          const place = gridPlacementFromCells(section.cells)
          if (!place) return null
          return (
            <div
              key={section.id}
              className="theme-lcl-layout__tile"
              data-id={section.id}
              data-tone={String(index % 8)}
              data-cs={String(place.columnStart)}
              data-ce={String(place.columnEnd)}
              data-rs={String(place.rowStart)}
              data-re={String(place.rowEnd)}
              aria-label={section.label}
            >
              {section.id === 's1' && showList && listTitles.length > 0 ? (
                <ul ref={nestRef} className="theme-lcl-layout__nest" key={path.join('/') || 'root'}>
                  {listTitles.map((title) => (
                    <li key={title}>
                      <GrasUnderlineButton layout="nest" onClick={() => void openItem(title)}>
                        <ScrollEnterText split="line" bind={typeBind} scrollerRef={scrollerRef}>
                          <TypeAnimText anim="slide-left" trigger="hover" className="type-h3 mb-0">
                            {title}
                          </TypeAnimText>
                        </ScrollEnterText>
                      </GrasUnderlineButton>
                    </li>
                  ))}
                </ul>
              ) : section.id === 's2' ? (
                <div className="theme-hairline-fx">
                  <div ref={headRef} className="theme-lcl-preview__display-head">
                    <div ref={titleHostRef}>
                      <ScrollEnterText
                        key={displayCopy}
                        className="type-display-lg mb-0"
                        bind={typeBind}
                        scrollerRef={scrollerRef}
                      >
                        {displayCopy}
                      </ScrollEnterText>
                    </div>
                    <span className="theme-hairline-fx__wipe" aria-hidden>
                      <span className="theme-hairline-fx__rule" />
                    </span>
                  </div>
                  {showCrumb ? (
                    <LclBreadcrumb
                      ref={crumbHostRef}
                      key={path.join('|')}
                      path={path}
                      rootLabel={DISPLAY_TITLE}
                      onSelect={(depth) => void goToDepth(depth)}
                    />
                  ) : null}
                </div>
              ) : section.id === 's3' && showSteps && stepTitles.length > 0 ? (
                <div
                  ref={stepsRef}
                  className={`theme-lcl-preview__text-steps ${PROSE_INLINE_CLASS}`}
                  aria-label="Text steps"
                  key={path.join('/') + '|steps'}
                >
                  <p className={`${PROSE_INLINE_P_CLASS} type-body-sm`}>
                    Along the ridge the ash keeps a quiet heat, waiting for a single{' '}
                    <button
                      type="button"
                      className={proseInlineLinkClass('lg')}
                      onClick={() => void openItem('Flare')}
                    >
                      Flare
                    </button>{' '}
                    to lift the night — not a shout, just a bright seam that names the next layer
                    while the sentence keeps its pace around it.
                  </p>
                  <p className={`${PROSE_INLINE_P_CLASS} type-body-sm`}>
                    Later the path cools again; a smaller{' '}
                    <button
                      type="button"
                      className={proseInlineLinkClass('sm')}
                      onClick={() => void openItem('Coal')}
                    >
                      Coal
                    </button>{' '}
                    sits mid-line, then a steadier{' '}
                    <button
                      type="button"
                      className={proseInlineLinkClass('md')}
                      onClick={() => void openItem('Flare')}
                    >
                      Flare
                    </button>{' '}
                    closes the turn so you can try size, mid-paragraph grow, and dimmed neighbors
                    without leaving the prose.
                  </p>
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </section>
  )
})
