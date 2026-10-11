import { X } from 'lucide-react'
import { ThemeScroll } from '../ThemeScroll'
import { basename, isDirty, type CodeFile } from '../../lib/codeEditor/workspace'

type CodeEditorTabBarProps = {
  files: readonly CodeFile[]
  openIds: readonly string[]
  activeId: string | null
  onSelect: (id: string) => void
  onClose: (id: string) => void
}

export function CodeEditorTabBar({
  files,
  openIds,
  activeId,
  onSelect,
  onClose,
}: CodeEditorTabBarProps) {
  const tabs = openIds
    .map((id) => files.find((f) => f.id === id))
    .filter((f): f is CodeFile => Boolean(f))

  if (tabs.length === 0) return null

  const activePath = activeId ? files.find((f) => f.id === activeId)?.path : undefined

  return (
    <div className="theme-code-editor__tabs">
      <ThemeScroll axis="horizontal" rail="nano" className="theme-code-editor__tabs-scroll">
        <div className="theme-code-editor__tabs-inner" role="tablist" aria-label="Open files">
          {tabs.map((file) => {
            const active = file.id === activeId
            const dirty = isDirty(file)
            return (
              <div
                key={file.id}
                className={[
                  'theme-code-editor__tab',
                  active ? 'theme-code-editor__tab--active' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                role="tab"
                aria-selected={active}
                data-code-path={file.path}
              >
                <button
                  type="button"
                  className="theme-code-editor__tab-label type-caption"
                  onClick={() => onSelect(file.id)}
                  title={file.path}
                  data-code-path={file.path}
                >
                  {basename(file.path)}
                  {dirty ? <span className="theme-code-editor__dirty">●</span> : null}
                </button>
                <button
                  type="button"
                  className="theme-code-editor__tab-close"
                  aria-label={`Close ${basename(file.path)}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    onClose(file.id)
                  }}
                >
                  <X aria-hidden strokeWidth={2} />
                </button>
              </div>
            )
          })}
        </div>
      </ThemeScroll>
      {activePath ? (
        <div className="theme-code-editor__breadcrumb type-caption type-muted">
          <span className="theme-code-editor__breadcrumb-sep" aria-hidden>
            —
          </span>
          <span className="theme-code-editor__breadcrumb-path">{activePath}</span>
        </div>
      ) : null}
    </div>
  )
}
