/**
 * LCL viewport section selector — paint 64 cells on a 16:9 PC screen, copy sections.
 * Optional scene overlay (tags + Play motions) sits under the grid.
 */
import { useEffect, useMemo, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { Clapperboard, ClipboardCopy, Play, Plus, Square, Tag, Trash2, X } from 'lucide-react'
import { IconButton } from '../IconButton'
import { MenuButton, type MenuItem } from '../MenuButton'
import { ThemeScroll } from '../ThemeScroll'
import { Tooltip } from '../Tooltip'
import { WebglStage } from '../../lib/webgl/runtime/core/WebglStage'
import { WEBGL_SCENES, getWebglScene } from '../../lib/webgl/assets/sceneManifest'
import {
  SCENE_HOME_VIEW_ID,
  bakedSceneDoc,
  sceneViewpointMarks,
} from '../../lib/webgl/assets/sceneDoc'
import {
  LCL_GRID_CELLS,
  LCL_GRID_COLS,
  LCL_GRID_ROWS,
  LCL_VIEWPORT_SECTIONS_KIND,
  cellKey,
  parseCellKey,
  sectionFromCells,
  serializeLclViewportSections,
  type LclCell,
} from '../../lib/lcl/viewportSections'
import { SceneWorld } from './WebglScenePlayer'

type LclViewportSelectorProps = {
  open?: boolean
}

type DraftSection = {
  id: string
  label: string
  keys: string[]
}

function RibbonCol({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="theme-webgl-toolkit__ribbon-col">
      <span className="theme-webgl-toolkit__ribbon-col-label type-caption type-muted">{label}</span>
      <div className="theme-webgl-toolkit__ribbon-col-row">{children}</div>
    </div>
  )
}

function ToolbarTip({ content, children }: { content: string; children: ReactNode }) {
  return <Tooltip content={content}>{children}</Tooltip>
}

function nextSectionId(sections: readonly DraftSection[]): string {
  let n = sections.length + 1
  const used = new Set(sections.map((section) => section.id))
  while (used.has(`s${n}`)) n += 1
  return `s${n}`
}

function cellsFromKeys(keys: readonly string[]): LclCell[] {
  const cells: LclCell[] = []
  for (const key of keys) {
    const cell = parseCellKey(key)
    if (cell) cells.push(cell)
  }
  return cells
}

function emptyDraft(): DraftSection {
  return { id: 's1', label: 'Section 1', keys: [] }
}

const LCL_SCENE_NONE = 'none'

type LclSceneOverlayProps = {
  sceneId: string
  viewId: string
  flyTicket: number
  replayMotion: { id: string; ticket: number }
}

function LclSceneOverlay({ sceneId, viewId, flyTicket, replayMotion }: LclSceneOverlayProps) {
  const doc = bakedSceneDoc(sceneId)
  if ('error' in doc) return null
  return (
    <div className="theme-lcl-selector__scene" aria-hidden>
      <WebglStage active lockPageScroll={false}>
        <SceneWorld
          doc={doc}
          viewId={viewId}
          flyTicket={flyTicket}
          replayMotion={replayMotion}
          showViews
          orbitEnabled={false}
          acm={{ intensity: 0, lock: true }}
        />
      </WebglStage>
    </div>
  )
}

export function LclViewportSelector({ open = true }: LclViewportSelectorProps) {
  const [sections, setSections] = useState<DraftSection[]>(() => [emptyDraft()])
  const [activeId, setActiveId] = useState('s1')
  const [copied, setCopied] = useState(false)
  const [sceneId, setSceneId] = useState('')
  const [viewId, setViewId] = useState(SCENE_HOME_VIEW_ID)
  const [flyTicket, setFlyTicket] = useState(0)
  const [replayMotion, setReplayMotion] = useState({ id: '', ticket: 0 })
  const [tagId, setTagId] = useState('')
  const [motionId, setMotionId] = useState('')
  const paintMode = useRef<'add' | 'remove' | null>(null)
  useEffect(() => {
    const endPaint = () => {
      paintMode.current = null
    }
    window.addEventListener('pointerup', endPaint)
    window.addEventListener('pointercancel', endPaint)
    return () => {
      window.removeEventListener('pointerup', endPaint)
      window.removeEventListener('pointercancel', endPaint)
    }
  }, [])
  const cells = useMemo(
    () =>
      Array.from({ length: LCL_GRID_CELLS }, (_, index) => ({
        col: index % LCL_GRID_COLS,
        row: Math.floor(index / LCL_GRID_COLS),
      })),
    [],
  )
  const ownerByKey = useMemo(() => {
    const map = new Map<string, { id: string; tone: number }>()
    sections.forEach((section, index) => {
      for (const key of section.keys) map.set(key, { id: section.id, tone: index % 8 })
    })
    return map
  }, [sections])
  const items: MenuItem[] = sections.map((section) => ({ id: section.id, label: section.label }))
  const active = sections.find((section) => section.id === activeId) ?? sections[0]
  const overlayDoc = sceneId ? bakedSceneDoc(sceneId) : null
  const sceneDoc = overlayDoc && !('error' in overlayDoc) ? overlayDoc : null
  const sceneItems: MenuItem[] = useMemo(
    () => [{ id: LCL_SCENE_NONE, label: 'None' }, ...WEBGL_SCENES.map((row) => ({ id: row.id, label: row.label }))],
    [],
  )
  const tagItems: MenuItem[] = useMemo(() => {
    if (!sceneId) return []
    const doc = bakedSceneDoc(sceneId)
    if ('error' in doc) return []
    return sceneViewpointMarks(doc).map((mark) => ({ id: mark.id, label: mark.label }))
  }, [sceneId])
  const motionItems: MenuItem[] = useMemo(() => {
    if (!sceneId) return []
    const doc = bakedSceneDoc(sceneId)
    if ('error' in doc) return []
    return doc.cameraMotions.map((motion) => ({ id: motion.id, label: motion.label }))
  }, [sceneId])
  const sceneLabel = sceneId ? (getWebglScene(sceneId)?.label ?? 'Scene') : 'None'
  const tagLabel = tagItems.find((item) => item.id === tagId)?.label ?? 'Tags'
  const motionLabel = motionItems.find((item) => item.id === motionId)?.label ?? 'Animations'

  if (!open) return null

  function paintKey(key: string, mode: 'add' | 'remove') {
    setSections((prev) => {
      const current = prev.find((section) => section.id === activeId)
      if (!current) return prev
      return prev.map((section) => {
        if (mode === 'add') {
          if (section.id === activeId) {
            if (section.keys.includes(key)) return section
            return { ...section, keys: [...section.keys, key] }
          }
          if (!section.keys.includes(key)) return section
          return { ...section, keys: section.keys.filter((item) => item !== key) }
        }
        if (section.id !== activeId) return section
        return { ...section, keys: section.keys.filter((item) => item !== key) }
      })
    })
  }

  function onGridPointerUp() {
    paintMode.current = null
  }

  function onCellPointerDown(event: PointerEvent<HTMLButtonElement>, key: string) {
    event.preventDefault()
    const owned = ownerByKey.get(key)
    const mode = owned?.id === activeId ? 'remove' : 'add'
    paintMode.current = mode
    paintKey(key, mode)
  }

  function onCellPointerEnter(key: string) {
    if (!paintMode.current) return
    paintKey(key, paintMode.current)
  }

  function addSection() {
    const id = nextSectionId(sections)
    const label = `Section ${sections.length + 1}`
    setSections((prev) => [...prev, { id, label, keys: [] }])
    setActiveId(id)
    setCopied(false)
  }

  function clearActive() {
    setSections((prev) =>
      prev.map((section) => (section.id === activeId ? { ...section, keys: [] } : section)),
    )
    setCopied(false)
  }

  function clearAll() {
    setSections([emptyDraft()])
    setActiveId('s1')
    setCopied(false)
  }

  function copySections() {
    const painted = sections
      .filter((section) => section.keys.length > 0)
      .map((section) => sectionFromCells(section.id, section.label, cellsFromKeys(section.keys)))
    const json = serializeLclViewportSections({
      kind: LCL_VIEWPORT_SECTIONS_KIND,
      cols: LCL_GRID_COLS,
      rows: LCL_GRID_ROWS,
      sections: painted,
    })
    void navigator.clipboard?.writeText(json)
    setCopied(true)
  }

  function selectScene(id: string) {
    const next = id === LCL_SCENE_NONE ? '' : id
    setSceneId(next)
    setViewId(SCENE_HOME_VIEW_ID)
    setFlyTicket(0)
    setReplayMotion({ id: '', ticket: 0 })
    setTagId('')
    setMotionId('')
  }

  function goToTag(id: string) {
    setTagId(id)
    setViewId(id)
    setFlyTicket((n) => n + 1)
    setReplayMotion({ id: '', ticket: 0 })
  }

  function playMotion(id: string) {
    if (sceneDoc) {
      const motion = sceneDoc.cameraMotions.find((row) => row.id === id)
      if (motion) setViewId(motion.to)
    }
    setMotionId(id)
    setReplayMotion((prev) => ({ id, ticket: prev.ticket + 1 }))
  }

  return (
    <div
      className="theme-lcl-selector"
      onPointerUp={onGridPointerUp}
      onPointerCancel={onGridPointerUp}
    >
      <div className="theme-webgl-toolkit__ribbon">
        <ThemeScroll axis="horizontal" rail="nano" className="theme-webgl-toolkit__ribbon-scroll">
          <div className="theme-webgl-toolkit__ribbon-inner" role="toolbar" aria-label="LCL constructor">
            <RibbonCol label="Scene">
              <MenuButton
                label={sceneLabel}
                icon={Clapperboard}
                iconDropdown
                items={sceneItems}
                selectedId={sceneId || LCL_SCENE_NONE}
                onSelect={selectScene}
                size="xs"
                menuSize="compact"
                portal
                variant="tray"
              />
            </RibbonCol>
            <RibbonCol label="Tags">
              <MenuButton
                label={tagLabel}
                icon={Tag}
                iconDropdown
                items={tagItems}
                selectedId={tagId}
                onSelect={goToTag}
                disabled={!tagItems.length}
                size="xs"
                menuSize="compact"
                portal
                variant="tray"
              />
            </RibbonCol>
            <RibbonCol label="Animations">
              <MenuButton
                label={motionLabel}
                icon={Play}
                iconDropdown
                items={motionItems}
                selectedId={motionId}
                onSelect={playMotion}
                disabled={!motionItems.length}
                size="xs"
                menuSize="compact"
                portal
                variant="tray"
              />
            </RibbonCol>
            <RibbonCol label="Section">
              <MenuButton
                label={active?.label ?? 'Section 1'}
                icon={Square}
                iconDropdown
                items={items}
                selectedId={activeId}
                onSelect={setActiveId}
                size="xs"
                menuSize="compact"
                portal
                variant="tray"
              />
              <ToolbarTip content="Start another section — paint a different set of squares.">
                <IconButton
                  icon={Plus}
                  aria-label="New section"
                  size="xs"
                  variant="ghost"
                  onClick={addSection}
                />
              </ToolbarTip>
              <ToolbarTip content="Clear the painted squares on the current section.">
                <IconButton
                  icon={X}
                  aria-label="Clear section"
                  size="xs"
                  variant="ghost"
                  onClick={clearActive}
                />
              </ToolbarTip>
              <ToolbarTip content="Clear all sections — back to one empty Section 1.">
                <IconButton
                  icon={Trash2}
                  aria-label="Clear all"
                  size="xs"
                  variant="ghost"
                  onClick={clearAll}
                />
              </ToolbarTip>
            </RibbonCol>
            <RibbonCol label="Copy">
              <ToolbarTip content="Copy sections — viewport fractions for the painted blocks. Paste to chat.">
                <IconButton
                  icon={ClipboardCopy}
                  aria-label={copied ? 'Copied sections' : 'Copy sections'}
                  size="xs"
                  variant="ghost"
                  onClick={copySections}
                />
              </ToolbarTip>
            </RibbonCol>
          </div>
        </ThemeScroll>
      </div>
      <div className="theme-lcl-selector__stage">
        <div
          className="theme-lcl-selector__screen"
          data-scene={sceneId ? 'true' : undefined}
          aria-label="PC screen viewport"
        >
          {sceneId ? (
            <LclSceneOverlay
              key={sceneId}
              sceneId={sceneId}
              viewId={viewId}
              flyTicket={flyTicket}
              replayMotion={replayMotion}
            />
          ) : null}
          <div className="theme-lcl-selector__grid" role="grid" aria-label="Viewport cells">
            {cells.map((cell) => {
              const key = cellKey(cell.col, cell.row)
              const owner = ownerByKey.get(key)
              return (
                <button
                  key={key}
                  type="button"
                  className="theme-lcl-selector__cell"
                  role="gridcell"
                  aria-label={`Cell ${cell.col}, ${cell.row}`}
                  aria-pressed={owner?.id === activeId}
                  data-tone={owner ? String(owner.tone) : undefined}
                  data-active={owner?.id === activeId ? 'true' : undefined}
                  onPointerDown={(event) => onCellPointerDown(event, key)}
                  onPointerEnter={() => onCellPointerEnter(key)}
                />
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
