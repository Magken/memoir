/**
 * Type LCL: decode, marker, strike, case, quote, footnote. Out then in, keyed stage.
 */
import { forwardRef, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react'
import { gsap, ScrollTrigger, useGSAP } from '../../lib/gsap'
import {
  applyScrollHairline,
  playLclProseIn,
  playScrollHairlineIn,
  startLclCountIn,
  startLclCrumbIn,
  startLclCrumbOut,
  startLclDecodeIn,
  startLclListIn,
  startLclListOut,
  startLclTitleIn,
  startLclTitleOut,
} from '../../lib/animations/scrollEnter'
import { PROSE_INLINE_CLASS, PROSE_INLINE_P_CLASS } from '../../lib/animations/proseInlineLinks'
import { LclBreadcrumb } from '../LclBreadcrumb'
import { GrasUnderlineButton } from '../GrasUnderlineButton'
import { ScrollEnterText } from '../ScrollEnterText'
import { TypeAnimText } from '../TypeAnimText'
import { lclSwap, type LclPreviewHandle } from '../../lib/lcl/lclChoreo'
import { LCL_TYPE_COPY, LCL_TYPE_SPECIMENS, type LclTypeSpecimen } from '../../lib/lcl/lclTypeContent'
import { LCL_TYPE_FIXTURE } from '../../lib/lcl/viewportSections'
import { LclPreviewHost } from './LclPreviewHost'

function SpecimenStage({ name }: { name: LclTypeSpecimen }) {
  const decodeRef = useRef<HTMLElement | null>(null)
  const markRef = useRef<HTMLElement | null>(null)
  const strikeRef = useRef<HTMLElement | null>(null)
  const caseRef = useRef<HTMLElement | null>(null)
  const quoteRef = useRef<HTMLDivElement | null>(null)
  const noteRef = useRef<HTMLDivElement | null>(null)
  const [caseForm, setCaseForm] = useState<'title' | 'small' | 'spaced'>('title')
  const [noteOpen, setNoteOpen] = useState(false)

  useLayoutEffect(() => {
    if (name === 'Decode' && decodeRef.current) void startLclDecodeIn(decodeRef.current, gsap, LCL_TYPE_COPY.decode)
    if (name === 'Marker' && markRef.current) playScrollHairlineIn(markRef.current, gsap)
    if (name === 'Strike' && strikeRef.current) {
      playScrollHairlineIn(strikeRef.current, gsap)
      void startLclTitleOut(strikeRef.current, gsap).done.then(() => {
        if (strikeRef.current) {
          strikeRef.current.textContent = LCL_TYPE_COPY.strikeNew
          void startLclTitleIn(strikeRef.current, gsap)
        }
      })
    }
    if (name === 'Case' && caseRef.current) void startLclTitleIn(caseRef.current, gsap)
    if (name === 'Quote' && quoteRef.current) playLclProseIn(quoteRef.current, gsap)
    if (name === 'Notes' && noteRef.current) playLclProseIn(noteRef.current, gsap)
  }, [name])

  if (name === 'Decode') {
    return (
      <p ref={(node) => { decodeRef.current = node }} className="type-display-lg mb-0">
        {LCL_TYPE_COPY.decode}
      </p>
    )
  }
  if (name === 'Marker') {
    return (
      <p className="type-h3 mb-0">
        <span ref={markRef} className="theme-lcl-mark theme-hairline-fx">
          {LCL_TYPE_COPY.marker}
          <span className="theme-lcl-mark__band theme-hairline-fx__wipe" aria-hidden />
        </span>
      </p>
    )
  }
  if (name === 'Strike') {
    return (
      <p className="type-h3 mb-0">
        {LCL_TYPE_COPY.strikeLead}{' '}
        <span ref={strikeRef} className="theme-lcl-strike theme-hairline-fx">
          {LCL_TYPE_COPY.strikeOld}
          <span className="theme-lcl-strike__rule theme-hairline-fx__wipe" aria-hidden />
        </span>{' '}
        {LCL_TYPE_COPY.strikeTail}
      </p>
    )
  }
  if (name === 'Case') {
    const shown = caseForm === 'title' ? LCL_TYPE_COPY.caseWord : caseForm === 'small' ? 'HARBOR' : 'H A R B O R'
    return (
      <button
        type="button"
        className="type-display-lg mb-0"
        onClick={() => {
          void (async () => {
            if (caseRef.current) await startLclTitleOut(caseRef.current, gsap).done
            setCaseForm((prev) => (prev === 'title' ? 'small' : prev === 'small' ? 'spaced' : 'title'))
          })()
        }}
      >
        <span ref={caseRef}>{shown}</span>
      </button>
    )
  }
  if (name === 'Quote') {
    return (
      <div ref={quoteRef} className="theme-lcl-quote">
        <span className="theme-lcl-quote__rule theme-hairline-fx__wipe" aria-hidden />
        <div className={`${PROSE_INLINE_CLASS}`}>
          <p className={`${PROSE_INLINE_P_CLASS} type-body-sm`}>{LCL_TYPE_COPY.quote}</p>
          <p className="type-caption mb-0">{LCL_TYPE_COPY.quoteBy}</p>
        </div>
      </div>
    )
  }
  return (
    <div ref={noteRef} className={`${PROSE_INLINE_CLASS} theme-lcl-preview__text-steps`}>
      <p className={`${PROSE_INLINE_P_CLASS} type-body-sm`}>
        {LCL_TYPE_COPY.notes}{' '}
        <button type="button" className="type-caption" onClick={() => setNoteOpen((open) => !open)}>
          1
        </button>
      </p>
      {noteOpen ? <p className={`${PROSE_INLINE_P_CLASS} type-caption`}>{LCL_TYPE_COPY.footnote}</p> : null}
    </div>
  )
}

export const LclTypePreview = forwardRef<LclPreviewHandle>(function LclTypePreview(_, ref) {
  const hostRef = useRef<HTMLElement | null>(null)
  const scrollerRef = useRef<HTMLElement | null>(null)
  const titleRef = useRef<HTMLElement | null>(null)
  const headRef = useRef<HTMLDivElement | null>(null)
  const crumbRef = useRef<HTMLElement | null>(null)
  const listRef = useRef<HTMLUListElement | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const numRef = useRef<HTMLElement | null>(null)
  const busyRef = useRef(false)
  const [path, setPath] = useState<string[]>([])
  const current = (path[0] as LclTypeSpecimen | undefined) ?? null

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
  }, [])

  useImperativeHandle(ref, () => ({
    leave: async () => {
      if (listRef.current) await startLclListOut(listRef.current, gsap).done
      if (stageRef.current) await startLclTitleOut(stageRef.current, gsap).done
    },
  }))

  async function openSpecimen(name: LclTypeSpecimen) {
    if (busyRef.current) return
    busyRef.current = true
    await lclSwap(
      {
        leave: [{ key: 'stage', el: stageRef.current, out: startLclTitleOut, in: startLclTitleIn }],
        commit: () => setPath([name]),
        enter: () => [
          { key: 'crumb', el: crumbRef.current, out: startLclCrumbOut, in: startLclCrumbIn },
          { key: 'stage', el: stageRef.current, out: startLclTitleOut, in: startLclTitleIn },
        ],
      },
      gsap,
    )
    if (numRef.current) startLclCountIn(numRef.current, gsap, LCL_TYPE_SPECIMENS.indexOf(name) + 1)
    busyRef.current = false
  }

  async function goToDepth(depth: number) {
    if (busyRef.current || depth >= path.length) return
    busyRef.current = true
    await lclSwap(
      {
        leave: [
          { key: 'crumb', el: crumbRef.current, out: startLclCrumbOut, in: startLclCrumbIn },
          { key: 'stage', el: stageRef.current, out: startLclTitleOut, in: startLclTitleIn },
        ],
        commit: () => setPath([]),
        enter: () => [
          { key: 'list', el: listRef.current, out: startLclListOut, in: startLclListIn },
          { key: 'stage', el: stageRef.current, out: startLclTitleOut, in: startLclTitleIn },
        ],
      },
      gsap,
    )
    busyRef.current = false
  }

  return (
    <LclPreviewHost
      fixture={LCL_TYPE_FIXTURE}
      hostRef={(node) => {
        hostRef.current = node
        scrollerRef.current = node?.closest('.theme-webgl-toolkit') ?? null
      }}
      label="LCL Type"
      layoutId="type"
    >
      {(id) => {
        if (id === 'head') {
          return (
            <div ref={headRef} className="theme-hairline-fx">
              <div className="theme-lcl-preview__display-head">
                <div ref={(node) => { titleRef.current = node }}>
                  <ScrollEnterText className="type-display-lg mb-0" bind="none">
                    Type
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
                  rootLabel="Type"
                  onSelect={(depth) => void goToDepth(depth)}
                />
              ) : null}
            </div>
          )
        }
        if (id === 'specimens') {
          return (
            <ul ref={listRef} className="theme-lcl-layout__nest">
              {LCL_TYPE_SPECIMENS.map((name) => (
                <li key={name}>
                  <GrasUnderlineButton layout="nest" onClick={() => void openSpecimen(name)}>
                    <ScrollEnterText split="line" bind="none">
                      <TypeAnimText anim="slide-left" trigger="hover" className="type-h3 mb-0">
                        {name}
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
            <div ref={stageRef} className="flex h-full min-h-0 flex-col justify-end gap-3">
              {current ? (
                <>
                  <p className="type-caption mb-0">
                    <span ref={numRef} className="tabular-nums">
                      00
                    </span>
                    {' '}
                    {current}
                  </p>
                  <SpecimenStage key={current} name={current} />
                </>
              ) : (
                <p className="type-body-sm mb-0">Open a specimen. Each one leaves, then enters on a new node.</p>
              )}
            </div>
          )
        }
        return null
      }}
    </LclPreviewHost>
  )
})
