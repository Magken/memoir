/**
 * Programmatically builds the full DocEditor regression document (all feature types).
 * Serialized once at module load — used by Native JSON→Doc demo + conversion tests.
 */
import { $createCodeNode, CodeHighlightNode, CodeNode } from '@lexical/code'
import { $createDocFixtureDiagramNode } from './docDiagramFixtures'
import { AutoLinkNode, LinkNode, $createLinkNode } from '@lexical/link'
import { $createListItemNode, $createListNode, ListItemNode, ListNode } from '@lexical/list'
import { $createHeadingNode, $createQuoteNode, HeadingNode, QuoteNode } from '@lexical/rich-text'
import { $createTableNodeWithDimensions, TableCellNode, TableNode, TableRowNode } from '@lexical/table'
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  createEditor,
  type LexicalNode,
  type SerializedEditorState,
} from 'lexical'
import type { PageSetup } from './pageSetup'
import {
  CollapsibleContainerNode,
  CollapsibleContentNode,
  CollapsibleTitleNode,
  $createCollapsibleContainerNode,
} from './nodes/collapsibleNode'
import { $createLayoutWithTemplate, LayoutContainerNode, LayoutItemNode } from './nodes/columnsLayoutNode'
import { $createDateNode } from './nodes/dateNode'
import { $createEquationNode } from './nodes/equationNode'
import { $createHorizontalRuleNode } from './nodes/horizontalRuleNode'
import { $createImageNode } from './nodes/imageNode'
import { $createPageBreakNode } from './nodes/pageBreakNode'
import { $createPollNode } from './nodes/pollNode'
import { $createStickyNoteNode } from './nodes/stickyNoteNode'
import { $createVideoEmbedNode } from './nodes/videoEmbedNode'
import { DOC_EDITOR_EMBED_NODES } from './nodes'

const FORMAT_BOLD = 1
const FORMAT_ITALIC = 2
const FORMAT_UNDERLINE = 4
const FORMAT_STRIKE = 8
const FORMAT_CODE = 16
const FORMAT_SUB = 32
const FORMAT_SUP = 64

function txt(content: string, format = 0, style = ''): ReturnType<typeof $createTextNode> {
  const node = $createTextNode(content)
  if (format) node.setFormat(format)
  if (style) node.setStyle(style)
  return node
}

function paragraph(...children: LexicalNode[]): ReturnType<typeof $createParagraphNode> {
  const node = $createParagraphNode()
  node.append(...children)
  return node
}

function alignedParagraph(
  align: '' | 'center' | 'right' | 'justify',
  ...children: LexicalNode[]
): ReturnType<typeof $createParagraphNode> {
  const node = paragraph(...children)
  if (align) node.setFormat(align)
  return node
}

function heading(tag: 'h1' | 'h2' | 'h3', content: string): ReturnType<typeof $createHeadingNode> {
  return $createHeadingNode(tag).append(txt(content))
}

function bulletList(items: string[]): ListNode {
  const list = $createListNode('bullet')
  for (const item of items) {
    list.append($createListItemNode().append(txt(item)))
  }
  return list
}

function numberedList(items: string[]): ListNode {
  const list = $createListNode('number')
  for (const item of items) {
    list.append($createListItemNode().append(txt(item)))
  }
  return list
}

function checkList(items: Array<{ text: string; checked: boolean }>): ListNode {
  const list = $createListNode('check')
  for (const item of items) {
    const listItem = $createListItemNode().append(txt(item.text))
    if (item.checked) listItem.setChecked(true)
    list.append(listItem)
  }
  return list
}

function fillLayoutColumn(layout: LayoutContainerNode, index: number, content: string): void {
  const item = layout.getChildAtIndex(index)
  if (!(item instanceof LayoutItemNode)) return
  item.clear()
  item.append(paragraph(txt(content)))
}

function collapsibleBlock(title: string, body: string): CollapsibleContainerNode {
  const container = $createCollapsibleContainerNode(true)
  const titleNode = container.getFirstChild()
  const contentNode = container.getLastChild()
  if (titleNode instanceof CollapsibleTitleNode) {
    titleNode.append(paragraph(txt(title)))
  }
  if (contentNode instanceof CollapsibleContentNode) {
    contentNode.append(paragraph(txt(body)))
  }
  return container
}

function fillTableCell(table: TableNode, row: number, col: number, value: string): void {
  const rowNode = table.getChildAtIndex(row)
  if (!(rowNode instanceof TableRowNode)) return
  const cell = rowNode.getChildAtIndex(col)
  if (!(cell instanceof TableCellNode)) return
  cell.clear()
  cell.append(paragraph(txt(value)))
}

const DOC_EDITOR_NODES = [
  HeadingNode,
  QuoteNode,
  ListNode,
  ListItemNode,
  LinkNode,
  AutoLinkNode,
  TableNode,
  TableCellNode,
  TableRowNode,
  CodeNode,
  CodeHighlightNode,
  ...DOC_EDITOR_EMBED_NODES,
]

