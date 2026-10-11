/**
 * LCL constructor toolkit workbench — selector plus one layout preview.
 */
import { useRef, useState } from 'react'
import { ChevronDown, ChevronUp, Layers } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { gsap } from '../../lib/gsap'
import { startLclListIn, startLclListOut } from '../../lib/animations/scrollEnter'
import { LCL_LAYOUTS, lclLayout, lclLayoutMenuDetail, parseLclLayoutId } from '../../lib/lcl/lclLayouts'
import type { LclPreviewHandle } from '../../lib/lcl/lclChoreo'
import { IconButton } from '../IconButton'
import { MenuButton } from '../MenuButton'
import { LclFeatureChips } from '../LclFeatureChips'
import { LclViewportPreview } from './LclViewportPreview'
import { LclLedgerPreview } from './LclLedgerPreview'
import { LclReelPreview } from './LclReelPreview'
import { LclAtlasPreview } from './LclAtlasPreview'
import { LclTypePreview } from './LclTypePreview'
import { LclViewportSelector } from './LclViewportSelector'

type WebglLclWorkbenchProps = {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function WebglLclWorkbench({ open = true, onOpenChange }: WebglLclWorkbenchProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const layoutId = parseLclLayoutId(searchParams.get('layout'))
  const layout = lclLayout(layoutId) ?? LCL_LAYOUTS[0]
  const previewRef = useRef<LclPreviewHandle | null>(null)
  const chipsRef = useRef<HTMLUListElement | null>(null)
  const [busy, setBusy] = useState(false)

  async function selectLayout(id: string) {
    if (busy || id === layoutId) return
    setBusy(true)
    if (chipsRef.current) await startLclListOut(chipsRef.current, gsap).ready
    await previewRef.current?.leave()
    const next = new URLSearchParams(searchParams)
    next.set('page', 'lcl')
    next.set('layout', id)
    setSearchParams(next, { replace: true })
    setBusy(false)
    requestAnimationFrame(() => {
      if (chipsRef.current) void startLclListIn(chipsRef.current, gsap)
    })
  }

  const Preview =
    layoutId === 'ledger'
      ? LclLedgerPreview
      : layoutId === 'reel'
        ? LclReelPreview
        : layoutId === 'atlas'
          ? LclAtlasPreview
          : layoutId === 'type'
            ? LclTypePreview
            : LclViewportPreview

  return (
    <section
      className={['theme-webgl-toolkit__panel', open ? 'theme-webgl-toolkit__panel--open' : '']
        .filter(Boolean)
        .join(' ')}
      aria-labelledby="webgl-lcl-title"
      aria-label="LCL, layered content layout"
    >
      <div className="theme-webgl-toolkit__chrome">
        <header className="theme-webgl-toolkit__titlebar">
          <h2 id="webgl-lcl-title" className="theme-webgl-toolkit__title">
            LCL constructor
          </h2>
          <div className="theme-webgl-toolkit__title-spacer" aria-hidden />
          {onOpenChange ? (
            <IconButton
              icon={open ? ChevronUp : ChevronDown}
              aria-label={open ? 'Collapse LCL' : 'Expand LCL'}
              size="xs"
              variant="ghost"
              onClick={() => onOpenChange(!open)}
            />
          ) : null}
        </header>
      </div>
      {open ? (
        <>
          <div className="theme-webgl-toolkit__viewport theme-webgl-toolkit__viewport--lcl">
            <LclViewportSelector open />
          </div>
          <div className="theme-webgl-toolkit__lcl-layouts" aria-label="LCL layouts">
            <div className="theme-webgl-toolkit__ribbon-col">
              <span className="theme-webgl-toolkit__ribbon-col-label type-caption type-muted">Layout</span>
              <MenuButton
                label={layout.label}
                icon={Layers}
                iconDropdown
                items={LCL_LAYOUTS.map((item) => ({
                  id: item.id,
                  label: item.label,
                  detail: lclLayoutMenuDetail(item),
                }))}
                selectedId={layoutId}
                onSelect={(id) => void selectLayout(id)}
                size="xs"
                menuSize="compact"
                portal
                variant="tray"
              />
            </div>
            <LclFeatureChips
              features={layout.features}
              listRef={(node) => {
                chipsRef.current = node
              }}
            />
          </div>
          <Preview key={layoutId} ref={previewRef} />
        </>
      ) : null}
    </section>
  )
}
