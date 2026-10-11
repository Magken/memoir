import { $createTableCellNode, $createTableNode, $createTableRowNode, TableCellNode, TableNode, TableRowNode } from '@lexical/table'
import type { ElementTransformer, MultilineElementTransformer, TextMatchTransformer } from '@lexical/markdown'
import {
  $createParagraphNode,
  $createTextNode,
  $isElementNode,
  type LexicalNode,
  type TextFormatType,
} from 'lexical'
import { DOC_EDITOR_LAYOUT_TEMPLATES } from './layoutTemplates'
import {
  $createCollapsibleContainerNode,
  $isCollapsibleContentNode,
  $isCollapsibleTitleNode,
  CollapsibleContainerNode,
} from './nodes/collapsibleNode'
import { $createLayoutWithTemplate, LayoutContainerNode } from './nodes/columnsLayoutNode'
import { $createDateNode, DateNode } from './nodes/dateNode'
import { $createEquationNode, EquationNode } from './nodes/equationNode'
import { $createHorizontalRuleNode, HorizontalRuleNode } from './nodes/horizontalRuleNode'
import { $createImageNode, ImageNode } from './nodes/imageNode'
import { $createPageBreakNode, PageBreakNode } from './nodes/pageBreakNode'
import { exportPageBreakMarkdown } from './exportPageBreakMarkdown'
import { $createPollNode, PollNode } from './nodes/pollNode'
import { $createStickyNoteNode, StickyNoteNode } from './nodes/stickyNoteNode'
import { $createVideoEmbedNode, VideoEmbedNode } from './nodes/videoEmbedNode'
import { DOC_DIAGRAM_CODE_LANGUAGES, type DocDiagramCodeLanguage } from './diagramCodeLanguages'
import { $createDiagramCodeNode, $isDiagramCodeNode, DiagramCodeNode } from './nodes/diagramCodeNode'

const DOC_BLOCK_END = /^:::\s*$/

function parseDirectiveAttrs(input: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  const re = /([\w-]+)=("([^"]*)"|'([^']*)'|[^\s]+)/g
  let match: RegExpExecArray | null
  while ((match = re.exec(input)) !== null) {
    attrs[match[1]!] = match[3] ?? match[4] ?? match[2]!
  }
  return attrs
}

function fillCollapsible(container: CollapsibleContainerNode, title: string, body: string): void {
  const titleNode = container.getFirstChild()
  const contentNode = container.getLastChild()
  if ($isCollapsibleTitleNode(titleNode)) {
    titleNode.clear()
    const titleParagraph = $createParagraphNode().append($createTextNode(title))
    titleNode.append(titleParagraph)
  }
  if ($isCollapsibleContentNode(contentNode)) {
    contentNode.clear()
    const bodyParagraph = $createParagraphNode().append($createTextNode(body))
    contentNode.append(bodyParagraph)
  }
}

function resolveLayoutTemplate(templateId: string): string {
  const found = DOC_EDITOR_LAYOUT_TEMPLATES.find((entry) => entry.id === templateId)
  return found?.templateColumns ?? '1fr 1fr'
}

function splitColumnSections(lines: string[]): string[] {
  const sections: string[] = []
  let current: string[] = []
  for (const line of lines) {
    if (/^---\s*$/.test(line)) {
      sections.push(current.join('\n').trim())
      current = []
      continue
    }
    current.push(line)
  }
  sections.push(current.join('\n').trim())
  return sections
}

function createInlineFormatTransformer(
  openTag: string,
  closeTag: string,
  format: TextFormatType | TextFormatType[],
): TextMatchTransformer {
  const open = openTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const close = closeTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regExp = new RegExp(`${open}(.+?)${close}$`)
  const importRegExp = new RegExp(`${open}(.+?)${close}`)
  return {
    dependencies: [],
    importRegExp,
    regExp,
    replace: (textNode, match) => {
      const node = $createTextNode(match[1]!)
      for (const value of Array.isArray(format) ? format : [format]) {
        node.setFormat(value)
      }
      textNode.replace(node)
      return node
    },
    type: 'text-match',
  }
}

const DOC_PAGE_BREAK: ElementTransformer = {
  dependencies: [PageBreakNode],
  // Must return null for every other node — `$convertToMarkdownString` takes the
  // first non-null export, and this transformer is registered before headings.
  export: (node) => exportPageBreakMarkdown(node),
  regExp: /^:::doc-page-break\s*$/,
  replace: (parentNode) => {
    parentNode.replace($createPageBreakNode())
  },
  type: 'element',
}

