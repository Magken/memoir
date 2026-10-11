import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react'
import type { EChartsOption } from 'echarts'
import { ArrowLeft, Bug, Copy, Download, MessageSquare, PenLine, RefreshCw } from 'lucide-react'
import { AskAidLink } from './InterviewFlowResultSection'
import { Button } from './Button'
import { EChart } from './EChart'
import { InterviewOutputCardRepeater } from './InterviewOutputCardRepeater'
import { InterviewResultCard } from './InterviewResultCard'
import { InterviewResultBoundary } from './InterviewResultBoundary'
import type { InterviewFlowTimelineHandle, ResultStageChrome } from './InterviewFlowTimeline'
import {
  InterviewVerifyContributionList,
  contributionItemsFromScored,
} from './InterviewVerifyContributionList'
import { ThemeScroll } from './ThemeScroll'
import { VurifyMenuButton } from './VurifyMenuButton'
import type { InterviewLandingVerifySection } from './InterviewLanding'
import { gsap, revealSectionIn, revealSectionOut, useGsapPageOptional } from '../lib/gsap'
import {
  getThemeScrollLenis,
  readThemeScrollTop,
} from '../lib/scroll/themeScrollLenis'
import { labelTemplate } from '../lib/interviewBrief/analysisLabels'
import type { AssessorAidReport } from '../lib/interviewRunApi/buildAssessorAidReport'
import type { Creator2BriefDocument } from '../lib/interviewBrief/creator2BriefTypes'
import {
  assembleAttemptReport,
  assembleAttemptPackage,
  attemptPackageStatus,
  buildLiveOutputCard,
  collectPendingPackageGrains,
  downloadAttemptPackageJson,
  formatRemarkRadarDebug,
  getInterviewResponse,
  logRemarkRadarDebug,
  markJobsInflightCount,
  remarkAttempt,
  sittingMarkingProgress,
  subscribeMarkJobs,
} from '../lib/interviewRunApi'
import { InterviewMarkingProgress } from './InterviewMarkingProgress'
import {
  echartsAxisLabel,
  echartsAxisLine,
  echartsSplitLine,
  useChartTheme,
} from '../lib/charts/chartTheme'

type InterviewFinishedSceneProps = {
  title?: string
  briefId: string
  brief?: Creator2BriefDocument | null
  /** Parent workspace swap already plays enter. */
  skipMountReveal?: boolean
  /** Non-blocking assess failure from the last Next (still completed). */
  assessError?: string | null
  onVerifySectionChange?: (next: InterviewLandingVerifySection | null) => void
  /** Home Try: result card + one marking bar; no dump / remark / extra graph. */
  tryDemo?: boolean
  debug?: boolean
}

type DashScrollEdge = 'top' | 'mid' | 'bottom' | 'both'

function readScrollEdge(viewport: HTMLElement): DashScrollEdge {
  const top = readThemeScrollTop(viewport) <= 2
  const bottom =
    readThemeScrollTop(viewport) + viewport.clientHeight >= viewport.scrollHeight - 2
  if (top && bottom) return 'both'
  if (top) return 'top'
  if (bottom) return 'bottom'
  return 'mid'
}

type InterviewFinishedVerifyPanelProps = {
  verifySection: InterviewLandingVerifySection | null
  briefId?: string | null
  brief?: Creator2BriefDocument | null
  /** Cover still rising — do not mount the spine yet. */
  verifyBusy?: boolean
  /** Mount the timeline (cover has settled, overlay is open). */
  showSpine?: boolean
  /** Play spine exit, then `onExited`. */
  exiting?: boolean
  onClose: () => void
  /** After spine `revealSectionIn` + glow epoch. */
  onEntered?: () => void
  /** After spine `revealSectionOut`. */
  onExited?: () => void
  /** Report digest for the Assessor Aid peel, refreshed as the reader moves through the card. */
  onReport?: (report: AssessorAidReport | null) => void
  onAskHome?: (attach: import('../lib/interviewRunApi/aidPeelAttach').AidPeelAttach) => void
  onAskAboutCard?: (
    card: import('../lib/interviewRunApi/talkVerifyModal').TalkVerifyMarkingCard,
    home?: { sectionId: string; stage: 'chat' | 'editor' },
  ) => void
  highlightMessageId?: string | null
  timelineRef?: RefObject<InterviewFlowTimelineHandle | null>
  debug?: boolean
}

