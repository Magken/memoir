/**
 * Reusable layered content layout — painted sections expand in place.
 */
import { useLayoutEffect, useRef, useState } from 'react'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import { CopyButton } from './CopyButton'
import { FluidLineText } from './FluidLineText'
import { GrasUnderlineButton } from './GrasUnderlineButton'
import { IconButton } from './IconButton'
import { ThemeScroll } from './ThemeScroll'
import { useAnimatedFoldMount } from '../hooks/useAnimatedFoldMount'
import {
  playFluidCharsIn,
  playFluidCharsOut,
  playFluidFit,
  playFluidMediaIn,
  playFluidMediaOut,
} from '../lib/animations/fluidMotion'
import {
  LCL_LAYER_IN_MS,
  LCL_LAYER_OUT_MS,
  lclLayerAt,
  type LclBlock,
  type LclLayer,
} from '../lib/lcl/lclLayer'
import {
  gridPlacementFromCells,
  type LclViewportSectionsPayload,
} from '../lib/lcl/viewportSections'

export type LclLayoutProps = {
  payload: LclViewportSectionsPayload
  layers: Record<string, LclLayer>
}

type FluidSeat = {
  title: HTMLElement
  cover: HTMLElement
}

function FluidCover({
  cover,
  className = '',
  rest = false,
}: {
  cover: number
  className?: string
  rest?: boolean
}) {
  return (
    <span
      className={['theme-fluid-media', rest ? 'is-rest' : '', className].filter(Boolean).join(' ')}
      data-cover={String(cover % 8)}
    >
      <span className="theme-fluid-media__img" />
    </span>
  )
}

function LclBlocks({ blocks }: { blocks: LclBlock[] }) {
  return (
    <div className="theme-lcl-layout__blocks">
      {blocks.map((block, index) => {
        if (block.kind === 'p') {
          return (
            <FluidLineText key={index} as="p" split="line" className="type-body mb-0 prose-measure">
              {block.text}
            </FluidLineText>
          )
        }
        if (block.kind === 'code') {
          return (
            <div key={index} className="theme-lcl-layout__code">
              <pre className="type-code mb-0">
                <code>{block.text}</code>
              </pre>
              <CopyButton text={block.text} size="xs" variant="ghost" />
            </div>
          )
        }
        if (block.kind === 'group') {
          return (
            <div key={index} className="theme-lcl-layout__group">
              <FluidLineText as="h3" split="line" className="type-h3 mb-0">
                {block.title}
              </FluidLineText>
              <ul className="theme-lcl-layout__list type-body-sm">
                {block.items.map((item) => (
                  <li key={item}>
                    <FluidLineText split="line">{item}</FluidLineText>
                  </li>
                ))}
              </ul>
            </div>
          )
        }
        const ListTag = block.kind === 'ol' ? 'ol' : 'ul'
        return (
          <ListTag key={index} className="theme-lcl-layout__list type-body-sm">
            {block.items.map((item) => (
              <li key={item}>
                <FluidLineText split="line">{item}</FluidLineText>
              </li>
            ))}
          </ListTag>
        )
      })}
    </div>
  )
}

function captureTileSeat(root: HTMLElement | null, id: string): FluidSeat | null {
  const tile = root?.querySelector(`[data-id="${id}"]`)
  const title = tile?.querySelector<HTMLElement>('.theme-lcl-layout__tile-copy .theme-fluid-line')
  const cover = tile?.querySelector<HTMLElement>('.theme-lcl-layout__cover')
  if (!title || !cover) return null
  return { title, cover }
}

