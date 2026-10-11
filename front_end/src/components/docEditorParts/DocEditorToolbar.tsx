import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from 'react'
import { createPortal } from 'react-dom'
import { resolveThemePortalMount } from '../../lib/theme/themePortal'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  $getNodeByKey,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isRootOrShadowRoot,
  $isTextNode,
  $createParagraphNode,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  INDENT_CONTENT_COMMAND,
  OUTDENT_CONTENT_COMMAND,
  UNDO_COMMAND,
  REDO_COMMAND,
  CAN_UNDO_COMMAND,
  CAN_REDO_COMMAND,
  COMMAND_PRIORITY_CRITICAL,
  type ElementFormatType,
  type TextFormatType,
} from 'lexical'
import { $isHeadingNode, $createHeadingNode, $createQuoteNode, type HeadingTagType } from '@lexical/rich-text'
import { $setBlocksType, $getSelectionStyleValueForProperty, $patchStyleText } from '@lexical/selection'
import { $findMatchingParent, mergeRegister } from '@lexical/utils'
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  INSERT_CHECK_LIST_COMMAND,
  REMOVE_LIST_COMMAND,
  $isListNode,
  ListNode,
} from '@lexical/list'
import { $createCodeNode, $isCodeNode, normalizeCodeLanguage } from '@lexical/code'
import { $isLinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link'
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  CaseLower,
  CaseSensitive,
  CaseUpper,
  CheckSquare,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Indent,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Outdent,
  PaintBucket,
  Pilcrow,
  Quote,
  RemoveFormatting,
  Scissors,
  Strikethrough,
  Subscript,
  Superscript,
  Table,
  Type,
  Underline,
} from 'lucide-react'
import { IconButton } from '../IconButton'
import { Counter } from '../Counter'
import { MenuButton } from '../MenuButton'
import { ToolbarModeGroup } from '../ToolbarModeGroup'
import { ToolbarControlTray } from '../ToolbarControlTray'
import { ThemeScroll } from '../ThemeScroll'
import { Tooltip } from '../Tooltip'
import { ColorSelector, cssColorToHex } from '../ColorSelector'
import {
  docEditorInsertMenuButtonItems,
  docEditorInsertUsesModal,
  DOC_EDITOR_INSERT_ICONS,
  isDocEditorAssessmentInsertExcluded,
  runDocEditorInsertMenuAction,
} from '../../lib/docEditor/insertRegistry'
import { useDocEditorInsertModal } from '../../lib/docEditor/docEditorInsertModalContext'
import type { DocEditorInsertModalKind } from '../../lib/docEditor/docEditorInsertModalTypes'
import { useDocEditorLinkEdit } from '../../lib/docEditor/docEditorLinkEditContext'
import { openDocEditorLinkEdit } from '../../lib/docEditor/openDocEditorLink'
import {
  PAGE_SIZE_TOOLBAR_ITEMS,
  pageSizeTriggerLabel,
  type PageSetup,
} from '../../lib/docEditor/pageSetup'
import { resolveToolbarFontSizePx } from '../../lib/docEditor/toolbarFontSize'
import {
  insertHorizontalRule,
  insertPageBreak,
  insertTable,
} from '../../lib/docEditor/insertActions'
import {
  CODE_LANGUAGE_MENU_ITEMS,
  codeLanguageDisplayLabel,
} from '../../lib/docEditor/codeLanguageLabel'
import { EditorExportMenu } from '../editorContextParts/EditorExportMenu'
import { EditorHistoryTray } from '../editorContextParts/EditorHistoryTray'
import { EditorSaveTray } from '../editorContextParts/EditorSaveTray'
import { EditorTitlebar } from '../editorContextParts/EditorTitlebar'
import { EditorTitleField } from '../editorContextParts/EditorTitleField'
import { EditorTitleRefresh } from '../editorContextParts/EditorTitleRefresh'
import { DocEditorFileMenu, type DocEditorFileAction } from './DocEditorFileMenu'

type DocEditorToolbarProps = {
  documentTitle: string
  onDocumentTitleChange: (title: string) => void
  pageSetup: PageSetup
  onPageSetupChange: (setup: PageSetup) => void
  onSave: () => void
  onExport: (formatId: string) => void
  onRefresh: () => void
  onFileAction: (id: DocEditorFileAction) => void
  /**
   * `section` — Lexical history tray + formatting ribbon (no file/save/export titlebar).
   * `preview` — hide all chrome (collapsed timeline mini).
   */
  chrome?: 'full' | 'section' | 'preview'
  /** Hide format/insert ribbon + section history; keep full titlebar for viewing. */
  readOnly?: boolean
}