const DOC_DATE: ElementTransformer = {
  dependencies: [DateNode],
  export: (node) => {
    if (node.getType() !== 'doc-date') return null
    return `:::doc-date ${(node as DateNode).getDate()}`
  },
  regExp: /^:::doc-date\s+(\S+)\s*$/,
  replace: (parentNode, _children, match) => {
    parentNode.replace($createDateNode(match[1]))
  },
  type: 'element',
}

const DOC_GIF: ElementTransformer = {
  dependencies: [ImageNode],
  export: (node) => {
    if (node.getType() !== 'doc-image') return null
    const image = node as ImageNode
    if (image.getMediaKind() !== 'gif') return null
    return `:::doc-gif url=${image.getSrc()} alt=${image.getAltText()}`
  },
  regExp: /^:::doc-gif\s+(.+)$/,
  replace: (parentNode, _children, match) => {
    const attrs = parseDirectiveAttrs(match[1]!)
    const src = attrs.url ?? ''
    const alt = attrs.alt ?? 'GIF'
    parentNode.replace($createImageNode(src, alt, 'gif'))
  },
  type: 'element',
}

const DOC_VIDEO: ElementTransformer = {
  dependencies: [VideoEmbedNode],
  export: (node) => {
    if (node.getType() !== 'video-embed') return null
    const video = node as VideoEmbedNode
    if (video.getVideoId()) return null
    return `:::doc-video title="${video.getTitle()}"`
  },
  regExp: /^:::doc-video(?:\s+(.+))?$/,
  replace: (parentNode, _children, match) => {
    const attrs = parseDirectiveAttrs(match[1] ?? '')
    parentNode.replace($createVideoEmbedNode('', attrs.title ?? 'Video'))
  },
  type: 'element',
}

const DOC_YOUTUBE: ElementTransformer = {
  dependencies: [VideoEmbedNode],
  export: (node) => {
    if (node.getType() !== 'video-embed') return null
    const video = node as VideoEmbedNode
    if (!video.getVideoId()) return null
    return `:::doc-youtube id=${video.getVideoId()} title="${video.getTitle()}"`
  },
  regExp: /^:::doc-youtube(?:\s+(.+))?$/,
  replace: (parentNode, _children, match) => {
    const attrs = parseDirectiveAttrs(match[1] ?? '')
    parentNode.replace($createVideoEmbedNode(attrs.id ?? '', attrs.title ?? 'YouTube video'))
  },
  type: 'element',
}

const DOC_POLL: ElementTransformer = {
  dependencies: [PollNode],
  export: (node) => {
    if (node.getType() !== 'poll') return null
    const poll = node as PollNode
    return `:::doc-poll question="${poll.getQuestion()}" options=${poll.getOptions().join('|')}`
  },
  regExp: /^:::doc-poll\s+(.+)$/,
  replace: (parentNode, _children, match) => {
    const attrs = parseDirectiveAttrs(match[1]!)
    const options = (attrs.options ?? '')
      .split('|')
      .map((option) => option.trim())
      .filter(Boolean)
    parentNode.replace($createPollNode(attrs.question ?? 'Poll', options))
  },
  type: 'element',
}

const DOC_HORIZONTAL_RULE: ElementTransformer = {
  dependencies: [HorizontalRuleNode],
  export: (node) => (node.getType() === 'horizontalrule' ? '---' : null),
  regExp: /^---\s*$/,
  replace: (parentNode) => {
    parentNode.replace($createHorizontalRuleNode())
  },
  type: 'element',
}

const DOC_IMAGE: TextMatchTransformer = {
  dependencies: [ImageNode],
  export: (node) => {
    if (node.getType() !== 'doc-image') return null
    const image = node as ImageNode
    if (image.getMediaKind() === 'gif') return null
    return `![${image.getAltText()}](${image.getSrc()})`
  },
  importRegExp: /!\[([^\]]*)\]\(([^)\s]+)\)/,
  regExp: /!\[([^\]]*)\]\(([^)\s]+)\)$/,
  replace: (textNode, match) => {
    const imageNode = $createImageNode(match[2]!, match[1] ?? '', 'image')
    textNode.replace(imageNode)
  },
  type: 'text-match',
}

const DOC_UNDERLINE = createInlineFormatTransformer(':::doc-underline ', ' :::', 'underline')
const DOC_SUBSCRIPT = createInlineFormatTransformer(':::doc-sub ', ' :::', 'subscript')
const DOC_SUPERSCRIPT = createInlineFormatTransformer(':::doc-sup ', ' :::', 'superscript')