export function LclLayout({ payload, layers }: LclLayoutProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const copyRef = useRef<HTMLDivElement>(null)
  const seatRef = useRef<FluidSeat | null>(null)
  const lastLayerRef = useRef<LclLayer | null>(null)
  const [path, setPath] = useState<string[]>([])
  const [phase, setPhase] = useState<'in' | 'out' | 'rest'>('rest')
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')
  const open = path.length > 0
  const { mounted, shown } = useAnimatedFoldMount(open, LCL_LAYER_OUT_MS)
  const busy = phase === 'out'
  const root = path[0] ? layers[path[0]] : null
  const current = root ? lclLayerAt(root, path) : null
  if (current) lastLayerRef.current = current
  const shownLayer = current ?? (mounted ? lastLayerRef.current : null)
  const layerKey = path.join('/')
  const cover = shownLayer?.cover ?? root?.cover ?? 0

  useLayoutEffect(() => {
    if (open) return
    const host = rootRef.current
    if (!host) return
    host.querySelectorAll<HTMLElement>('.theme-lcl-layout__tile').forEach((tile) => playFluidCharsIn(tile))
  }, [open])

  useLayoutEffect(() => {
    if (!open || !shown || phase !== 'in') return
    const pane = copyRef.current
    if (!pane) return
    const seat = seatRef.current
    seatRef.current = null
    const paneTitle = pane.querySelector<HTMLElement>('.theme-lcl-layout__titles .theme-fluid-line')
    const paneHero = pane.querySelector<HTMLElement>('.theme-lcl-layout__hero .theme-fluid-media')
    const stage = pane.querySelector<HTMLElement>('.theme-lcl-layout__stage')
    if (seat && paneTitle && paneHero) {
      playFluidFit(paneTitle, seat.title)
      playFluidFit(paneHero, seat.cover)
    } else if (paneTitle) {
      playFluidCharsIn(paneTitle)
    }
    playFluidMediaIn(pane)
    playFluidCharsIn(stage)
    const t = window.setTimeout(() => setPhase('rest'), LCL_LAYER_IN_MS)
    return () => window.clearTimeout(t)
  }, [open, shown, phase, layerKey])

  function openSection(id: string) {
    if (busy || open) return
    seatRef.current = captureTileSeat(rootRef.current, id)
    setDirection('forward')
    setPath([id])
    setPhase('in')
  }

  function enterChild(id: string) {
    if (busy || !open) return
    setDirection('forward')
    playFluidCharsOut(copyRef.current, 'forward')
    playFluidMediaOut(copyRef.current)
    setPhase('out')
    window.setTimeout(() => {
      setPath((prev) => [...prev, id])
      setPhase('in')
    }, LCL_LAYER_OUT_MS)
  }

  function goBack() {
    if (busy || !open) return
    setDirection('back')
    playFluidCharsOut(copyRef.current, 'back')
    playFluidMediaOut(copyRef.current)
    setPhase('out')
    const leaving = path.length <= 1
    window.setTimeout(() => {
      if (leaving) {
        setPath([])
        setPhase('rest')
        return
      }
      setPath((prev) => prev.slice(0, -1))
      setPhase('in')
    }, LCL_LAYER_OUT_MS)
  }

  return (
    <div
      ref={rootRef}
      className="theme-lcl-layout"
      data-open={open ? 'true' : undefined}
      data-phase={phase}
      data-direction={direction}
      aria-label="Layered content layout"
    >
      {payload.sections.map((section, index) => {
        const layer = layers[section.id]
        const place = gridPlacementFromCells(section.cells)
        if (!layer || !place) return null
        const tone = layer.cover ?? index
        return (
          <button
            key={section.id}
            type="button"
            className="theme-lcl-layout__tile"
            data-id={section.id}
            data-tone={String(index % 8)}
            data-cs={String(place.columnStart)}
            data-ce={String(place.columnEnd)}
            data-rs={String(place.rowStart)}
            data-re={String(place.rowEnd)}
            disabled={busy || open}
            onClick={() => openSection(section.id)}
          >
            <FluidCover rest cover={tone} className="theme-lcl-layout__cover" />
            <span className="theme-lcl-layout__tile-copy">
              {layer.overline ? (
                <span className="type-overline type-muted mb-0">{layer.overline}</span>
              ) : null}
              <FluidLineText split="chars" className="type-display-sm mb-0" flipId={section.id}>
                {layer.title}
              </FluidLineText>
            </span>
          </button>
        )
      })}
      {mounted && shownLayer ? (
        <div
          ref={copyRef}
          className={['theme-lcl-layout__pane', shown ? 'is-open' : ''].filter(Boolean).join(' ')}
          data-direction={direction}
        >
          <div className="theme-lcl-layout__hero">
            <FluidCover cover={cover} />
          </div>
          <header className="theme-lcl-layout__head">
            <IconButton
              icon={ArrowLeft}
              aria-label="Return"
              size="xs"
              variant="ghost"
              disabled={busy}
              onClick={goBack}
            />
            <div className="theme-lcl-layout__titles">
              {shownLayer.overline ? (
                <p className="type-overline type-muted mb-0">{shownLayer.overline}</p>
              ) : null}
              <FluidLineText key={layerKey} split="chars" as="h2" className="type-h1 mb-0" flipId={shownLayer.id}>
                {shownLayer.title}
              </FluidLineText>
              {shownLayer.meta ? (
                <p className="type-caption type-muted mb-0">{shownLayer.meta}</p>
              ) : null}
            </div>
          </header>
          <ThemeScroll axis="vertical" rail="nano" className="theme-lcl-layout__body">
            <div className="theme-lcl-layout__stage">
              {shownLayer.lead ? (
                <FluidLineText as="p" split="line" className="type-lead type-muted mb-0 prose-measure">
                  {shownLayer.lead}
                </FluidLineText>
              ) : null}
              {shownLayer.body ? (
                <FluidLineText as="p" split="line" className="type-body mb-0 prose-measure">
                  {shownLayer.body}
                </FluidLineText>
              ) : null}
              {shownLayer.blocks?.length ? <LclBlocks blocks={shownLayer.blocks} /> : null}
              {shownLayer.layers?.length ? (
                <ul className="theme-lcl-layout__nest">
                  {shownLayer.layers.map((child) => (
                    <li key={child.id}>
                      <GrasUnderlineButton
                        layout="nest"
                        card={false}
                        disabled={busy}
                        onClick={() => enterChild(child.id)}
                      >
                        <span className="theme-lcl-layout__nest-copy">
                          {child.overline ? (
                            <span className="type-caption type-muted mb-0">{child.overline}</span>
                          ) : null}
                          <FluidLineText split="line" className="type-h3 mb-0">
                            {child.title}
                          </FluidLineText>
                        </span>
                        <ChevronRight aria-hidden className="theme-lcl-layout__nest-chevron" />
                      </GrasUnderlineButton>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </ThemeScroll>
        </div>
      ) : null}
    </div>
  )
}
