import Editor, { type OnMount } from '@monaco-editor/react'
import type { ReactNode } from 'react'
import { resolveEditorLanguage } from '../../lib/codeEditor/languageFromPath'
import { monacoPathForWorkspace } from '../../lib/codeEditor/monacoModelPath'
import { alternateFileKindFromPath, type CodeEditorAltView } from '../../lib/codeEditor/alternateView'
import { useDeferredStageActive } from '../../lib/codeEditor/useDeferredStageActive'
import type { CodeFile } from '../../lib/codeEditor/workspace'
import { resolveThemePortalMount } from '../../lib/theme/themePortal'
import { CodeEditorCsvView } from './CodeEditorCsvView'
import { CodeEditorMarkdownPreview } from './CodeEditorMarkdownPreview'
import { CodeEditorPdfPreview } from './CodeEditorPdfPreview'

const OVERFLOW_HOST_ID = 'theme-code-editor-overflow-widgets'

function applyMonacoPortalTheme(
  el: HTMLElement,
  monacoTheme: string,
  wrap: Record<string, string | number | undefined>,
) {
  const themeClass = monacoTheme === 'vs-dark' ? 'vs-dark' : 'vs'
  el.classList.add('theme', 'theme-code-editor-overflow-widgets', 'monaco-editor', themeClass)
  el.classList.toggle('vs-dark', themeClass === 'vs-dark')
  el.classList.toggle('vs', themeClass === 'vs')
  for (const [key, value] of Object.entries(wrap)) {
    if (typeof value === 'string' && key.startsWith('--')) el.style.setProperty(key, value)
  }
}

function watchMonacoContextViews(
  monacoTheme: string,
  wrap: Record<string, string | number | undefined>,
) {
  if (typeof document === 'undefined') return
  const scan = () => {
    document.querySelectorAll('.context-view').forEach((node) => {
      applyMonacoPortalTheme(node as HTMLElement, monacoTheme, wrap)
    })
  }
  scan()
  if (document.body.dataset.vurifyMonacoCtxWatch === '1') return
  document.body.dataset.vurifyMonacoCtxWatch = '1'
  new MutationObserver(scan).observe(document.body, { childList: true })
}

/** Body host so hover/suggest/menu keep Monaco + theme tokens (same as doc-editor portals). */
function getOverflowWidgetsHost(monacoTheme: string): HTMLElement | undefined {
  if (typeof document === 'undefined') return undefined
  const mount = resolveThemePortalMount(null)
  const wrap = mount.wrapStyle as Record<string, string | number | undefined>
  const existing = document.getElementById(OVERFLOW_HOST_ID)
  if (existing) {
    applyMonacoPortalTheme(existing, monacoTheme, wrap)
    watchMonacoContextViews(monacoTheme, wrap)
    return existing
  }
  const el = document.createElement('div')
  el.id = OVERFLOW_HOST_ID
  applyMonacoPortalTheme(el, monacoTheme, wrap)
  mount.parent.appendChild(el)
  watchMonacoContextViews(monacoTheme, wrap)
  return el
}

type CodeEditorStagePaneProps = {
  active: boolean
  ariaHidden: boolean
  className?: string
  children: ReactNode
}

function CodeEditorStagePane({ active, ariaHidden, className = '', children }: CodeEditorStagePaneProps) {
  const showActive = useDeferredStageActive(active)

  return (
    <div
      className={[
        'theme-code-editor__stage-pane',
        showActive ? 'theme-code-editor__stage-pane--active' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-hidden={ariaHidden}
    >
      {children}
    </div>
  )
}

type CodeEditorStageFileProps = {
  file: CodeFile
  isActiveFile: boolean
  fileAltView: CodeEditorAltView
  monacoTheme: string
  fontSize: number
  wordWrap: boolean
  minimap: boolean
  onBufferChange: (fileId: string) => (value: string | undefined) => void
  onEditorMount: (fileId: string) => OnMount
  onSourceChange: (fileId: string, next: string) => void
  readOnly?: boolean
}

export function CodeEditorStageFile({
  file,
  isActiveFile,
  fileAltView,
  monacoTheme,
  fontSize,
  wordWrap,
  minimap,
  onBufferChange,
  onEditorMount,
  onSourceChange,
  readOnly = false,
}: CodeEditorStageFileProps) {
  const showActive = useDeferredStageActive(isActiveFile)
  const fileKind = alternateFileKindFromPath(file.path)
  const language = resolveEditorLanguage(file.path, file.language)

  return (
    <div
      className={[
        'theme-code-editor__stage-file',
        showActive ? 'theme-code-editor__stage-file--active' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-hidden={!isActiveFile}
    >
      <CodeEditorStagePane active={fileAltView === 'code'} ariaHidden={fileAltView !== 'code'}>
        <Editor
          height="100%"
                  path={monacoPathForWorkspace(file.path)}
          language={language}
          value={file.buffer}
          theme={monacoTheme}
          onChange={onBufferChange(file.id)}
          onMount={(ed, monaco) => {
            const model = ed.getModel()
            if (model && model.getLanguageId() !== language) monaco.editor.setModelLanguage(model, language)
            onEditorMount(file.id)(ed, monaco)
          }}
          options={{
            automaticLayout: true,
            fontSize,
            minimap: { enabled: minimap },
            wordWrap: wordWrap ? 'on' : 'off',
            scrollBeyondLastLine: false,
            tabSize: 2,
            padding: { top: 8 },
            readOnly: Boolean(readOnly),
            quickSuggestions: { other: true, comments: true, strings: true },
            suggestOnTriggerCharacters: true,
            acceptSuggestionOnCommitCharacter: true,
            acceptSuggestionOnEnter: 'on',
            tabCompletion: 'on',
            wordBasedSuggestions: 'allDocuments',
            snippetSuggestions: 'inline',
            parameterHints: { enabled: isActiveFile },
            hover: { enabled: isActiveFile ? 'on' : 'off' },
            autoClosingBrackets: 'languageDefined',
            autoClosingQuotes: 'languageDefined',
            autoSurround: 'languageDefined',
            fixedOverflowWidgets: true,
            overflowWidgetsDomNode: getOverflowWidgetsHost(monacoTheme),
          }}
          loading={<div className="theme-code-editor__loading type-caption">Loading editor…</div>}
        />
      </CodeEditorStagePane>
      {fileKind === 'csv' ? (
        <CodeEditorStagePane active={fileAltView === 'table'} ariaHidden={fileAltView !== 'table'}>
          <CodeEditorCsvView
            fileId={file.id}
            source={file.buffer}
            active={isActiveFile && fileAltView === 'table'}
            onSourceChange={
              readOnly ? () => undefined : (next) => onSourceChange(file.id, next)
            }
            readOnly={readOnly}
          />
        </CodeEditorStagePane>
      ) : null}
      {fileKind === 'markdown' ? (
        <CodeEditorStagePane active={fileAltView === 'preview'} ariaHidden={fileAltView !== 'preview'}>
          <CodeEditorMarkdownPreview
            fileId={file.id}
            source={file.buffer}
            active={isActiveFile && fileAltView === 'preview'}
          />
        </CodeEditorStagePane>
      ) : null}
      {fileKind === 'pdf' ? (
        <CodeEditorStagePane active={fileAltView === 'preview'} ariaHidden={fileAltView !== 'preview'}>
          <CodeEditorPdfPreview
            file={file}
            active={isActiveFile && fileAltView === 'preview'}
          />
        </CodeEditorStagePane>
      ) : null}
    </div>
  )
}
