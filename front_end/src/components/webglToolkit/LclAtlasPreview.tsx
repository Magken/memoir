/**
 * Atlas LCL: hover columns that reflow, hover index to stage, term notes, timeline.
 */
import { forwardRef, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react'
import { gsap, ScrollTrigger, useGSAP } from '../../lib/gsap'
import {
  applyScrollHairline,
  playLclProseIn,
  playLclProseOut,
  playScrollHairlineIn,
  startAboutHomeLclIn,
  startAboutHomeLclOut,
  startLclCountIn,
  startLclCrumbIn,
  startLclCrumbOut,
  startLclListIn,
  startLclListOut,
  startLclMediaOut,
  startLclTitleIn,
  startLclTitleOut,
} from '../../lib/animations/scrollEnter'
import { PROSE_INLINE_CLASS, PROSE_INLINE_P_CLASS, proseInlineLinkClass } from '../../lib/animations/proseInlineLinks'
import { LclBreadcrumb } from '../LclBreadcrumb'
import { GrasUnderlineButton } from '../GrasUnderlineButton'
import { LclMediaFrame } from '../LclMediaFrame'
import { ScrollEnterText } from '../ScrollEnterText'
import { TypeAnimText } from '../TypeAnimText'
import { createLclHoverIntent, lclSwap, type LclPreviewHandle } from '../../lib/lcl/lclChoreo'
import { LCL_ATLAS_INDEX, LCL_ATLAS_PANELS, LCL_ATLAS_TERMS, LCL_ATLAS_YEARS } from '../../lib/lcl/lclAtlasContent'
import { LCL_ATLAS_FIXTURE } from '../../lib/lcl/viewportSections'
import { LclPreviewHost } from './LclPreviewHost'

export const LclAtlasPreview = forwardRef<LclPreviewHandle>(function LclAtlasPreview(_, ref) {
  const hostRef = useRef<HTMLElement | null>(null)
  const scrollerRef = useRef<HTMLElement | null>(null)
  const titleRef = useRef<HTMLElement | null>(null)
  const headRef = useRef<HTMLDivElement | null>(null)
  const crumbRef = useRef<HTMLElement | null>(null)
  const colsRef = useRef<HTMLDivElement | null>(null)
  const noteRef = useRef<HTMLElement | null>(null)
  const stageRef = useRef<HTMLElement | null>(null)
  const indexRef = useRef<HTMLUListElement | null>(null)
  const timeRef = useRef<HTMLUListElement | null>(null)
  const countRef = useRef<HTMLParagraphElement | null>(null)
  const busyRef = useRef(false)
  const orderRef = useRef<string[]>([])

  const [path, setPath] = useState<string[]>([])
  const [wide, setWide] = useState<string | null>(null)
  const [note, setNote] = useState('Hover a panel, a term, or a year.')
  const [stage, setStage] = useState(LCL_ATLAS_PANELS[0])
  const [stagePinned, setStagePinned] = useState(false)
  const [yearCount, setYearCount] = useState<number>(LCL_ATLAS_YEARS[0].count)

  const open = path.length > 0
  const openPanel = LCL_ATLAS_PANELS.find((panel) => panel.title === path[0])

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
    if (colsRef.current) void startAboutHomeLclIn(colsRef.current, gsap)
    if (indexRef.current) void startLclListIn(indexRef.current, gsap)
    if (timeRef.current) void startLclListIn(timeRef.current, gsap)
    if (countRef.current) startLclCountIn(countRef.current, gsap, yearCount)
    if (noteRef.current) playLclProseIn(noteRef.current, gsap)
  }, [])

  const panelHover = useRef(
    createLclHoverIntent<string>({
      sticky: true,
      show: async (id) => {
        if (open || !id) return
        orderRef.current.push('leave')
        const cols = colsRef.current
        if (cols) await startAboutHomeLclOut(cols, gsap).done
        orderRef.current.push('structure')
        setWide(id)
        await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)))
        orderRef.current.push('enter')
        if (colsRef.current) await startAboutHomeLclIn(colsRef.current, gsap).done
        const panel = LCL_ATLAS_PANELS.find((item) => item.id === id)
        if (panel) setStage(panel)
      },
    }),
  )

  useLayoutEffect(() => () => panelHover.current.dispose(), [])

  useImperativeHandle(ref, () => ({
    leave: async () => {
      if (colsRef.current) await startAboutHomeLclOut(colsRef.current, gsap).done
      if (indexRef.current) await startLclListOut(indexRef.current, gsap).done
    },
  }))

  async function openPanelAt(title: string) {
    if (busyRef.current) return
    busyRef.current = true
    await lclSwap(
      {
        leave: [{ key: 'cols', el: colsRef.current, out: startAboutHomeLclOut, in: startAboutHomeLclIn }],
        commit: () => setPath([title]),
        enter: () => [
          { key: 'crumb', el: crumbRef.current, out: startLclCrumbOut, in: startLclCrumbIn },
          { key: 'cols', el: colsRef.current, out: startAboutHomeLclOut, in: startLclTitleIn },
        ],
      },
      gsap,
    )
    busyRef.current = false
  }

  async function goToDepth(depth: number) {
    if (busyRef.current || depth >= path.length) return
    busyRef.current = true
    await lclSwap(
      {
        leave: [
          { key: 'crumb', el: crumbRef.current, out: startLclCrumbOut, in: startLclCrumbIn },
          { key: 'cols', el: colsRef.current, out: startLclTitleOut, in: startAboutHomeLclIn },
        ],
        commit: () => setPath([]),
        enter: () => [
          { key: 'cols', el: colsRef.current, out: startAboutHomeLclOut, in: startAboutHomeLclIn },
        ],
      },
      gsap,
    )
    busyRef.current = false
  }

  return (
    <LclPreviewHost
      fixture={LCL_ATLAS_FIXTURE}
      hostRef={(node) => {
        hostRef.current = node
        scrollerRef.current = node?.closest('.theme-webgl-toolkit') ?? null
      }}
      label="LCL Atlas"
      layoutId="atlas"
    >
      {(id) => {
        if (id === 'head') {
          return (
            <div ref={headRef} className="theme-hairline-fx">
              <div className="theme-lcl-preview__display-head">
                <div ref={(node) => { titleRef.current = node }}>
                  <ScrollEnterText className="type-display-lg mb-0" bind="none">
                    Atlas
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
                  rootLabel="Atlas"
                  onSelect={(depth) => void goToDepth(depth)}
                />
              ) : (
                <div className={`${PROSE_INLINE_CLASS} theme-lcl-preview__text-steps`}>
                  <p className={`${PROSE_INLINE_P_CLASS} type-body-sm`}>
                    A light covers a{' '}
                    <button
                      type="button"
                      className={proseInlineLinkClass('md')}
                      onMouseEnter={() => {
                        const term = LCL_ATLAS_TERMS[0]
                        void (async () => {
                          if (noteRef.current) await playLclProseOut(noteRef.current, gsap).done
                          setNote(term.note)
                        })()
                      }}
                      onClick={() => void openPanelAt('Tide')}
                    >
                      reach
                    </button>
                    , and the lamp sits in a{' '}
                    <button
                      type="button"
                      className={proseInlineLinkClass('sm')}
                      onMouseEnter={() => {
                        const term = LCL_ATLAS_TERMS[1]
                        void (async () => {
                          if (noteRef.current) await playLclProseOut(noteRef.current, gsap).done
                          setNote(term.note)
                        })()
                      }}
                      onClick={() => void openPanelAt('Lamp')}
                    >
                      cage
                    </button>
                    .
                  </p>
                </div>
              )}
            </div>
          )
        }
        if (id === 'note') {
          return (
            <div ref={(node) => { noteRef.current = node }} className={`${PROSE_INLINE_CLASS} theme-lcl-preview__text-steps`}>
              <p className={`${PROSE_INLINE_P_CLASS} type-body-sm`}>{note}</p>
            </div>
          )
        }
        if (id === 'columns') {
          const panels = open && openPanel ? [openPanel] : LCL_ATLAS_PANELS
          return (
            <div
              ref={colsRef}
              className="theme-lcl-atlas-cols"
              data-wide={open ? 'open' : wide ?? undefined}
              data-order={orderRef.current.join(',')}
            >
              {panels.map((panel) => {
                const isWide = open || wide === panel.id
                return (
                  <button
                    key={panel.id}
                    type="button"
                    className="theme-lcl-atlas-panel"
                    onMouseEnter={() => panelHover.current.enter(panel.id)}
                    onFocus={() => panelHover.current.focus(panel.id)}
                    onClick={() => void openPanelAt(panel.title)}
                  >
                    <ScrollEnterText className={isWide ? 'type-h3 mb-0' : 'theme-lcl-sideways type-h3 mb-0'} bind="none">
                      {panel.title}
                    </ScrollEnterText>
                    {isWide ? (
                      <>
                        <LclMediaFrame src={panel.src} alt={panel.title} />
                        <p className="type-body-sm mb-0">{panel.lead}</p>
                        {open ? <p className="type-body-sm mb-0">{panel.body}</p> : null}
                      </>
                    ) : null}
                  </button>
                )
              })}
            </div>
          )
        }
        if (id === 'index') {
          return (
            <ul ref={indexRef} className="theme-lcl-layout__nest">
              {LCL_ATLAS_INDEX.map((label, index) => (
                <li key={label}>
                  <GrasUnderlineButton
                    layout="nest"
                    onMouseEnter={() => {
                      if (stagePinned) return
                      const panel = LCL_ATLAS_PANELS[index]
                      if (!panel) return
                      void (async () => {
                        if (stageRef.current) await startLclMediaOut(stageRef.current, gsap).done
                        setStage(panel)
                      })()
                    }}
                    onClick={() => {
                      setStagePinned(true)
                      void openPanelAt(LCL_ATLAS_PANELS[index]?.title ?? label)
                    }}
                  >
                    <ScrollEnterText split="line" bind="none">
                      <TypeAnimText anim="slide-left" trigger="hover" className="type-h3 mb-0">
                        {label}
                      </TypeAnimText>
                    </ScrollEnterText>
                  </GrasUnderlineButton>
                </li>
              ))}
            </ul>
          )
        }
        if (id === 'stage') {
          return (
            <div ref={(node) => { stageRef.current = node }}>
              <LclMediaFrame src={stage.src} alt={stage.title} caption={stage.lead} />
            </div>
          )
        }
        if (id === 'timeline') {
          return (
            <div className="flex h-full flex-col justify-end gap-2">
              <p ref={countRef} className="type-h3 mb-0 tabular-nums">
                {yearCount}
              </p>
              <ul ref={timeRef} className="theme-lcl-layout__nest">
                {LCL_ATLAS_YEARS.map((item) => (
                  <li key={item.year}>
                    <GrasUnderlineButton
                      layout="nest"
                      card={false}
                      onMouseEnter={() => {
                        if (countRef.current) startLclCountIn(countRef.current, gsap, item.count, yearCount)
                        setYearCount(item.count)
                        void (async () => {
                          if (noteRef.current) await playLclProseOut(noteRef.current, gsap).done
                          setNote(`${item.year} · ${item.label}`)
                        })()
                      }}
                    >
                      <ScrollEnterText split="line" bind="none">
                        {String(item.year)}
                      </ScrollEnterText>
                    </GrasUnderlineButton>
                  </li>
                ))}
              </ul>
            </div>
          )
        }
        return null
      }}
    </LclPreviewHost>
  )
})