export function buildDocLexicalFullFixture(): SerializedEditorState {
  const editor = createEditor({ namespace: 'doc-fixture-builder', nodes: DOC_EDITOR_NODES })

  editor.update(
    () => {
      const root = $getRoot()
      root.clear()

      root.append(heading('h1', 'DocEditor full feature regression'))
      root.append(heading('h2', 'Page 1 — Typography & blocks'))
      root.append(
        paragraph(
          txt('Inline mix: ', 0),
          txt('bold', FORMAT_BOLD),
          txt(', ', 0),
          txt('italic', FORMAT_ITALIC),
          txt(', ', 0),
          txt('underline', FORMAT_UNDERLINE),
          txt(', ', 0),
          txt('strike', FORMAT_STRIKE),
          txt(', ', 0),
          txt('code', FORMAT_CODE),
          txt(', H', 0),
          txt('2', FORMAT_SUB),
          txt('O & x', 0),
          txt('2', FORMAT_SUP),
          txt('.', 0),
        ),
      )
      root.append(paragraph(txt('Large accent text', 0, 'font-size: 20px; color: #1971c2;')))
      root.append(alignedParagraph('center', txt('Center-aligned paragraph for layout QA.')))
      root.append(alignedParagraph('right', txt('Right-aligned closing line on page one.')))
      root.append(bulletList(['Bullet alpha', 'Bullet beta with nested emphasis']))
      root.append(numberedList(['Numbered step one', 'Numbered step two']))
      root.append(
        checkList([
          { text: 'Checklist item — open', checked: false },
          { text: 'Checklist item — done', checked: true },
        ]),
      )
      root.append($createQuoteNode().append(txt('Blockquote: every converter path should preserve readable copy.')))
      root.append($createHorizontalRuleNode())
      root.append($createPageBreakNode())

      root.append(heading('h2', 'Page 2 — Embeds & media'))
      root.append($createEquationNode(String.raw`E = mc^2`, false))
      root.append($createStickyNoteNode(0, 0, 'yellow', 'Sticky note — drag handle regression.'))
      root.append(
        $createPollNode('Ship editor-context this quarter?', ['Yes — full matrix', 'Yes — doc only', 'Not yet']),
      )
      root.append($createDateNode('2026-07-11'))
      root.append(
        $createImageNode(
          'https://picsum.photos/seed/doc-editor/640/360',
          'Sample landscape photo',
          'image',
        ),
      )
      root.append(
        $createImageNode('https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif', 'Sample GIF', 'gif'),
      )
      root.append($createVideoEmbedNode('', 'Local video placeholder'))
      root.append($createVideoEmbedNode('dQw4w9WgXcQ', 'YouTube embed sample'))
      root.append($createPageBreakNode())

      root.append(heading('h2', 'Page 3 — Layout & structure'))
      const twoCol = $createLayoutWithTemplate('1fr 1fr')
      fillLayoutColumn(twoCol, 0, 'Left column — equal split template.')
      fillLayoutColumn(twoCol, 1, 'Right column — shares row with left.')
      root.append(twoCol)

      const threeCol = $createLayoutWithTemplate('1fr 1fr 1fr')
      fillLayoutColumn(threeCol, 0, 'Col A')
      fillLayoutColumn(threeCol, 1, 'Col B')
      fillLayoutColumn(threeCol, 2, 'Col C')
      root.append(threeCol)

      root.append(
        collapsibleBlock(
          'Collapsible release notes',
          'Collapsed body copy should round-trip through native JSON and fall back to plain text in Markdown export.',
        ),
      )

      const table = $createTableNodeWithDimensions(4, 3, true)
      fillTableCell(table, 0, 0, 'Feature')
      fillTableCell(table, 0, 1, 'Native JSON')
      fillTableCell(table, 0, 2, 'Markdown')
      fillTableCell(table, 1, 0, 'Columns')
      fillTableCell(table, 1, 1, 'Full')
      fillTableCell(table, 1, 2, 'Fallback')
      fillTableCell(table, 2, 0, 'Equation')
      fillTableCell(table, 2, 1, 'Full')
      fillTableCell(table, 2, 2, 'Fallback')
      fillTableCell(table, 3, 0, 'Poll')
      fillTableCell(table, 3, 1, 'Full')
      fillTableCell(table, 3, 2, 'Fallback')
      root.append(table)

      const code = $createCodeNode('typescript')
      code.append(txt('const envelope = createEnvelope("doc", payload)'))
      root.append(code)
      root.append($createPageBreakNode())

      root.append(heading('h2', 'Page 4 — Links & diagrams'))
      root.append(
        paragraph(
          txt('Read the ', 0),
          $createLinkNode('https://example.com/editor-context').append(txt('editor context spec', FORMAT_UNDERLINE)),
          txt(' for envelope details.', 0),
        ),
      )
      root.append(heading('h3', 'Excalidraw scene block'))
      root.append($createDocFixtureDiagramNode('excalidraw'))
      root.append(heading('h3', 'Mermaid fenced block'))
      root.append($createDocFixtureDiagramNode('mermaid'))
      root.append(
        paragraph(
          txt('End of fixture — ', 0),
          txt('4 pages', FORMAT_BOLD),
          txt(' exercising the feature map.', 0),
        ),
      )
    },
    { discrete: true },
  )

  return editor.getEditorState().toJSON()
}

export const DOC_LEXICAL_FULL = buildDocLexicalFullFixture()

export const DOC_PAGE_SETUP_FULL: PageSetup = {
  pageSize: 'Letter',
  orientation: 'portrait',
  marginInches: 1,
}

export const DOC_FULL_PAYLOAD = {
  title: 'DocEditor feature regression (4 pages)',
  pageSetup: DOC_PAGE_SETUP_FULL,
  lexical: DOC_LEXICAL_FULL,
} as const
