import {
  Files,
  Eye,
  FileCode,
  FilePlus2,
  Map as MapIcon,
  Play,
  Search,
  Table2,
  TerminalSquare,
  WrapText,
} from 'lucide-react'
import { useMemo, type ReactNode } from 'react'
import {
  type CodeEditorAltView,
  type CodeEditorAlternateFileKind,
} from '../../lib/codeEditor/alternateView'
import { CODE_LANGUAGE_OPTIONS } from '../../lib/codeEditor/languageFromPath'
import {
  codingLanguageDisplayLabel,
  normalizeCodingLanguages,
  resolveCodingLanguageForFile,
} from '../../lib/interviewBrief/codingLanguages'
import { Button } from '../Button'
import { Counter } from '../Counter'
import { IconButton } from '../IconButton'
import { MenuButton } from '../MenuButton'
import { ThemeScroll } from '../ThemeScroll'
import { ToolbarModeGroup } from '../ToolbarModeGroup'
import { Tooltip } from '../Tooltip'
import { CodeEditorFileMenu, type CodeEditorFileAction } from './CodeEditorFileMenu'
import type { CodeEditorSidebarView } from './CodeEditorSidebar'
import { EditorExportMenu } from '../editorContextParts/EditorExportMenu'
import { EditorHistoryTray } from '../editorContextParts/EditorHistoryTray'
import { EditorSaveTray } from '../editorContextParts/EditorSaveTray'
import { EditorTitlebar } from '../editorContextParts/EditorTitlebar'
import { EditorTitleField } from '../editorContextParts/EditorTitleField'

type LanguageMenuItem = { id: string; label: string }

type CodeEditorToolbarProps = {
  title: string
  onTitleChange: (value: string) => void
  hasActiveFile: boolean
  hasDirty: boolean
  language: string
  onLanguageChange: (id: string) => void
  /** Active file path — used with `allowedLanguages` to pick the coding catalog selection. */
  activeFilePath?: string
  /** Coding-task language ids — when non-empty, section chrome only lists these. */
  allowedLanguages?: readonly string[]
  fontSize: number
  onFontSizeChange: (size: number) => void
  wordWrap: boolean
  onToggleWordWrap: () => void
  minimap: boolean
  onToggleMinimap: () => void
  sidebarOpen: boolean
  sidebarView: CodeEditorSidebarView
  onSelectSidebarView: (view: CodeEditorSidebarView) => void
  terminalOpen: boolean
  onToggleTerminal: () => void
  onUndo: () => void
  onRedo: () => void
  onRun: () => void
  runBusy?: boolean
  onFileAction: (id: CodeEditorFileAction) => void
  onSave: () => void
  onExport: (formatId: string) => void
  alternateFileKind: CodeEditorAlternateFileKind
  altView: CodeEditorAltView
  onAltViewChange: (view: CodeEditorAltView) => void
  /**
   * `section` — Creator / gate embed: no File cascade · Save · Export · title;
   * history sits in the tools row; New file sits beside Explorer; Run is a labeled green action on the right.
   */
  chrome?: 'full' | 'section'
  /** Disables File mutate actions (new / rename / upload / delete). */
  readOnly?: boolean
}

function Tip({ label, children }: { label: string; children: ReactNode }) {
  return <Tooltip content={label}>{children}</Tooltip>
}

function resolveLanguageMenuItems(allowed?: readonly string[]): LanguageMenuItem[] {
  const restricted = normalizeCodingLanguages(allowed ?? [])
  if (!restricted.length) {
    return CODE_LANGUAGE_OPTIONS.map((o) => ({ id: o.id, label: o.label }))
  }
  return restricted.map((id) => ({
    id,
    label: codingLanguageDisplayLabel(id),
  }))
}