const BLOCK_TYPES = [
  { value: 'paragraph', label: 'Paragraph', icon: Pilcrow },
  { value: 'h1', label: 'Heading 1', icon: Heading1 },
  { value: 'h2', label: 'Heading 2', icon: Heading2 },
  { value: 'h3', label: 'Heading 3', icon: Heading3 },
  { value: 'bullet', label: 'Bullet list', icon: List },
  { value: 'number', label: 'Numbered list', icon: ListOrdered },
  { value: 'check', label: 'Check list', icon: CheckSquare },
  { value: 'quote', label: 'Blockquote', icon: Quote },
] as const

type BlockType = (typeof BLOCK_TYPES)[number]['value'] | 'code'

const FONT_SIZES = ['12px', '14px', '16px', '18px', '20px', '24px', '30px', '32px', '36px', '48px', '72px'] as const

const FONT_SIZE_STEPS = FONT_SIZES.map((size) => parseInt(size, 10))


function ColorPopover({
  value,
  onChange,
  onClose,
  anchorRef,
  label,
}: {
  value: string
  onChange: (color: string) => void
  onClose: () => void
  anchorRef: RefObject<HTMLElement | null>
  label: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [sessionColor, setSessionColor] = useState(() => cssColorToHex(value))
  const [portalThemeStyle, setPortalThemeStyle] = useState<CSSProperties>({})

  const handleColorChange = useCallback(
    (color: string) => {
      const next = cssColorToHex(color)
      setSessionColor(next)
      onChange(next)
    },
    [onChange],
  )

  useLayoutEffect(() => {
    setPortalThemeStyle(resolveThemePortalMount(anchorRef.current).wrapStyle)
  }, [anchorRef])

  useLayoutEffect(() => {
    const popover = ref.current
    const anchor = anchorRef.current
    if (!popover || !anchor) return

    const position = () => {
      const nextPopover = ref.current
      const nextAnchor = anchorRef.current
      if (!nextPopover || !nextAnchor) return
      const rect = nextAnchor.getBoundingClientRect()
      nextPopover.style.top = `${rect.bottom + 4}px`
      nextPopover.style.left = `${rect.left}px`
    }

    position()
    window.addEventListener('scroll', position, true)
    window.addEventListener('resize', position)
    return () => {
      window.removeEventListener('scroll', position, true)
      window.removeEventListener('resize', position)
    }
  }, [anchorRef])

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node
      if (ref.current?.contains(target)) return
      if (anchorRef.current?.contains(target)) return
      onClose()
    }
    const id = window.setTimeout(() => {
      document.addEventListener('pointerdown', handlePointerDown)
      document.addEventListener('keydown', handleEscape)
    }, 0)
    return () => {
      window.clearTimeout(id)
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [anchorRef, onClose])

  return createPortal(
    <div className="theme" style={portalThemeStyle}>
      <div
        ref={ref}
        className="theme-doc-editor__color-popover theme-doc-editor__color-popover--portal"
        role="dialog"
        aria-label={label}
        style={{ zIndex: 1200 }}
      >
        <ColorSelector
          className="theme-color-selector--popover"
          value={sessionColor}
          onChange={handleColorChange}
        />
      </div>
    </div>,
    document.body,
  )
}

function RibbonColumn({
  label,
  className = '',
  rowTop,
  rowBottom,
}: {
  label: string
  className?: string
  rowTop: ReactNode
  rowBottom: ReactNode
}) {
  return (
    <div className={['theme-doc-editor__ribbon-col', className].filter(Boolean).join(' ')}>
      <span className="theme-doc-editor__ribbon-label type-caption type-muted">{label}</span>
      <div className="theme-doc-editor__ribbon-rows">
        <div className="theme-doc-editor__ribbon-row">{rowTop}</div>
        <span className="theme-doc-editor__ribbon-row-divider" role="separator" aria-orientation="horizontal" />
        <div className="theme-doc-editor__ribbon-row">{rowBottom}</div>
      </div>
    </div>
  )
}

function ToolbarTip({ label, children }: { label: string; children: ReactNode }) {
  return <Tooltip content={label}>{children}</Tooltip>
}

