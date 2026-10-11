import { memo, useCallback, useEffect, useMemo, useRef, useState, startTransition } from 'react'
import { Download, FilePlus2, Upload } from 'lucide-react'
import { FlowEditor, type FlowEditorHandle } from './FlowEditor'
import { Button } from './Button'
import { Tag } from './Tag'
import { ThemeScroll } from './ThemeScroll'
import type { FlowDocument } from '../lib/flowEditor/types'
import {
  PLANNER_RELATION_OPTIONS,
  analyzeWebsitePlan,
  clearWebsitePlanDraft,
  createBlankWebsitePlan,
  createHomeScenePlan,
  createWebsitePlanDraft,
  downloadWebsitePlanJson,
  ensureWebsitePlannerToolkit,
  loadWebsitePlanDraft,
  parseWebsitePlanDraft,
  saveWebsitePlanDraft,
  type PlanCoverageReport,
  type WebsitePlanDraft,
} from '../lib/websitePlanner'

ensureWebsitePlannerToolkit()

type WebsitePlannerProps = {
  className?: string
  /** When false, skip localStorage (tests / embeds). Default true. */
  persist?: boolean
  /**
   * First-mount seed:
   * - `home-scene` — wipe draft + open the initial Home Page Scene plan
   * - `blank` — wipe draft + empty canvas
   * - `saved` — restore current local draft if present
   */
  initialStarter?: 'home-scene' | 'blank' | 'saved'
}

function initialDraft(
  persist: boolean,
  initialStarter: WebsitePlannerProps['initialStarter'],
): WebsitePlanDraft {
  if (initialStarter === 'home-scene') {
    if (persist) clearWebsitePlanDraft()
    return createWebsitePlanDraft('Home Page Scene plan', createHomeScenePlan())
  }
  if (initialStarter === 'blank') {
    if (persist) clearWebsitePlanDraft()
    return createWebsitePlanDraft('Untitled website plan', createBlankWebsitePlan())
  }
  if (persist) {
    const saved = loadWebsitePlanDraft()
    if (saved) return saved
  }
  return createWebsitePlanDraft('Untitled website plan', createBlankWebsitePlan())
}

