/**
 * Reel LCL: series list, hero frame, pager, thumb strip, one wheel step.
 */
import { forwardRef, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { gsap, ScrollTrigger, useGSAP } from '../../lib/gsap'
import {
  applyScrollHairline,
  playScrollHairlineIn,
  startLclCrumbIn,
  startLclCrumbOut,
  startLclListIn,
  startLclListOut,
  startLclMediaIn,
  startLclMediaOut,
  startLclTitleIn,
  startLclTitleOut,
} from '../../lib/animations/scrollEnter'
import { LclBreadcrumb } from '../LclBreadcrumb'
import { GrasUnderlineButton } from '../GrasUnderlineButton'
import { LclMediaFrame } from '../LclMediaFrame'
import { ScrollEnterText } from '../ScrollEnterText'
import { TypeAnimText } from '../TypeAnimText'
import { lclSwap, type LclPreviewHandle } from '../../lib/lcl/lclChoreo'
import { LCL_REEL_SERIES } from '../../lib/lcl/lclReelContent'
import { LCL_REEL_FIXTURE } from '../../lib/lcl/viewportSections'
import { LclPreviewHost } from './LclPreviewHost'

export const LclReelPreview = forwardRef<LclPreviewHandle>(function LclReelPreview(_, ref) {
  const hostRef = useRef<HTMLElement | null>(null)
  const scrollerRef = useRef<HTMLElement | null>(null)
  const titleRef = useRef<HTMLElement | null>(null)
  const headRef = useRef<HTMLDivElement | null>(null)
  const crumbRef = useRef<HTMLElement | null>(null)
  const listRef = useRef<HTMLUListElement | null>(null)
  const heroRef = useRef<HTMLElement | null>(null)
  const stripRef = useRef<HTMLDivElement | null>(null)
  const pagerRef = useRef<HTMLElement | null>(null)
  const busyRef = useRef(false)
  const lockRef = useRef(false)

  const [path, setPath] = useState<string[]>([])
  const [posterDone, setPosterDone] = useState(false)

  const series = LCL_REEL_SERIES.find((item) => item.name === path[0]) ?? LCL_REEL_SERIES[0]
  const frameIndex = Math.max(0, series.frames.findIndex((frame) => frame.label === path[1]))
  const frame = series.frames[frameIndex] ?? series.frames[0]
  const dir = useRef(1)

  useGSAP(
    () => {
      const root = hostRef.current
      if (!root) return
      const scroller = scrollerRef.current
      if (!scroller) return
      const tweens = applyScrollHairline({ root, gsap, ScrollTrigger, scroller })
      return () => tweens.forEach((tween) => {
        tween.scrollTrigger?.kill()
        tween.kill()
      })
    },
    { scope: hostRef, revertOnUpdate: true },
  )

  useLayoutEffect(() => {
    if (titleRef.current) void startLclTitleIn(titleRef.current, gsap)
    if (headRef.current) playScrollHairlineIn(headRef.current, gsap)
    if (listRef.current) void startLclListIn(listRef.current, gsap)
    if (heroRef.current) {
      void startLclMediaIn(heroRef.current, gsap).done.then(() => setPosterDone(true))
    }
  }, [])

  useImperativeHandle(ref, () => ({
    leave: async () => {
      if (listRef.current) await startLclListOut(listRef.current, gsap).ready
      if (heroRef.current) await startLclMediaOut(heroRef.current, gsap).done
      if (crumbRef.current) await startLclCrumbOut(crumbRef.current, gsap).done
    },
  }))

  async function openSeries(name: string) {
    if (busyRef.current) return
    busyRef.current = true
    const next = LCL_REEL_SERIES.find((item) => item.name === name)
    await lclSwap(
      {
        leave: [
          { key: 'hero', el: heroRef.current, out: (el) => startLclMediaOut(el, gsap, 1), in: (el) => startLclMediaIn(el, gsap, 1) },
          { key: 'pager', el: pagerRef.current, out: startLclTitleOut, in: startLclTitleIn },
          { key: 'strip', el: stripRef.current, out: startLclListOut, in: startLclListIn },
        ],
        commit: () => {
          setPosterDone(false)
          setPath([name, next?.frames[0]?.label ?? 'Frame 01'])
        },
        enter: () => [
          { key: 'crumb', el: crumbRef.current, out: startLclCrumbOut, in: startLclCrumbIn },
          { key: 'hero', el: heroRef.current, out: (el) => startLclMediaOut(el, gsap, 1), in: (el) => startLclMediaIn(el, gsap, 1) },
          { key: 'pager', el: pagerRef.current, out: startLclTitleOut, in: startLclTitleIn },
          { key: 'strip', el: stripRef.current, out: startLclListOut, in: startLclListIn },
        ],
      },
      gsap,
    )
    setPosterDone(true)
    busyRef.current = false
  }

  async function goFrame(index: number, nextDir: number) {
    if (busyRef.current || lockRef.current) return
    const next = series.frames[index]
    if (!next) return
    busyRef.current = true
    lockRef.current = true
    dir.current = nextDir
    await lclSwap(
      {
        leave: [
          { key: 'crumb', el: crumbRef.current, out: startLclCrumbOut, in: startLclCrumbIn },
          { key: 'hero', el: heroRef.current, out: (el) => startLclMediaOut(el, gsap, nextDir), in: (el) => startLclMediaIn(el, gsap, nextDir) },
          { key: 'pager', el: pagerRef.current, out: startLclTitleOut, in: startLclTitleIn },
        ],
        commit: () => {
          setPosterDone(false)
          setPath([series.name, next.label])
        },
        enter: () => [
          { key: 'crumb', el: crumbRef.current, out: startLclCrumbOut, in: startLclCrumbIn },
          { key: 'hero', el: heroRef.current, out: (el) => startLclMediaOut(el, gsap, nextDir), in: (el) => startLclMediaIn(el, gsap, nextDir) },
          { key: 'pager', el: pagerRef.current, out: startLclTitleOut, in: startLclTitleIn },
        ],
      },
      gsap,
    )
    setPosterDone(true)
    lockRef.current = false
    busyRef.current = false
  }

  async function goToDepth(depth: number) {
    if (busyRef.current || depth >= path.length) return
    busyRef.current = true
    const next = path.slice(0, depth)
    await lclSwap(
      {
        leave: [
          { key: 'crumb', el: crumbRef.current, out: startLclCrumbOut, in: startLclCrumbIn },
          { key: 'hero', el: heroRef.current, out: (el) => startLclMediaOut(el, gsap, -1), in: (el) => startLclMediaIn(el, gsap, -1) },
          { key: 'pager', el: pagerRef.current, out: startLclTitleOut, in: startLclTitleIn },
          { key: 'strip', el: stripRef.current, out: startLclListOut, in: startLclListIn },
        ],
        commit: () => {
          setPosterDone(false)
          setPath(next)
        },
        enter: () =>
          next.length === 0
            ? [{ key: 'list', el: listRef.current, out: startLclListOut, in: startLclListIn }]
            : [
                { key: 'crumb', el: crumbRef.current, out: startLclCrumbOut, in: startLclCrumbIn },
                { key: 'hero', el: heroRef.current, out: (el) => startLclMediaOut(el, gsap, -1), in: (el) => startLclMediaIn(el, gsap, -1) },
                { key: 'pager', el: pagerRef.current, out: startLclTitleOut, in: startLclTitleIn },
                { key: 'strip', el: stripRef.current, out: startLclListOut, in: startLclListIn },
              ],
      },
      gsap,
    )
    setPosterDone(true)
    busyRef.current = false
  }

  const pagerLabel = `${String(frameIndex + 1).padStart(2, '0')} / ${String(series.frames.length).padStart(2, '0')}`
  const showVideo = Boolean(posterDone && frame.kind === 'video' && frame.videoSrc)

  return (
    <LclPreviewHost
      fixture={LCL_REEL_FIXTURE}
      hostRef={(node) => {
        hostRef.current = node
        scrollerRef.current = node?.closest('.theme-webgl-toolkit') ?? null
      }}
      label="LCL Reel"
      layoutId="reel"
    >
      {(id) => {
        if (id === 'head') {
          return (
            <div ref={headRef} className="theme-hairline-fx">
              <div className="theme-lcl-preview__display-head">
                <div ref={(node) => { titleRef.current = node }}>
                  <ScrollEnterText className="type-display-lg mb-0" bind="none">
                    Reel
                  </ScrollEnterText>
                </div>
                <span className="theme-hairline-fx__wipe" aria-hidden>
                  <span className="theme-hairline-fx__rule" />
                </span>
              </div>
              {path.length > 0 ? (
                <LclBreadcrumb
                  ref={crumbRef}
                  key={path.join('|')}
                  path={path}
                  rootLabel="Reel"
                  onSelect={(depth) => void goToDepth(depth)}
                />
              ) : null}
            </div>
          )
        }
        if (id === 'series') {
          return (
            <ul ref={listRef} className="theme-lcl-layout__nest">
              {LCL_REEL_SERIES.map((item) => (
                <li key={item.id}>
                  <GrasUnderlineButton layout="nest" onClick={() => void openSeries(item.name)}>
                    <ScrollEnterText split="line" bind="none">
                      <TypeAnimText anim="slide-left" trigger="hover" className="type-h3 mb-0">
                        {item.name}
                      </TypeAnimText>
                    </ScrollEnterText>
                  </GrasUnderlineButton>
                </li>
              ))}
            </ul>
          )
        }
        if (id === 'hero') {
          return (
            <div
              className="flex h-full min-h-0 flex-col gap-2"
              onWheel={(event) => {
                event.preventDefault()
                if (lockRef.current) return
                if (event.deltaY > 0) void goFrame(frameIndex + 1, 1)
                else void goFrame(frameIndex - 1, -1)
              }}
            >
              <LclMediaFrame
                src={frame.src}
                alt={frame.label}
                caption={frame.caption}
                videoSrc={frame.videoSrc}
                showVideo={showVideo}
                frameRef={(node) => {
                  heroRef.current = node
                }}
              />
              <div className="flex items-center justify-between">
                <button type="button" aria-label="Previous frame" onClick={() => void goFrame(frameIndex - 1, -1)}>
                  <ChevronLeft size={14} />
                </button>
                <span ref={pagerRef} className="type-caption tabular-nums">
                  {pagerLabel}
                </span>
                <button type="button" aria-label="Next frame" onClick={() => void goFrame(frameIndex + 1, 1)}>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )
        }
        if (id === 'strip') {
          return (
            <div ref={stripRef} className="theme-lcl-table__thumbs">
              {series.frames.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  className="theme-lcl-media theme-lcl-media--thumb theme-hairline-fx theme-hairline-fx--eirene"
                  onClick={() => void goFrame(index, index > frameIndex ? 1 : -1)}
                >
                  <span className="theme-lcl-media__shell">
                    <span className="theme-lcl-media__frame">
                      <img className="theme-lcl-media__img" src={item.src} alt={item.label} />
                    </span>
                  </span>
                  <span className="theme-hairline-fx__wipe" aria-hidden>
                    <span className="theme-hairline-fx__pill" />
                  </span>
                </button>
              ))}
            </div>
          )
        }
        return null
      }}
    </LclPreviewHost>
  )
})
