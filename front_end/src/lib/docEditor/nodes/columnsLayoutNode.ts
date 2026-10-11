import {
  $applyNodeReplacement,
  $createParagraphNode,
  $getNodeByKey,
  $isParagraphNode,
  addClassNamesToElement,
  ElementNode,
  type DOMExportOutput,
  type EditorConfig,
  type LexicalEditor,
  type LexicalNode,
  type NodeKey,
  type SerializedElementNode,
  type Spread,
} from 'lexical'

const layoutContainerEditors = new Map<NodeKey, LexicalEditor>()

function ensureLayoutRemoveButton(dom: HTMLElement, editor: LexicalEditor, nodeKey: NodeKey): void {
  if (dom.querySelector(':scope > .editor-layout-container__remove')) return

  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'editor-layout-container__remove'
  button.setAttribute('aria-label', 'Remove column layout')
  button.textContent = 'Remove layout'
  button.addEventListener('click', (event) => {
    event.preventDefault()
    event.stopPropagation()
    editor.update(() => {
      const node = $getNodeByKey(nodeKey)
      if ($isLayoutContainerNode(node)) $deleteLayoutContainer(node)
    })
  })
  dom.appendChild(button)
}

export function $deleteLayoutContainer(container: LayoutContainerNode): void {
  const extracted: LexicalNode[] = []
  for (const item of container.getChildren()) {
    if ($isLayoutItemNode(item)) {
      extracted.push(...item.getChildren())
    }
  }

  if (extracted.length === 0) {
    container.insertBefore($createParagraphNode())
  } else {
    for (let index = extracted.length - 1; index >= 0; index -= 1) {
      container.insertBefore(extracted[index]!)
    }
  }

  container.remove()
}

export type SerializedLayoutContainerNode = Spread<
  { templateColumns: string; type: 'layout-container'; version: 2 },
  SerializedElementNode
>

export class LayoutContainerNode extends ElementNode {
  __templateColumns: string

  constructor(templateColumns = '1fr 1fr', key?: string) {
    super(key)
    this.__templateColumns = templateColumns
  }

  static getType(): string {
    return 'layout-container'
  }

  static clone(node: LayoutContainerNode): LayoutContainerNode {
    return new LayoutContainerNode(node.__templateColumns, node.__key)
  }

  createDOM(config: EditorConfig, editor: LexicalEditor): HTMLElement {
    const dom = document.createElement('div')
    dom.style.gridTemplateColumns = this.__templateColumns
    dom.setAttribute('data-lexical-layout-container', 'true')
    addClassNamesToElement(dom, config.theme.layoutContainer ?? 'editor-layout-container')
    layoutContainerEditors.set(this.getKey(), editor)
    ensureLayoutRemoveButton(dom, editor, this.getKey())
    return dom
  }

  updateDOM(prev: LayoutContainerNode, dom: HTMLElement): boolean {
    if (prev.__templateColumns !== this.__templateColumns) {
      dom.style.gridTemplateColumns = this.__templateColumns
    }

    const editor = layoutContainerEditors.get(this.getKey())
    if (editor) ensureLayoutRemoveButton(dom, editor, this.getKey())

    return false
  }

  static importJSON(serialized: SerializedLayoutContainerNode): LayoutContainerNode {
    return $createLayoutContainerNode(serialized.templateColumns)
  }

  exportJSON(): SerializedLayoutContainerNode {
    return {
      ...super.exportJSON(),
      templateColumns: this.__templateColumns,
      type: 'layout-container',
      version: 2,
    }
  }

  getTemplateColumns(): string {
    return this.getLatest().__templateColumns
  }

  setTemplateColumns(templateColumns: string): void {
    const writable = this.getWritable()
    writable.__templateColumns = templateColumns
  }

  exportDOM(_editor: LexicalEditor): DOMExportOutput {
    const div = document.createElement('div')
    div.className = 'doc-export-layout'
    div.style.display = 'grid'
    div.style.gridTemplateColumns = this.__templateColumns
    div.style.gap = '1rem'
    return { element: div }
  }

  isShadowRoot(): boolean {
    return true
  }

  canBeEmpty(): boolean {
    return false
  }
}

export type SerializedLayoutItemNode = Spread<{ type: 'layout-item'; version: 1 }, SerializedElementNode>

export function $isEmptyLayoutItemNode(node: LexicalNode): boolean {
  if (!$isLayoutItemNode(node) || node.getChildrenSize() !== 1) return false
  const firstChild = node.getFirstChild()
  return $isParagraphNode(firstChild) && firstChild.isEmpty()
}

export class LayoutItemNode extends ElementNode {
  static getType(): string {
    return 'layout-item'
  }

  static clone(node: LayoutItemNode): LayoutItemNode {
    return new LayoutItemNode(node.__key)
  }

  createDOM(config: EditorConfig): HTMLElement {
    const dom = document.createElement('div')
    dom.setAttribute('data-lexical-layout-item', 'true')
    addClassNamesToElement(dom, config.theme.layoutItem ?? 'editor-layout-item')
    return dom
  }

  updateDOM(): boolean {
    return false
  }

  exportDOM(_editor: LexicalEditor): DOMExportOutput {
    const div = document.createElement('div')
    div.className = 'doc-export-layout-item'
    return { element: div }
  }

  static importJSON(_serialized: SerializedLayoutItemNode): LayoutItemNode {
    return $createLayoutItemNode()
  }

  exportJSON(): SerializedLayoutItemNode {
    return { ...super.exportJSON(), type: 'layout-item', version: 1 }
  }

  collapseAtStart(): boolean {
    const parent = this.getParentOrThrow()
    if (
      this.is(parent.getFirstChild()) &&
      parent.getChildren().every($isEmptyLayoutItemNode)
    ) {
      parent.remove()
      return true
    }
    return false
  }

  isShadowRoot(): boolean {
    return true
  }

  canBeEmpty(): boolean {
    return false
  }
}

export function $createLayoutContainerNode(templateColumns = '1fr 1fr'): LayoutContainerNode {
  return $applyNodeReplacement(new LayoutContainerNode(templateColumns))
}

export function $createLayoutItemNode(): LayoutItemNode {
  return $applyNodeReplacement(new LayoutItemNode())
}

export function $createLayoutWithTemplate(templateColumns: string): LayoutContainerNode {
  const container = $createLayoutContainerNode(templateColumns)
  const count = templateColumns.trim().split(/\s+/).length
  for (let i = 0; i < count; i++) {
    const item = $createLayoutItemNode()
    item.append($createParagraphNode())
    container.append(item)
  }
  return container
}

export function $isLayoutContainerNode(
  node: LexicalNode | null | undefined,
): node is LayoutContainerNode {
  return node instanceof LayoutContainerNode
}

export function $isLayoutItemNode(node: LexicalNode | null | undefined): node is LayoutItemNode {
  return node instanceof LayoutItemNode
}