export function DocEditorToolbar({
  documentTitle,
  onDocumentTitleChange,
  pageSetup,
  onPageSetupChange,
  onSave,
  onExport,
  onRefresh,
  onFileAction,
  chrome = 'full',
  readOnly = false,
}: DocEditorToolbarProps) {
  const sectionChrome = chrome === 'section'
  const previewChrome = chrome === 'preview'
  const [editor] = useLexicalComposerContext()
  const { openInsertModal } = useDocEditorInsertModal()
  const insertMenuItems = useMemo(() => docEditorInsertMenuButtonItems({ chrome }), [chrome])
  const { isLinkEditMode, setIsLinkEditMode } = useDocEditorLinkEdit()
  const [isBold, setIsBold] = useState(false)
  const [isItalic, setIsItalic] = useState(false)
  const [isUnderline, setIsUnderline] = useState(false)
  const [isStrikethrough, setIsStrikethrough] = useState(false)
  const [isCode, setIsCode] = useState(false)
  const [isSubscript, setIsSubscript] = useState(false)
  const [isSuperscript, setIsSuperscript] = useState(false)
  const [isHighlight, setIsHighlight] = useState(false)
  const [isLowercase, setIsLowercase] = useState(false)
  const [isUppercase, setIsUppercase] = useState(false)
  const [isCapitalize, setIsCapitalize] = useState(false)
  const [isLink, setIsLink] = useState(false)
  const [hasRangeSelection, setHasRangeSelection] = useState(false)
  const [blockType, setBlockType] = useState<BlockType>('paragraph')
  const [elementFormat, setElementFormat] = useState<ElementFormatType>('left')
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const [fontSize, setFontSize] = useState('16px')
  const [fontColor, setFontColor] = useState('#000000')
  const [bgColor, setBgColor] = useState('#ffffff')
  const [codeLanguage, setCodeLanguage] = useState('')
  const [selectedElementKey, setSelectedElementKey] = useState<string | null>(null)
  const [showFontColorPicker, setShowFontColorPicker] = useState(false)
  const [showBgColorPicker, setShowBgColorPicker] = useState(false)
  const fontColorBtnRef = useRef<HTMLSpanElement>(null)
  const fillColorBtnRef = useRef<HTMLSpanElement>(null)
  const [isStickyCaptionFocused, setIsStickyCaptionFocused] = useState(false)
  const ribbonDisabled = isStickyCaptionFocused

  const updateToolbar = useCallback(() => {
    const selection = $getSelection()
    if (!$isRangeSelection(selection)) {
      setHasRangeSelection(false)
      return
    }

    setHasRangeSelection(!selection.isCollapsed())

    setIsBold(selection.hasFormat('bold'))
    setIsItalic(selection.hasFormat('italic'))
    setIsUnderline(selection.hasFormat('underline'))
    setIsStrikethrough(selection.hasFormat('strikethrough'))
    setIsCode(selection.hasFormat('code'))
    setIsSubscript(selection.hasFormat('subscript'))
    setIsSuperscript(selection.hasFormat('superscript'))
    setIsHighlight(selection.hasFormat('highlight'))
    setIsLowercase(selection.hasFormat('lowercase'))
    setIsUppercase(selection.hasFormat('uppercase'))
    setIsCapitalize(selection.hasFormat('capitalize'))

    const anchorNode = selection.anchor.getNode()
    const parent = anchorNode.getParent()
    if ($isLinkNode(parent) || $isLinkNode(anchorNode)) {
      setIsLink(true)
    } else {
      setIsLink(false)
    }

    let element =
      anchorNode.getKey() === 'root'
        ? anchorNode
        : $findMatchingParent(anchorNode, (e) => {
            const p = e.getParent()
            return p !== null && $isRootOrShadowRoot(p)
          })

    if (element === null) element = anchorNode.getTopLevelElementOrThrow()

    setSelectedElementKey(element.getKey())

    let effectiveBlockType: BlockType = 'paragraph'

    if ($isHeadingNode(element)) {
      effectiveBlockType = element.getTag() as BlockType
      setBlockType(effectiveBlockType)
    } else if ($isListNode(element)) {
      const parentList = element as ListNode
      const listType = parentList.getListType()
      if (listType === 'check') setBlockType('check')
      else if (listType === 'number') setBlockType('number')
      else setBlockType('bullet')
    } else if ($isCodeNode(element)) {
      setBlockType('code')
      const language = element.getLanguage()
      setCodeLanguage(language ? normalizeCodeLanguage(language) : '')
    } else {
      const type = element.getType()
      if (type === 'quote') setBlockType('quote')
      else setBlockType('paragraph')
    }

    const inlineFontSize = $getSelectionStyleValueForProperty(selection, 'font-size', '')
    const nextFontSizePx = resolveToolbarFontSizePx(inlineFontSize, effectiveBlockType)
    setFontSize((current) => {
      const currentPx = parseInt(current, 10) || 16
      return currentPx === nextFontSizePx ? current : `${nextFontSizePx}px`
    })

    const nextFontColor = cssColorToHex(
      $getSelectionStyleValueForProperty(selection, 'color', '#000000'),
    )
    const nextBgColor = cssColorToHex(
      $getSelectionStyleValueForProperty(selection, 'background-color', '#ffffff'),
    )
    setFontColor((current) => (current === nextFontColor ? current : nextFontColor))
    setBgColor((current) => (current === nextBgColor ? current : nextBgColor))

    setElementFormat($isElementNode(element) ? element.getFormatType() || 'left' : 'left')
  }, [])

  useEffect(() => {
    const host = editor.getRootElement()?.closest('.theme-doc-editor')
    if (!(host instanceof HTMLElement)) return

    const syncStickyCaptionFocus = () => {
      const active = document.activeElement
      setIsStickyCaptionFocused(Boolean(active?.closest('.editor-sticky-note__input')))
    }

    const onFocusIn = (event: FocusEvent) => {
      const target = event.target
      if (target instanceof HTMLElement && target.closest('.editor-sticky-note__input')) {
        setIsStickyCaptionFocused(true)
      }
    }

    const onFocusOut = () => {
      window.requestAnimationFrame(syncStickyCaptionFocus)
    }

    host.addEventListener('focusin', onFocusIn)
    host.addEventListener('focusout', onFocusOut)

    return () => {
      host.removeEventListener('focusin', onFocusIn)
      host.removeEventListener('focusout', onFocusOut)
    }
  }, [editor])

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => updateToolbar())
      }),
      editor.registerCommand(
        CAN_UNDO_COMMAND,
        (payload) => { setCanUndo(payload); return false },
        COMMAND_PRIORITY_CRITICAL,
      ),
      editor.registerCommand(
        CAN_REDO_COMMAND,
        (payload) => { setCanRedo(payload); return false },
        COMMAND_PRIORITY_CRITICAL,
      ),
    )
  }, [editor, updateToolbar])

  const formatText = useCallback(
    (format: TextFormatType) => { editor.dispatchCommand(FORMAT_TEXT_COMMAND, format) },
    [editor],
  )

  const formatElement = useCallback(
    (format: ElementFormatType) => { editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, format) },
    [editor],
  )

  const applyFontSize = useCallback(
    (size: string) => {
      editor.update(() => {
        const selection = $getSelection()
        if ($isRangeSelection(selection)) {
          $patchStyleText(selection, { 'font-size': size })
        }
      })
    },
    [editor],
  )

  const applyFontColor = useCallback(
    (color: string) => {
      const next = cssColorToHex(color)
      editor.update(() => {
        const selection = $getSelection()
        if (!$isRangeSelection(selection)) return
        const current = cssColorToHex(
          $getSelectionStyleValueForProperty(selection, 'color', '#000000'),
        )
        if (current === next) return
        $patchStyleText(selection, { color: next })
      })
    },
    [editor],
  )

  const applyBgColor = useCallback(
    (color: string) => {
      const next = cssColorToHex(color)
      editor.update(() => {
        const selection = $getSelection()
        if (!$isRangeSelection(selection)) return
        const current = cssColorToHex(
          $getSelectionStyleValueForProperty(selection, 'background-color', '#ffffff'),
        )
        if (current === next) return
        $patchStyleText(selection, { 'background-color': next })
      })
    },
    [editor],
  )

  const clearFormatting = useCallback(() => {
    editor.update(() => {
      const selection = $getSelection()
      if (!$isRangeSelection(selection)) return
      const anchor = selection.anchor
      const focus = selection.focus
      const nodes = selection.getNodes()
      if (anchor.key === focus.key && anchor.offset === focus.offset) return

      nodes.forEach((node) => {
        if ($isTextNode(node)) {
          node.setFormat(0)
          node.setStyle('')
        }
      })
      $patchStyleText(selection, {
        'font-size': '',
        color: '',
        'background-color': '',
      })
    })
    editor.dispatchCommand(TOGGLE_LINK_COMMAND, null)
    setIsLinkEditMode(false)
  }, [editor, setIsLinkEditMode])

  const onCodeLanguageSelect = useCallback(
    (value: string) => {
      editor.update(() => {
        if (selectedElementKey !== null) {
          const node = $getNodeByKey(selectedElementKey)
          if ($isCodeNode(node)) {
            node.setLanguage(value)
          }
        }
      })
    },
    [editor, selectedElementKey],
  )

  const handleInsertMenuSelect = useCallback(
    (id: string) => {
      if (sectionChrome && (isDocEditorAssessmentInsertExcluded(id) || docEditorInsertUsesModal(id))) {
        return
      }
      if (docEditorInsertUsesModal(id)) {
        openInsertModal({ kind: id as DocEditorInsertModalKind, editor })
        return
      }
      runDocEditorInsertMenuAction(editor, id)
    },
    [editor, openInsertModal, sectionChrome],
  )

  const setBlock = useCallback(
    (type: BlockType) => {
      editor.update(() => {
        const selection = $getSelection()
        if (!$isRangeSelection(selection)) return

        if (type === 'paragraph') {
          $setBlocksType(selection, () => $createParagraphNode())
        } else if (type === 'h1' || type === 'h2' || type === 'h3') {
          $setBlocksType(selection, () => $createHeadingNode(type as HeadingTagType))
        } else if (type === 'quote') {
          $setBlocksType(selection, () => $createQuoteNode())
        } else if (type === 'code') {
          if (blockType !== 'code') {
            $setBlocksType(selection, () => $createCodeNode())
          } else {
            $setBlocksType(selection, () => $createParagraphNode())
          }
        } else if (type === 'bullet') {
          if (blockType === 'bullet') {
            editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined)
          } else {
            editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)
          }
        } else if (type === 'number') {
          if (blockType === 'number') {
            editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined)
          } else {
            editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)
          }
        } else if (type === 'check') {
          if (blockType === 'check') {
            editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined)
          } else {
            editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined)
          }
        }
      })
    },
    [editor, blockType],
  )

  const currentFontSize = parseInt(fontSize, 10) || 16

  const primaryBlocks = BLOCK_TYPES.filter((bt) =>
    ['paragraph', 'h1', 'h2', 'h3'].includes(bt.value),
  )
  const secondaryBlocks = BLOCK_TYPES.filter((bt) =>
    ['bullet', 'number', 'check', 'quote'].includes(bt.value),
  )

  if (previewChrome) return null
  // Section chrome is only mutate trays — hide entirely when read-only.
  if (readOnly && sectionChrome) return null

  const historyTray = (
    <EditorHistoryTray
      canUndo={canUndo}
      canRedo={canRedo}
      onUndo={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
      onRedo={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
    />
  )

  return (
    <div
      className={[
        'theme-doc-editor__chrome',
        sectionChrome ? 'theme-doc-editor__chrome--section' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {sectionChrome ? (
        <div
          className="theme-doc-editor__section-history"
          role="toolbar"
          aria-label="Editor history"
        >
          {historyTray}
        </div>
      ) : (
        <EditorTitlebar
          className="theme-doc-editor__titlebar"
          fileMenu={readOnly ? undefined : <DocEditorFileMenu onAction={onFileAction} />}
          historyTray={readOnly ? undefined : historyTray}
          titleBlock={
            <EditorTitleField
              value={documentTitle}
              onChange={onDocumentTitleChange}
              placeholder="Untitled document"
              aria-label="Document title"
            />
          }
          titleRefresh={readOnly ? undefined : <EditorTitleRefresh onRefresh={onRefresh} label="Reset document" />}
          saveTray={readOnly ? undefined : <EditorSaveTray onSave={onSave} label="Save editor context" />}
          exportMenu={<EditorExportMenu kind="doc" onExport={onExport} />}
        />
      )}

      {readOnly ? null : (
      <div
        role="toolbar"
        aria-label="Editor formatting"
        aria-disabled={ribbonDisabled || undefined}
      >
        <ThemeScroll
          axis="horizontal"
          rail="nano"
          className="theme-doc-editor__ribbon-scroll"
          contentClassName={[
            'theme-doc-editor__ribbon',
            ribbonDisabled ? 'theme-doc-editor__ribbon--disabled' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
        <RibbonColumn
          label="Styles"
          className="theme-doc-editor__ribbon-col--styles"
          rowTop={
            <ToolbarModeGroup aria-label="Heading styles">
              {primaryBlocks.map((bt) => (
                <ToolbarTip key={bt.value} label={bt.label}>
                  <IconButton
                    icon={bt.icon}
                    aria-label={bt.label}
                    aria-pressed={blockType === bt.value}
                    size="xs"
                    active={blockType === bt.value}
                    onClick={() => setBlock(bt.value)}
                  />
                </ToolbarTip>
              ))}
            </ToolbarModeGroup>
          }
          rowBottom={
            <ToolbarModeGroup aria-label="Block styles">
              {secondaryBlocks.map((bt) => (
                <ToolbarTip key={bt.value} label={bt.label}>
                  <IconButton
                    icon={bt.icon}
                    aria-label={bt.label}
                    aria-pressed={blockType === bt.value}
                    size="xs"
                    active={blockType === bt.value}
                    onClick={() => setBlock(bt.value)}
                  />
                </ToolbarTip>
              ))}
            </ToolbarModeGroup>
          }
        />

        <RibbonColumn
          label="Font"
          className="theme-doc-editor__ribbon-col--font"
          rowTop={
            <div className="theme-doc-editor__font-top-row">
              <ToolbarTip label="Font size">
                <Counter
                  size="xs"
                  aria-label="Font size"
                  value={currentFontSize}
                  steps={FONT_SIZE_STEPS}
                  formatDisplay={(size) => String(size)}
                  onValueChange={(size) => applyFontSize(`${size}px`)}
                />
              </ToolbarTip>
              <ToolbarTip label="Page size">
                <MenuButton
                  size="xs"
                  variant="tray"
                  menuSize="compact"
                  portal
                  portalZIndex={1200}
                  scrollRail="hidden"
                  triggerLabelAnim={false}
                  className="theme-doc-editor__page-size-menu"
                  label={pageSizeTriggerLabel(pageSetup.pageSize)}
                  items={PAGE_SIZE_TOOLBAR_ITEMS}
                  selectedId={pageSetup.pageSize}
                  onSelect={(id) => {
                    onPageSetupChange({
                      ...pageSetup,
                      pageSize: id as PageSetup['pageSize'],
                    })
                  }}
                />
              </ToolbarTip>
              <span className="theme-doc-editor__toolbar-divider" aria-hidden />
              <ToolbarModeGroup aria-label="Text color and highlight">
                <span ref={fontColorBtnRef} className="theme-doc-editor__color-btn-wrap">
                  <ToolbarTip label="Text color">
                    <IconButton
                      variant="tray-color"
                      icon={Type}
                      indicatorColor={fontColor}
                      aria-label="Text color"
                      aria-pressed={showFontColorPicker}
                      size="xs"
                      active={showFontColorPicker}
                      onClick={() => {
                        setShowFontColorPicker((open) => !open)
                        setShowBgColorPicker(false)
                      }}
                    />
                  </ToolbarTip>
                  {showFontColorPicker ? (
                    <ColorPopover
                      anchorRef={fontColorBtnRef}
                      label="Text color"
                      value={fontColor}
                      onChange={applyFontColor}
                      onClose={() => setShowFontColorPicker(false)}
                    />
                  ) : null}
                </span>
                <span ref={fillColorBtnRef} className="theme-doc-editor__color-btn-wrap">
                  <ToolbarTip label="Text fill color">
                    <IconButton
                      variant="tray-color"
                      icon={PaintBucket}
                      indicatorColor={bgColor}
                      aria-label="Text fill color"
                      aria-pressed={showBgColorPicker}
                      size="xs"
                      active={showBgColorPicker}
                      onClick={() => {
                        setShowBgColorPicker((open) => !open)
                        setShowFontColorPicker(false)
                      }}
                    />
                  </ToolbarTip>
                  {showBgColorPicker ? (
                    <ColorPopover
                      anchorRef={fillColorBtnRef}
                      label="Text fill color"
                      value={bgColor}
                      onChange={applyBgColor}
                      onClose={() => setShowBgColorPicker(false)}
                    />
                  ) : null}
                </span>
                <ToolbarTip label="Highlight">
                  <IconButton
                    variant="tray"
                    icon={Highlighter}
                    aria-label="Highlight"
                    aria-pressed={isHighlight}
                    size="xs"
                    active={isHighlight}
                    onClick={() => formatText('highlight')}
                  />
                </ToolbarTip>
              </ToolbarModeGroup>
            </div>
          }
          rowBottom={
            <div className="theme-doc-editor__font-format-row">
              <ToolbarModeGroup aria-label="Font formatting">
                <ToolbarTip label="Bold">
                  <IconButton
                    icon={Bold}
                    aria-label="Bold"
                    aria-pressed={isBold}
                    size="xs"
                    active={isBold}
                    onClick={() => formatText('bold')}
                  />
                </ToolbarTip>
                <ToolbarTip label="Italic">
                  <IconButton
                    icon={Italic}
                    aria-label="Italic"
                    aria-pressed={isItalic}
                    size="xs"
                    active={isItalic}
                    onClick={() => formatText('italic')}
                  />
                </ToolbarTip>
                <ToolbarTip label="Underline">
                  <IconButton
                    icon={Underline}
                    aria-label="Underline"
                    aria-pressed={isUnderline}
                    size="xs"
                    active={isUnderline}
                    onClick={() => formatText('underline')}
                  />
                </ToolbarTip>
                <ToolbarTip label="Strikethrough">
                  <IconButton
                    icon={Strikethrough}
                    aria-label="Strikethrough"
                    aria-pressed={isStrikethrough}
                    size="xs"
                    active={isStrikethrough}
                    onClick={() => formatText('strikethrough')}
                  />
                </ToolbarTip>
                <ToolbarTip label="Inline code">
                  <IconButton
                    icon={Code}
                    aria-label="Inline code"
                    aria-pressed={isCode}
                    size="xs"
                    active={isCode}
                    onClick={() => formatText('code')}
                  />
                </ToolbarTip>
              </ToolbarModeGroup>
              <span className="theme-doc-editor__toolbar-divider" aria-hidden />
              <ToolbarModeGroup aria-label="Script formatting">
                <ToolbarTip label="Subscript">
                  <IconButton
                    icon={Subscript}
                    aria-label="Subscript"
                    aria-pressed={isSubscript}
                    size="xs"
                    active={isSubscript}
                    onClick={() => formatText('subscript')}
                  />
                </ToolbarTip>
                <ToolbarTip label="Superscript">
                  <IconButton
                    icon={Superscript}
                    aria-label="Superscript"
                    aria-pressed={isSuperscript}
                    size="xs"
                    active={isSuperscript}
                    onClick={() => formatText('superscript')}
                  />
                </ToolbarTip>
              </ToolbarModeGroup>
            </div>
          }
        />

        <RibbonColumn
          label="Case"
          className="theme-doc-editor__ribbon-col--color"
          rowTop={
            <ToolbarModeGroup aria-label="Text case">
              <ToolbarTip label="Lowercase">
                <IconButton
                  icon={CaseLower}
                  aria-label="Lowercase"
                  aria-pressed={isLowercase}
                  size="xs"
                  active={isLowercase}
                  onClick={() => formatText('lowercase')}
                />
              </ToolbarTip>
              <ToolbarTip label="Uppercase">
                <IconButton
                  icon={CaseUpper}
                  aria-label="Uppercase"
                  aria-pressed={isUppercase}
                  size="xs"
                  active={isUppercase}
                  onClick={() => formatText('uppercase')}
                />
              </ToolbarTip>
              <ToolbarTip label="Capitalize">
                <IconButton
                  icon={CaseSensitive}
                  aria-label="Capitalize"
                  aria-pressed={isCapitalize}
                  size="xs"
                  active={isCapitalize}
                  onClick={() => formatText('capitalize')}
                />
              </ToolbarTip>
              <ToolbarTip label="Clear formatting">
                <IconButton
                  icon={RemoveFormatting}
                  aria-label="Clear formatting"
                  size="xs"
                  onClick={clearFormatting}
                />
              </ToolbarTip>
            </ToolbarModeGroup>
          }
          rowBottom={
            <MenuButton
              size="xs"
              variant="tray"
              menuSize="compact"
              portal
              portalZIndex={1200}
              scrollRail="hidden"
              triggerLabelAnim={false}
              disabled={ribbonDisabled || blockType !== 'code'}
              className="theme-doc-editor__code-language-menu"
              label={codeLanguageDisplayLabel(codeLanguage)}
              items={CODE_LANGUAGE_MENU_ITEMS}
              selectedId={codeLanguage}
              onSelect={(id) => onCodeLanguageSelect(id)}
            />
          }
        />

        <RibbonColumn
          label="Paragraph"
          className="theme-doc-editor__ribbon-col--paragraph"
          rowTop={
            <ToolbarModeGroup aria-label="Alignment">
              <ToolbarTip label="Align left">
                <IconButton
                  icon={AlignLeft}
                  aria-label="Align left"
                  aria-pressed={elementFormat === 'left'}
                  size="xs"
                  active={elementFormat === 'left'}
                  onClick={() => formatElement('left')}
                />
              </ToolbarTip>
              <ToolbarTip label="Align center">
                <IconButton
                  icon={AlignCenter}
                  aria-label="Align center"
                  aria-pressed={elementFormat === 'center'}
                  size="xs"
                  active={elementFormat === 'center'}
                  onClick={() => formatElement('center')}
                />
              </ToolbarTip>
              <ToolbarTip label="Align right">
                <IconButton
                  icon={AlignRight}
                  aria-label="Align right"
                  aria-pressed={elementFormat === 'right'}
                  size="xs"
                  active={elementFormat === 'right'}
                  onClick={() => formatElement('right')}
                />
              </ToolbarTip>
              <ToolbarTip label="Justify">
                <IconButton
                  icon={AlignJustify}
                  aria-label="Justify"
                  aria-pressed={elementFormat === 'justify'}
                  size="xs"
                  active={elementFormat === 'justify'}
                  onClick={() => formatElement('justify')}
                />
              </ToolbarTip>
            </ToolbarModeGroup>
          }
          rowBottom={
            <ToolbarControlTray className="theme-doc-editor__indent-tray">
              <ToolbarTip label="Outdent">
                <IconButton
                  icon={Outdent}
                  aria-label="Outdent"
                  size="xs"
                  variant="tray"
                  onClick={() => editor.dispatchCommand(OUTDENT_CONTENT_COMMAND, undefined)}
                />
              </ToolbarTip>
              <ToolbarTip label="Indent">
                <IconButton
                  icon={Indent}
                  aria-label="Indent"
                  size="xs"
                  variant="tray"
                  onClick={() => editor.dispatchCommand(INDENT_CONTENT_COMMAND, undefined)}
                />
              </ToolbarTip>
            </ToolbarControlTray>
          }
        />

        <RibbonColumn
          label="Insert"
          className="theme-doc-editor__ribbon-col--insert"
          rowTop={
            <div className="theme-doc-editor__insert-quick">
              <ToolbarModeGroup aria-label="Quick insert">
                <ToolbarTip label="Insert link">
                  <span
                    className="theme-doc-editor__link-trigger"
                    onMouseDown={(event) => event.preventDefault()}
                  >
                    <IconButton
                      icon={Link2}
                      aria-label="Insert link"
                      aria-pressed={isLinkEditMode || isLink}
                      size="xs"
                      active={isLinkEditMode || isLink}
                      disabled={!hasRangeSelection || ribbonDisabled}
                      onClick={() => openDocEditorLinkEdit(editor, isLink, setIsLinkEditMode)}
                    />
                  </span>
                </ToolbarTip>
                <ToolbarTip label="Insert table">
                  <IconButton
                    icon={Table}
                    aria-label="Insert table"
                    size="xs"
                    onClick={() => insertTable(editor)}
                  />
                </ToolbarTip>
              </ToolbarModeGroup>
              <ToolbarModeGroup aria-label="Page break and horizontal rule">
                {!sectionChrome ? (
                  <ToolbarTip label="Page break">
                    <IconButton
                      icon={Scissors}
                      aria-label="Insert page break"
                      size="xs"
                      onClick={() => insertPageBreak(editor)}
                    />
                  </ToolbarTip>
                ) : null}
                <ToolbarTip label="Horizontal rule">
                  <IconButton
                    icon={Minus}
                    aria-label="Insert horizontal rule"
                    size="xs"
                    onClick={() => insertHorizontalRule(editor)}
                  />
                </ToolbarTip>
              </ToolbarModeGroup>
            </div>
          }
          rowBottom={
            <ToolbarTip label="Insert block">
              <MenuButton
                size="xs"
                variant="tray"
                menuSize="compact"
                portal
                portalZIndex={1200}
                scrollRail="hidden"
                triggerLabelAnim={false}
                disabled={ribbonDisabled}
                className="theme-doc-editor__insert-menu"
                label="Insert"
                leadingIcon={DOC_EDITOR_INSERT_ICONS.menu}
                items={insertMenuItems}
                onSelect={handleInsertMenuSelect}
              />
            </ToolbarTip>
          }
        />

        </ThemeScroll>
      </div>
      )}
    </div>
  )
}