/**
 * Verify overlay body for a Results row — editor spine in the cover, not a deck card.
 * Cover rises empty; spine and Aid peel enter sequentially after settle.
 */
export function InterviewFinishedVerifyPanel({
  verifyBusy = false,
  showSpine = false,
  exiting = false,
  briefId = null,
  brief = null,
  onClose,
  onEntered,
  onExited,
  onReport,
  onAskHome,
  onAskAboutCard,
  highlightMessageId = null,
  timelineRef,
  debug = false,
}: InterviewFinishedVerifyPanelProps) {
  const spineScrollRef = useRef<HTMLDivElement>(null)
  const spineHostRef = useRef<HTMLDivElement>(null)
  const ownTimelineRef = useRef<InterviewFlowTimelineHandle | null>(null)
  const timelineApiRef = timelineRef ?? ownTimelineRef
  const onEnteredRef = useRef(onEntered)
  const onExitedRef = useRef(onExited)
  const gsapPage = useGsapPageOptional()
  const [resultLayoutEpoch, setResultLayoutEpoch] = useState(0)
  const [scrollEdge, setScrollEdge] = useState<DashScrollEdge>('top')
  const mountSpine = showSpine && !verifyBusy

  onEnteredRef.current = onEntered
  onExitedRef.current = onExited

  useLayoutEffect(() => {
    if (!mountSpine) {
      setResultLayoutEpoch((n) => (n === 0 ? n : 0))
      return
    }
    const host = spineHostRef.current
    const reduced = Boolean(gsapPage?.reducedMotion)
    if (!host) {
      if (exiting) onExitedRef.current?.()
      return
    }
    if (exiting) {
      revealSectionOut(host, {
        reducedMotion: reduced,
        duration: reduced ? 0.01 : 0.22,
        stagger: 0,
        onComplete: () => onExitedRef.current?.(),
      })
      return () => {
        gsap.killTweensOf(host)
      }
    }
    revealSectionIn(host, {
      reducedMotion: reduced,
      duration: reduced ? 0.01 : 0.4,
      stagger: 0,
      fromY: 12,
      onComplete: () => {
        setResultLayoutEpoch((n) => n + 1)
        onEnteredRef.current?.()
      },
    })
    return () => {
      gsap.killTweensOf(host)
    }
  }, [mountSpine, exiting, gsapPage?.reducedMotion])

  useEffect(() => {
    const viewport = spineScrollRef.current
    if (!viewport) return
    const sync = () => setScrollEdge(readScrollEdge(viewport))
    sync()
    viewport.addEventListener('scroll', sync, { passive: true })
    const lenis = getThemeScrollLenis(viewport)
    lenis?.on('scroll', sync)
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(sync) : null
    ro?.observe(viewport)
    const inner = viewport.firstElementChild
    if (inner instanceof HTMLElement) ro?.observe(inner)
    return () => {
      viewport.removeEventListener('scroll', sync)
      lenis?.off('scroll', sync)
      ro?.disconnect()
    }
  }, [mountSpine, resultLayoutEpoch])

  const [stageChrome, setStageChrome] = useState<ResultStageChrome | null>(null)

  const handleBack = useCallback(() => {
    if (timelineApiRef.current?.isEditStage()) {
      void timelineApiRef.current.exitEditStage()
      return
    }
    onClose()
  }, [onClose])

  useEffect(() => {
    if (!mountSpine) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (!timelineApiRef.current?.isEditStage()) return
      event.preventDefault()
      event.stopPropagation()
      void timelineApiRef.current.exitEditStage()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [mountSpine])

  return (
    <div
      className="theme-interview-landing__verify-panel"
      data-scroll-edge={scrollEdge}
    >
      <ThemeScroll
        rail="mini"
        smooth
        className="theme-interview-landing__verify-spine-scroll"
        viewportRef={spineScrollRef}
        tabIndex={-1}
      >
        <div className="theme-interview-landing__verify-spine-page">
          <div className="theme-interview-creator__builder">
            <header className="theme-interview-creator__builder-header">
              <div className="theme-interview-creator__builder-header-lead">
                <VurifyMenuButton
                  type="button"
                  variant="label"
                  size="md"
                  housing
                  activeChrome={false}
                  lineTone="muted"
                  icon={ArrowLeft}
                  iconPosition="left"
                  onClick={handleBack}
                >
                  Back
                </VurifyMenuButton>
              </div>
              {stageChrome ? (
                <div className="theme-interview-creator__builder-header-actions">
                  <div className="theme-interview-landing__verify-header-switch">
                    {stageChrome.canEditor ? (
                      <VurifyMenuButton
                        type="button"
                        variant="label"
                        size="md"
                        housing
                        activeChrome={stageChrome.mode === 'editor'}
                        lineTone="muted"
                        icon={PenLine}
                        iconPosition="left"
                        onClick={() => stageChrome.open('editor')}
                      >
                        Work
                      </VurifyMenuButton>
                    ) : null}
                    {stageChrome.canEditor && stageChrome.canChat ? (
                      <span
                        className="theme-interview-creator__manage-divider"
                        role="presentation"
                      />
                    ) : null}
                    {stageChrome.canChat ? (
                      <VurifyMenuButton
                        type="button"
                        variant="label"
                        size="md"
                        housing
                        activeChrome={stageChrome.mode === 'chat'}
                        lineTone="muted"
                        icon={MessageSquare}
                        iconPosition="left"
                        onClick={() => stageChrome.open('chat')}
                      >
                        Conversation
                      </VurifyMenuButton>
                    ) : null}
                    {onAskHome ? (
                      <AskAidLink
                        onClick={() =>
                          onAskHome({
                            kind: stageChrome.mode === 'editor' ? 'section_work' : 'section_chat',
                            id: stageChrome.stepId,
                            label: stageChrome.mode === 'editor' ? 'Work' : 'Conversation',
                          })
                        }
                      />
                    ) : null}
                  </div>
                </div>
              ) : null}
            </header>
            {mountSpine ? (
              <div ref={spineHostRef} className="theme-interview-landing__verify-spine-in">
                <InterviewResultBoundary surface="This report" detail={{ briefId }}>
                  <InterviewResultCard
                    ref={timelineApiRef}
                    briefId={briefId}
                    brief={brief}
                    layoutEpoch={resultLayoutEpoch}
                    scrollerRef={spineScrollRef as RefObject<HTMLElement | null>}
                    onStageChrome={setStageChrome}
                    onReport={onReport}
                    onAskHome={onAskHome}
                    onAskAboutCard={onAskAboutCard}
                    highlightMessageId={highlightMessageId}
                    debug={debug}
                  />
                </InterviewResultBoundary>
              </div>
            ) : (
              <div className="theme-interview-landing__verify-blank" />
            )}
          </div>
        </div>
      </ThemeScroll>
    </div>
  )
}

function FinishedBucketBars({
  bars,
  reduceMotion,
}: {
  bars: Array<{ key: string; label: string; unit: number | null; weight: number }>
  reduceMotion: boolean
}) {
  const t = useChartTheme()
  const included = bars.filter((b) => b.unit != null)
  if (!included.length) return null
  const option: EChartsOption = {
    animation: !reduceMotion,
    animationDuration: reduceMotion ? 0 : 420,
    grid: { left: 8, right: 8, top: 8, bottom: 28, containLabel: true },
    xAxis: {
      type: 'category',
      data: included.map((b) => b.label.replace(/ \/ .*$/, '')),
      axisLabel: { ...echartsAxisLabel(t), rotate: included.length > 4 ? 20 : 0 },
      axisLine: echartsAxisLine(t),
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 1,
      axisLabel: echartsAxisLabel(t),
      axisLine: echartsAxisLine(t),
      splitLine: echartsSplitLine(t),
    },
    series: [
      {
        type: 'bar',
        data: included.map((b) => ({
          value: b.unit ?? 0,
          itemStyle: { color: t.palette[0] },
        })),
        barMaxWidth: 28,
      },
    ],
  }
  return (
    <div className="theme-interview-landing__finished-bars" aria-label="Soft Decision buckets">
      <EChart option={option} height={180} deferUntilVisible />
    </div>
  )
}

/**
 * Closing surface after the last gate — Decision results cards + attempt JSON.
 */
export function InterviewFinishedScene({
  title = 'Interview complete',
  briefId,
  brief = null,
  skipMountReveal = false,
  assessError = null,
  onVerifySectionChange,
  tryDemo = false,
  debug = false,
}: InterviewFinishedSceneProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const gsapPage = useGsapPageOptional()
  const [copied, setCopied] = useState(false)
  const [debugCopied, setDebugCopied] = useState(false)
  const [remarkWatch, setRemarkWatch] = useState(false)
  const remarkSawMarking = useRef(false)
  const [responseTick, setResponseTick] = useState(0)
  const [heavyReady, setHeavyReady] = useState(false)

  useEffect(() => subscribeMarkJobs(() => setResponseTick((n) => n + 1)), [])

  useEffect(() => {
    let inner = 0
    const outer = window.requestAnimationFrame(() => {
      inner = window.requestAnimationFrame(() => setHeavyReady(true))
    })
    return () => {
      window.cancelAnimationFrame(outer)
      if (inner) window.cancelAnimationFrame(inner)
    }
  }, [])

  const livePack = useMemo(() => {
    if (!brief) return null
    return buildLiveOutputCard({ briefId, brief })
  }, [brief, briefId, responseTick])

  const inflightJobs = markJobsInflightCount()
  const marking =
    attemptPackageStatus({
      inflightJobs,
      pendingCount: livePack?.scored.pendingCount ?? 0,
    }) === 'marking'

  const markProgress = useMemo(() => {
    const counts = livePack?.scored.grainCounts
    if (!counts) return null
    return sittingMarkingProgress(counts, inflightJobs)
  }, [livePack, inflightJobs])

  const pendingGrains = useMemo(
    () => (marking && livePack ? collectPendingPackageGrains(livePack.response) : []),
    [marking, livePack],
  )

  const liveReport = useMemo(() => {
    if (!heavyReady || !brief || !livePack) return null
    return assembleAttemptReport({
      brief,
      response: livePack.response,
      scored: livePack.scored,
    })
  }, [brief, heavyReady, livePack])

  useEffect(() => {
    if (skipMountReveal) return
    revealSectionIn(rootRef.current, {
      reducedMotion: gsapPage?.reducedMotion,
      stagger: 0.04,
      fromY: 12,
      duration: 0.36,
    })
  }, [gsapPage?.reducedMotion, skipMountReveal])

  if (debug) {
    console.debug('[InterviewFinishedScene]', { title, briefId, response: getInterviewResponse(briefId) })
  }

  const handleCopy = async () => {
    try {
      const pack = assembleAttemptPackage({ briefId, brief })
      await navigator.clipboard.writeText(JSON.stringify(pack, null, 2))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      /* ignore */
    }
  }

  const handleCopyRadarDebug = useCallback(async () => {
    if (!briefId?.trim() || !brief) return
    const text = formatRemarkRadarDebug({
      briefId: briefId.trim(),
      brief,
      response: getInterviewResponse(briefId.trim()),
    })
    logRemarkRadarDebug(text)
    try {
      await navigator.clipboard.writeText(text)
      setDebugCopied(true)
      window.setTimeout(() => setDebugCopied(false), 1600)
    } catch {
      /* console still has the DIAG */
    }
  }, [brief, briefId])

  useEffect(() => {
    if (!remarkWatch) return
    if (marking) {
      remarkSawMarking.current = true
      return
    }
    if (!remarkSawMarking.current) return
    void handleCopyRadarDebug()
    setRemarkWatch(false)
  }, [handleCopyRadarDebug, marking, remarkWatch])

  const canRemark = Boolean(briefId?.trim() && brief)
  const handleRemark = () => {
    if (!briefId?.trim() || !brief || marking) return
    remarkSawMarking.current = false
    setRemarkWatch(true)
    void remarkAttempt({ briefId: briefId.trim(), brief })
  }

  return (
      <article
        ref={rootRef}
        className="theme-interview-gate theme-interview-gate--finished"
        aria-label={title}
        {...(tryDemo ? { 'data-try-demo': 'true' } : {})}
      >
        <h2 className="type-h2 mb-0 theme-interview-gate__title" data-dash-anim>
          {title}
        </h2>
        {tryDemo ? null : (
        <p className="type-body-sm mb-0 theme-interview-gate__description" data-dash-anim>
          You have finished every stage. Review the Decision package below. Use Back to return
          to the interview overview.
        </p>
        )}
        {assessError ? (
          <p className="type-caption type-muted mb-0" role="status" data-dash-anim>
            {tryDemo
              ? `Last stage advanced with a scoring note: ${assessError.slice(0, 200)}.`
              : `Last stage advanced with a scoring note: ${assessError.slice(0, 200)}. Soft Decision may be partial — check tool packages in the JSON dump.`}
          </p>
        ) : null}

        <aside
          className="theme-interview-landing__output-preview"
          {...(tryDemo
            ? { 'aria-label': 'Results' }
            : { 'aria-labelledby': 'interview-output-preview-heading' })}
          data-dash-anim
        >
          <div className="theme-interview-landing__output-preview-head">
            {tryDemo ? null : (
              <>
            <h3
              id="interview-output-preview-heading"
              className="type-label mb-0 theme-interview-landing__output-preview-label"
            >
              Results
            </h3>
            <p className="type-caption type-muted mb-0 theme-interview-landing__output-preview-note">
              {marking
                ? 'Results are still marking. Soft Decision overall is not final yet.'
                : 'This attempt — Decision mix, summary, interview meta tags.'}
            </p>
              </>
            )}
            {tryDemo ? (
              markProgress ? (
                <InterviewMarkingProgress
                  progress={markProgress}
                  pending={pendingGrains}
                />
              ) : null
            ) : marking && markProgress ? (
              <InterviewMarkingProgress
                progress={markProgress}
                pending={pendingGrains}
                size="sm"
              />
            ) : null}
          </div>
          <InterviewOutputCardRepeater
            cards={livePack ? [livePack.card] : []}
            emptyLabel="Results will show here when this interview is scored."
            debug={debug}
            skipMountReveal={skipMountReveal}
            onSeeMoreSection={({ sectionKey, label, summary, summaryDetail }) =>
              onVerifySectionChange?.({
                sectionKey,
                label,
                summary,
                summaryDetail,
              })
            }
          />
        </aside>

        {tryDemo ? null : (
        <div className="theme-interview-gate__finished-dump" data-dash-anim>
          {marking && markProgress ? (
            <InterviewMarkingProgress progress={markProgress} pending={pendingGrains} />
          ) : (
            <p className="type-label mb-0" role="status" aria-live="polite">
              Ready
            </p>
          )}
          <p className="type-caption type-muted mb-0">
            {marking
              ? 'Results are still marking. Download when Ready.'
              : 'Download the full interview JSON (marks, tapes, security, history). Copy radar debug after Remark to dump grain homes and Why notes.'}
          </p>
          {liveReport && !marking ? (
            <>
              <FinishedBucketBars
                bars={liveReport.layer1.charts.bucketBars}
                reduceMotion={Boolean(gsapPage?.reducedMotion)}
              />
              <InterviewVerifyContributionList
                items={contributionItemsFromScored(
                  liveReport.layer1.contributions,
                  labelTemplate,
                )}
                heading="How each mark counts"
                onJumpItem={(id) => {
                  const row = liveReport.layer1.contributions.find(
                    (c) => `${c.templateId}:${c.hostRef}` === id,
                  )
                  if (!row) return
                  onVerifySectionChange?.({
                    sectionKey: row.bucket,
                    label: labelTemplate(row.templateId),
                  })
                }}
                debug={debug}
              />
            </>
          ) : null}
          <p className="type-caption type-muted mb-0 theme-interview-gate__finished-dump-label">
            Attempt dump
          </p>
          <div className="theme-interview-gate__finished-actions flex flex-wrap gap-2">
            {canRemark ? (
              <Button
                size="sm"
                variant="ghost"
                labelAnim={false}
                icon={RefreshCw}
                disabled={marking}
                onClick={handleRemark}
              >
                Remark
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="ghost"
              labelAnim={false}
              icon={Bug}
              disabled={marking || !brief}
              onClick={() => void handleCopyRadarDebug()}
            >
              {debugCopied ? 'Copied debug' : 'Copy radar debug'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              labelAnim={false}
              icon={Copy}
              disabled={marking}
              onClick={() => void handleCopy()}
            >
              {copied ? 'Copied' : 'Copy JSON'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              labelAnim={false}
              icon={Download}
              disabled={marking}
              onClick={() => downloadAttemptPackageJson({ briefId, brief })}
            >
              Download JSON
            </Button>
          </div>
        </div>
        )}
      </article>
  )
}