const DOC_COLOR: TextMatchTransformer = {
  dependencies: [],
  importRegExp: /:::doc-color\s+(#[0-9a-fA-F]{3,8}|[^\s]+)\s+(.+?)\s+:::/,
  regExp: /:::doc-color\s+(#[0-9a-fA-F]{3,8}|[^\s]+)\s+(.+?)\s+:::$/,
  replace: (textNode, match) => {
    const node = $createTextNode(match[2]!)
    node.setStyle(`color: ${match[1]};`)
    textNode.replace(node)
    return node
  },
  type: 'text-match',
}

const DOC_FONT_SIZE: TextMatchTransformer = {
  dependencies: [],
  importRegExp: /:::doc-font-size\s+([0-9.]+px)\s+(.+?)\s+:::/,
  regExp: /:::doc-font-size\s+([0-9.]+px)\s+(.+?)\s+:::$/,
  replace: (textNode, match) => {
    const node = $createTextNode(match[2]!)
    node.setStyle(`font-size: ${match[1]};`)
    textNode.replace(node)
    return node
  },
  type: 'text-match',
}

function createDocMultilineBlock(
  name: string,
  dependencies: MultilineElementTransformer['dependencies'],
  createNode: (startMatch: RegExpMatchArray, lines: string[]) => LexicalNode | null,
): MultilineElementTransformer {
  return {
    dependencies,
    regExpStart: new RegExp(`^:::${name}(?:\\s+(.+))?\\s*$`),
    regExpEnd: { regExp: DOC_BLOCK_END },
    replace: (rootNode, _children, startMatch, _endMatch, linesInBetween) => {
      const lines = linesInBetween ?? []
      const node = createNode(startMatch as RegExpMatchArray, lines)
      if (!node) return false
      rootNode.append(node)
    },
    type: 'multiline-element',
  }
}

const DOC_EQUATION = createDocMultilineBlock('doc-equation', [EquationNode], (_start, lines) => {
  const body = lines.join('\n').trim()
  const latex = body.replace(/^latex:\s*/i, '').trim()
  return $createEquationNode(latex, false)
})

const DOC_STICKY = createDocMultilineBlock('doc-sticky', [StickyNoteNode], (_start, lines) => {
  return $createStickyNoteNode(0, 0, 'yellow', lines.join('\n').trim())
})

const DOC_COLLAPSIBLE: MultilineElementTransformer = {
  dependencies: [CollapsibleContainerNode],
  regExpStart: /^:::doc-collapsible(?:\s+title="([^"]*)")?\s*$/,
  regExpEnd: { regExp: DOC_BLOCK_END },
  replace: (rootNode, _children, startMatch, _endMatch, linesInBetween) => {
    const container = $createCollapsibleContainerNode(true)
    fillCollapsible(container, startMatch[1] ?? '', (linesInBetween ?? []).join('\n').trim())
    rootNode.append(container)
  },
  type: 'multiline-element',
}

const DOC_ALIGN: MultilineElementTransformer = {
  dependencies: [],
  regExpStart: /^:::doc-align\s+(center|right|justify|left)\s*$/,
  regExpEnd: { regExp: DOC_BLOCK_END },
  replace: (rootNode, _children, startMatch, _endMatch, linesInBetween) => {
    const align = startMatch[1] as 'center' | 'right' | 'justify' | 'left'
    const text = (linesInBetween ?? []).join('\n').trim()
    const paragraph = $createParagraphNode()
    if (align !== 'left') paragraph.setFormat(align)
    paragraph.append($createTextNode(text))
    rootNode.append(paragraph)
  },
  type: 'multiline-element',
}

const DOC_STYLE: MultilineElementTransformer = {
  dependencies: [],
  regExpStart: /^:::doc-style\s+(.+)\s*$/,
  regExpEnd: { regExp: DOC_BLOCK_END },
  replace: (rootNode, _children, startMatch, _endMatch, linesInBetween) => {
    const declarations = startMatch[1]!
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => (part.includes(':') ? part : part.replace('=', ':')))
    const paragraph = $createParagraphNode()
    paragraph.setStyle(`${declarations.join('; ')};`)
    paragraph.append($createTextNode((linesInBetween ?? []).join('\n').trim()))
    rootNode.append(paragraph)
  },
  type: 'multiline-element',
}

