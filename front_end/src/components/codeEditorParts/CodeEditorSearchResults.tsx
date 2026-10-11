import { basename } from '../../lib/codeEditor/workspace'
import { ThemeScroll } from '../ThemeScroll'
import { CodeEditorSearchHitRow } from './CodeEditorSearchHitRow'

export type CodeEditorSearchResultHit = {
  line: number
  column: number
  preview: string
  active?: boolean
}

export type CodeEditorSearchResultGroup = {
  key: string
  path: string
  hits: readonly CodeEditorSearchResultHit[]
  onHitClick: (hit: CodeEditorSearchResultHit, index: number) => void
}

type CodeEditorSearchResultsProps = {
  groups: readonly CodeEditorSearchResultGroup[]
  emptyMessage: string
}

export function CodeEditorSearchResults({ groups, emptyMessage }: CodeEditorSearchResultsProps) {
  return (
    <ThemeScroll axis="vertical" rail="nano" className="theme-code-editor__search-scroll">
      {groups.length === 0 ? (
        <p className="theme-code-editor__search-empty type-caption type-muted" role="status">
          {emptyMessage}
        </p>
      ) : (
        <ul className="theme-code-editor__search-file-list" role="list">
          {groups.map((group) => (
            <li
              key={group.key}
              className="theme-code-editor__search-file-group"
              role="listitem"
            >
              <div
                className="theme-code-editor__search-file-label type-caption"
                title={group.path}
              >
                <span className="theme-code-editor__search-file-name">{basename(group.path)}</span>
                <span className="theme-code-editor__search-file-count tabular-nums">
                  {group.hits.length}
                </span>
              </div>
              <ul className="theme-code-editor__search-hit-list" role="list">
                {group.hits.map((hit, index) => (
                  <CodeEditorSearchHitRow
                    key={`${hit.line}:${hit.column}:${index}`}
                    preview={hit.preview}
                    line={hit.line}
                    column={hit.column}
                    active={hit.active}
                    onClick={() => group.onHitClick(hit, index)}
                  />
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </ThemeScroll>
  )
}