function CoverageList({
  title,
  items,
  empty,
}: {
  title: string
  items: { id: string; label: string; meta?: string }[]
  empty: string
}) {
  return (
    <section className="theme-website-planner__coverage-sector">
      <div className="theme-website-planner__coverage-sector-head">
        <p className="type-caption type-accent mb-0">{title}</p>
        <span className="type-caption type-tabular type-muted">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="type-caption type-muted mb-0">{empty}</p>
      ) : (
        <ul className="theme-website-planner__coverage-list">
          {items.map((item) => (
            <li key={item.id} className="theme-website-planner__coverage-item">
              <span className="type-label">{item.label}</span>
              {item.meta ? <span className="type-caption type-muted">{item.meta}</span> : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function CoveragePanel({ report }: { report: PlanCoverageReport }) {
  return (
    <aside className="theme-website-planner__coverage" aria-label="Plan coverage">
      <div className="theme-website-planner__coverage-head">
        <p className="type-label mb-0">Plan overview</p>
        <p className="type-caption type-muted mb-0">
          Surface inventory — advisory gaps, not a full architecture review.
        </p>
      </div>
      <ThemeScroll axis="vertical" rail="nano" className="theme-website-planner__coverage-scroll">
        <div className="theme-website-planner__coverage-body">
          <CoverageList
            title="Pages"
            empty="No page nodes yet"
            items={report.pages.map((p) => ({ id: p.id, label: p.label, meta: p.status }))}
          />
          <CoverageList
            title="Backend systems"
            empty="No catalog systems linked"
            items={report.systems.map((s) => ({
              id: s.id,
              label: s.label,
              meta: s.systemId ?? s.status,
            }))}
          />
          <CoverageList
            title="Integrations"
            empty="No external services"
            items={report.integrations.map((i) => ({ id: i.id, label: i.label, meta: i.status }))}
          />
          <CoverageList
            title="Missing / blocked"
            empty="No gaps marked"
            items={report.missing.map((m) => ({ id: m.id, label: m.label, meta: m.status }))}
          />
          <CoverageList
            title="Implementation order"
            empty="Add steps or pages to sketch an order"
            items={report.implementationOrder.map((s) => ({
              id: s.id,
              label: s.label,
              meta: s.phase,
            }))}
          />
          <CoverageList
            title="Disconnected"
            empty="All planner nodes are linked"
            items={report.disconnected.map((d) => ({ id: d.id, label: d.label }))}
          />
          {report.issues.length > 0 ? (
            <section className="theme-website-planner__coverage-sector">
              <div className="theme-website-planner__coverage-sector-head">
                <p className="type-caption type-accent mb-0">Flags</p>
                <span className="type-caption type-tabular type-muted">{report.issues.length}</span>
              </div>
              <ul className="theme-website-planner__coverage-list">
                {report.issues.map((issue) => (
                  <li key={issue.id} className="theme-website-planner__coverage-issue">
                    <Tag size="xs">{issue.severity}</Tag>
                    <span className="type-caption">{issue.message}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <section className="theme-website-planner__coverage-sector">
            <p className="type-caption type-accent mb-2">Relation labels</p>
            <div className="theme-website-planner__relation-chips">
              {PLANNER_RELATION_OPTIONS.map((relation) => (
                <Tag key={relation} size="xs">
                  {relation}
                </Tag>
              ))}
            </div>
            <p className="type-caption type-muted mb-0 mt-2">
              Set these on connector labels in the inspector.
            </p>
          </section>
        </div>
      </ThemeScroll>
    </aside>
  )
}

const MemoCoveragePanel = memo(CoveragePanel)

export function WebsitePlanner({
  className = '',
  persist = true,
  initialStarter = 'home-scene',
}: WebsitePlannerProps) {
  const editorRef = useRef<FlowEditorHandle>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState<WebsitePlanDraft>(() =>
    initialDraft(persist, initialStarter),
  )
  const [editorKey, setEditorKey] = useState(0)
  const [coverageFlow, setCoverageFlow] = useState(draft.flow)
  const coverageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (coverageTimerRef.current) clearTimeout(coverageTimerRef.current)
    coverageTimerRef.current = setTimeout(() => {
      startTransition(() => setCoverageFlow(draft.flow))
    }, 120)
    return () => {
      if (coverageTimerRef.current) clearTimeout(coverageTimerRef.current)
    }
  }, [draft.flow])

  const report = useMemo(() => analyzeWebsitePlan(coverageFlow), [coverageFlow])

  const persistDraft = useCallback(
    (next: WebsitePlanDraft) => {
      setDraft(next)
      if (persist) saveWebsitePlanDraft(next)
    },
    [persist],
  )

  const handleDocumentChange = useCallback(
    (flow: FlowDocument) => {
      persistDraft(createWebsitePlanDraft(draft.title, flow))
    },
    [draft.title, persistDraft],
  )

  const handleTitleChange = useCallback(
    (title: string) => {
      persistDraft(createWebsitePlanDraft(title, draft.flow))
    },
    [draft.flow, persistDraft],
  )

  const clearCanvas = useCallback(
    () => {
      if (persist) clearWebsitePlanDraft()
      persistDraft(createWebsitePlanDraft('Untitled website plan', createBlankWebsitePlan()))
      setEditorKey((k) => k + 1)
    },
    [persist, persistDraft],
  )

  const handleExportJson = useCallback(() => {
    downloadWebsitePlanJson(createWebsitePlanDraft(draft.title, draft.flow))
  }, [draft.flow, draft.title])

  const handleImportFile = useCallback(
    async (file: File | null) => {
      if (!file) return
      const text = await file.text()
      const parsed = parseWebsitePlanDraft(text)
      if (!parsed) {
        console.error('[WebsitePlanner] Invalid website-plan JSON')
        return
      }
      persistDraft(parsed)
      setEditorKey((k) => k + 1)
    },
    [persistDraft],
  )

  return (
    <div className={['theme-website-planner', className].filter(Boolean).join(' ')}>
      <div className="theme-website-planner__toolbar">
        <div className="theme-website-planner__toolbar-actions">
          <Button size="xs" variant="tray" onClick={clearCanvas}>
            <FilePlus2 size={14} strokeWidth={2} aria-hidden />
            Clear canvas
          </Button>
          <Button size="xs" variant="ghost" onClick={() => fileInputRef.current?.click()}>
            <Upload size={14} strokeWidth={2} aria-hidden />
            Import JSON
          </Button>
          <Button size="xs" variant="ghost" onClick={handleExportJson}>
            <Download size={14} strokeWidth={2} aria-hidden />
            Export JSON
          </Button>
        </div>
        <p className="type-caption type-muted mb-0 theme-website-planner__toolbar-hint">
          Local draft autosaves in this browser. Cursor can author/import plan JSON — no in-app AI.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          aria-label="Import website plan JSON"
          onChange={(e) => {
            void handleImportFile(e.target.files?.[0] ?? null)
            e.target.value = ''
          }}
        />
      </div>

      <div className="theme-website-planner__workspace">
        <FlowEditor
          key={editorKey}
          ref={editorRef}
          toolkit="website-plan"
          flow={draft.flow}
          initialTitle={draft.title}
          onDocumentChange={handleDocumentChange}
          onTitleChange={handleTitleChange}
          className="theme-website-planner__editor theme-flow-editor--showcase theme-flow-editor--website-planner"
        />
        <MemoCoveragePanel report={report} />
      </div>
    </div>
  )
}