const DOC_COLUMNS: MultilineElementTransformer = {
  dependencies: [LayoutContainerNode],
  regExpStart: /^:::doc-columns\s+template=([\w-]+)\s*$/,
  regExpEnd: { regExp: DOC_BLOCK_END },
  replace: (rootNode, _children, startMatch, _endMatch, linesInBetween) => {
    const layout = $createLayoutWithTemplate(resolveLayoutTemplate(startMatch[1]!))
    const sections = splitColumnSections(linesInBetween ?? [])
    for (let index = 0; index < layout.getChildrenSize(); index += 1) {
      const item = layout.getChildAtIndex(index)
      if (!$isElementNode(item)) continue
      item.clear()
      const text = sections[index]?.trim()
      if (text) {
        item.append($createParagraphNode().append($createTextNode(text)))
      } else {
        item.append($createParagraphNode())
      }
    }
    rootNode.append(layout)
  },
  type: 'multiline-element',
}

const TABLE_ROW = /^\|(.+)\|\s*$/
const TABLE_DIVIDER = /^\|\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|\s*$/

const DOC_TABLE: MultilineElementTransformer = {
  dependencies: [TableNode, TableRowNode, TableCellNode],
  regExpStart: TABLE_ROW,
  handleImportAfterStartMatch: ({ lines, rootNode, startLineIndex, startMatch }) => {
    const headerCells = splitTableCells(startMatch[1]!)
    const dividerLine = lines[startLineIndex + 1]
    if (!dividerLine || !TABLE_DIVIDER.test(dividerLine.trim())) {
      return null
    }

    const dataRows: string[][] = []
    let lineIndex = startLineIndex + 2
    while (lineIndex < lines.length) {
      const line = lines[lineIndex]!.trimEnd()
      const rowMatch = line.match(TABLE_ROW)
      if (!rowMatch) break
      dataRows.push(splitTableCells(rowMatch[1]!))
      lineIndex += 1
    }

    const table = $createTableNode()
    appendTableRow(table, headerCells, true)
    for (const row of dataRows) {
      appendTableRow(table, row, false)
    }
    rootNode.append(table)
    return [true, lineIndex - 1]
  },
  regExpEnd: { optional: true, regExp: TABLE_ROW },
  replace: () => false,
  type: 'multiline-element',
}

function splitTableCells(row: string): string[] {
  return row
    .split('|')
    .map((cell) => cell.trim())
    .filter((cell, index, cells) => !(cell === '' && (index === 0 || index === cells.length - 1)))
}

function appendTableRow(table: TableNode, cells: string[], header: boolean): void {
  const row = $createTableRowNode()
  for (const value of cells) {
    const cell = $createTableCellNode(header ? 1 : 0)
    cell.append($createParagraphNode().append($createTextNode(value)))
    row.append(cell)
  }
  table.append(row)
}

const DOC_DIAGRAM_FENCED: MultilineElementTransformer = {
  dependencies: [DiagramCodeNode],
  export: (node) => {
    if (!$isDiagramCodeNode(node)) return null
    return `\`\`\`${node.getLanguage()}\n${node.getSource()}\n\`\`\``
  },
  regExpStart: /^```(mermaid|excalidraw)\s*$/,
  regExpEnd: { regExp: /^```\s*$/ },
  replace: (rootNode, _children, startMatch, _endMatch, linesInBetween) => {
    const language = startMatch[1] as DocDiagramCodeLanguage
    if (!DOC_DIAGRAM_CODE_LANGUAGES.includes(language)) return false
    rootNode.append($createDiagramCodeNode(language, (linesInBetween ?? []).join('\n').trim()))
  },
  type: 'multiline-element',
}

/** DocEditor-specific markdown transformers (`:::doc-*`, tables, HR, images). */
export const DOC_EMBED_MARKDOWN_TRANSFORMERS = [
  DOC_DIAGRAM_FENCED,
  DOC_TABLE,
  DOC_EQUATION,
  DOC_STICKY,
  DOC_COLLAPSIBLE,
  DOC_ALIGN,
  DOC_STYLE,
  DOC_COLUMNS,
  DOC_PAGE_BREAK,
  DOC_DATE,
  DOC_GIF,
  DOC_VIDEO,
  DOC_YOUTUBE,
  DOC_POLL,
  DOC_HORIZONTAL_RULE,
  DOC_IMAGE,
  DOC_COLOR,
  DOC_FONT_SIZE,
  DOC_UNDERLINE,
  DOC_SUBSCRIPT,
  DOC_SUPERSCRIPT,
] as const