export function CodeEditorToolbar({
  title,
  onTitleChange,
  hasActiveFile,
  hasDirty,
  language,
  onLanguageChange,
  activeFilePath,
  allowedLanguages,
  fontSize,
  onFontSizeChange,
  wordWrap,
  onToggleWordWrap,
  minimap,
  onToggleMinimap,
  sidebarOpen,
  sidebarView,
  onSelectSidebarView,
  terminalOpen,
  onToggleTerminal,
  onUndo,
  onRedo,
  onRun,
  runBusy = false,
  onFileAction,
  onSave,
  onExport,
  alternateFileKind,
  altView,
  onAltViewChange,
  chrome = 'full',
  readOnly = false,
}: CodeEditorToolbarProps) {
  const codeModeActive = altView === 'code'
  const hasAltFile = alternateFileKind !== null
  const sectionChrome = chrome === 'section'
  const historyTray = <EditorHistoryTray onUndo={onUndo} onRedo={onRedo} />
  const languageItems = useMemo(
    () => resolveLanguageMenuItems(sectionChrome ? allowedLanguages : undefined),
    [allowedLanguages, sectionChrome],
  )
  const selectedLanguageId = useMemo(() => {
    if (!sectionChrome || !allowedLanguages?.length) return language
    return (
      resolveCodingLanguageForFile(activeFilePath ?? '', language, allowedLanguages) ?? language
    )
  }, [activeFilePath, allowedLanguages, language, sectionChrome])
  const languageLabel =
    languageItems.find((o) => o.id === selectedLanguageId)?.label ??
    CODE_LANGUAGE_OPTIONS.find((o) => o.id === selectedLanguageId)?.label ??
    codingLanguageDisplayLabel(selectedLanguageId)

  return (
    <div
      className={[
        'theme-code-editor__chrome',
        sectionChrome ? 'theme-code-editor__chrome--section' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {sectionChrome ? null : (
        <EditorTitlebar
          className="theme-code-editor__titlebar"
          fileMenu={
            <CodeEditorFileMenu
              onAction={onFileAction}
              hasActiveFile={hasActiveFile}
              hasDirty={hasDirty}
              readOnly={readOnly}
            />
          }
          historyTray={historyTray}
          titleBlock={
            <EditorTitleField
              value={title}
              onChange={onTitleChange}
              placeholder="Untitled workspace"
              aria-label="Workspace title"
            />
          }
          saveTray={<EditorSaveTray onSave={onSave} label="Save workspace" />}
          exportMenu={<EditorExportMenu kind="code" onExport={onExport} />}
        />
      )}

      <div
        className={[
          'theme-code-editor__tools',
          sectionChrome ? 'theme-code-editor__tools--section' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <ThemeScroll axis="horizontal" rail="nano" className="theme-code-editor__tools-scroll">
          <div
            className={[
              'theme-code-editor__tools-inner',
              hasAltFile ? 'theme-code-editor__tools-inner--has-alt' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            role="toolbar"
            aria-label="Editor tools"
          >
            {sectionChrome ? (
              <>
                {historyTray}
                <span className="theme-code-editor__toolbar-divider" role="separator" aria-hidden />
              </>
            ) : null}

            <span
              className={[
                'theme-code-editor__toolbar-lane',
                'theme-code-editor__toolbar-alt',
                hasAltFile ? '' : 'theme-code-editor__toolbar-lane--collapsed',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-hidden={!hasAltFile}
            >
              <span className="theme-code-editor__toolbar-lane-clip">
              <span className="theme-code-editor__toolbar-lane-inner">
              <ToolbarModeGroup
                aria-label="CSV view"
                className={[
                  'theme-code-editor__toolbar-alt-group',
                  alternateFileKind === 'csv' ? '' : 'theme-code-editor__toolbar-alt-group--hidden',
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-hidden={alternateFileKind !== 'csv'}
              >
                <Tip label="Source">
                  <IconButton
                    icon={FileCode}
                    aria-label="CSV source"
                    aria-pressed={altView === 'code'}
                    size="xs"
                    variant="tray"
                    active={altView === 'code'}
                    onClick={() => onAltViewChange('code')}
                  />
                </Tip>
                <Tip label="Table">
                  <IconButton
                    icon={Table2}
                    aria-label="CSV table"
                    aria-pressed={altView === 'table'}
                    size="xs"
                    variant="tray"
                    active={altView === 'table'}
                    onClick={() => onAltViewChange('table')}
                  />
                </Tip>
              </ToolbarModeGroup>
              <ToolbarModeGroup
                aria-label="Markdown view"
                className={[
                  'theme-code-editor__toolbar-alt-group',
                  alternateFileKind === 'markdown' ? '' : 'theme-code-editor__toolbar-alt-group--hidden',
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-hidden={alternateFileKind !== 'markdown'}
              >
                <Tip label="Source">
                  <IconButton
                    icon={FileCode}
                    aria-label="Markdown source"
                    aria-pressed={altView === 'code'}
                    size="xs"
                    variant="tray"
                    active={altView === 'code'}
                    onClick={() => onAltViewChange('code')}
                  />
                </Tip>
                <Tip label="Preview">
                  <IconButton
                    icon={Eye}
                    aria-label="Markdown preview"
                    aria-pressed={altView === 'preview'}
                    size="xs"
                    variant="tray"
                    active={altView === 'preview'}
                    onClick={() => onAltViewChange('preview')}
                  />
                </Tip>
              </ToolbarModeGroup>
              <ToolbarModeGroup
                aria-label="PDF view"
                className={[
                  'theme-code-editor__toolbar-alt-group',
                  alternateFileKind === 'pdf' ? '' : 'theme-code-editor__toolbar-alt-group--hidden',
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-hidden={alternateFileKind !== 'pdf'}
              >
                <Tip label="Source">
                  <IconButton
                    icon={FileCode}
                    aria-label="PDF source"
                    aria-pressed={altView === 'code'}
                    size="xs"
                    variant="tray"
                    active={altView === 'code'}
                    onClick={() => onAltViewChange('code')}
                  />
                </Tip>
                <Tip label="Preview">
                  <IconButton
                    icon={Eye}
                    aria-label="PDF preview"
                    aria-pressed={altView === 'preview'}
                    size="xs"
                    variant="tray"
                    active={altView === 'preview'}
                    onClick={() => onAltViewChange('preview')}
                  />
                </Tip>
              </ToolbarModeGroup>
              </span>
              </span>
            </span>
            <span
              className={[
                'theme-code-editor__toolbar-divider',
                'theme-code-editor__toolbar-divider--alt',
                hasAltFile ? '' : 'theme-code-editor__toolbar-divider--collapsed',
              ]
                .filter(Boolean)
                .join(' ')}
              role="separator"
              aria-hidden={!hasAltFile}
            />
            <span
              className={[
                'theme-code-editor__toolbar-lane',
                'theme-code-editor__toolbar-code-tools',
                codeModeActive ? '' : 'theme-code-editor__toolbar-lane--collapsed',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-hidden={!codeModeActive}
            >
              <MenuButton
                size="xs"
                variant="tray"
                menuSize="compact"
                portal
                portalZIndex={1200}
                scrollRail="hidden"
                triggerLabelAnim={false}
                label={languageLabel}
                items={languageItems}
                selectedId={selectedLanguageId}
                onSelect={onLanguageChange}
                className="theme-code-editor__lang-menu"
              />
              <span className="theme-code-editor__toolbar-lane-clip">
              <span className="theme-code-editor__toolbar-lane-inner">
              <Tip label="Font size">
                <Counter
                  size="xs"
                  aria-label="Font size"
                  value={fontSize}
                  min={10}
                  max={24}
                  step={1}
                  onValueChange={onFontSizeChange}
                />
              </Tip>
              <span className="theme-code-editor__toolbar-divider" role="separator" aria-hidden />
              <Tip label="Word wrap">
                <IconButton
                  icon={WrapText}
                  aria-label="Word wrap"
                  size="xs"
                  variant="tray"
                  active={wordWrap}
                  onClick={onToggleWordWrap}
                />
              </Tip>
              <Tip label="Minimap">
                <IconButton
                  icon={MapIcon}
                  aria-label="Minimap"
                  size="xs"
                  variant="tray"
                  active={minimap}
                  onClick={onToggleMinimap}
                />
              </Tip>
              </span>
              </span>
            </span>
            <span
              className={[
                'theme-code-editor__toolbar-divider',
                'theme-code-editor__toolbar-divider--code-tools',
                codeModeActive ? '' : 'theme-code-editor__toolbar-divider--collapsed',
              ]
                .filter(Boolean)
                .join(' ')}
              role="separator"
              aria-hidden={!codeModeActive}
            />
            <span className="theme-code-editor__toolbar-trail">
            {sectionChrome ? (
              <Tip label="New file">
                <IconButton
                  icon={FilePlus2}
                  aria-label="New file"
                  size="xs"
                  variant="tray"
                  disabled={readOnly}
                  onClick={() => onFileAction('new')}
                />
              </Tip>
            ) : null}
            <ToolbarModeGroup aria-label="Side panel">
              <Tip label="Explorer">
                <IconButton
                  icon={Files}
                  aria-label="Explorer"
                  aria-pressed={sidebarOpen && sidebarView === 'files'}
                  size="xs"
                  variant="tray"
                  active={sidebarOpen && sidebarView === 'files'}
                  onClick={() => onSelectSidebarView('files')}
                />
              </Tip>
              <Tip label="Search">
                <IconButton
                  icon={Search}
                  aria-label="Search"
                  aria-pressed={sidebarOpen && sidebarView === 'search'}
                  size="xs"
                  variant="tray"
                  active={sidebarOpen && sidebarView === 'search'}
                  onClick={() => onSelectSidebarView('search')}
                />
              </Tip>
            </ToolbarModeGroup>
            {sectionChrome ? (
              <Tip label="Terminal">
                <IconButton
                  icon={TerminalSquare}
                  aria-label="Toggle terminal"
                  size="xs"
                  variant="tray"
                  active={terminalOpen}
                  onClick={onToggleTerminal}
                />
              </Tip>
            ) : (
              <>
                <Tip label={runBusy ? 'Running…' : 'Run'}>
                  <IconButton
                    icon={Play}
                    aria-label="Run"
                    size="xs"
                    variant="tray"
                    onClick={onRun}
                    disabled={runBusy}
                  />
                </Tip>
                <Tip label="Terminal">
                  <IconButton
                    icon={TerminalSquare}
                    aria-label="Toggle terminal"
                    size="xs"
                    variant="tray"
                    active={terminalOpen}
                    onClick={onToggleTerminal}
                  />
                </Tip>
              </>
            )}
            </span>
          </div>
        </ThemeScroll>
        {sectionChrome ? (
          <Button
            type="button"
            size="xs"
            variant="tray"
            icon={Play}
            iconPosition="left"
            labelAnim={false}
            className="theme-code-editor__run"
            aria-label="Run"
            disabled={runBusy}
            onClick={onRun}
          >
            {runBusy ? 'Running…' : 'Run'}
          </Button>
        ) : null}
      </div>
    </div>
  )
}
