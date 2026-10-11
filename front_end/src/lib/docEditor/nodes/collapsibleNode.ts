import {
  $applyNodeReplacement,
  $createParagraphNode,
  $getNearestNodeFromDOMNode,
  $getSiblingCaret,
  $isElementNode,
  $rewindSiblingCaret,
  ElementNode,
  type DOMExportOutput,
  type EditorConfig,
  type LexicalEditor,
  type LexicalNode,
  type RangeSelection,
  type SerializedElementNode,
  type Spread,
} from 'lexical'
import { domOnBeforeMatch, setDomHiddenUntilFound, useDivCollapsibleShell } from '../collapsibleUtils'

function syncCollapsibleToggleDom(toggle: HTMLElement, open: boolean): void {
  const label = toggle.querySelector('.editor-collapsible-toggle__label')
  if (label) label.textContent = open ? 'Collapse' : 'Expand'
  toggle.classList.toggle('editor-collapsible-toggle--open', open)
  toggle.setAttribute('aria-expanded', open ? 'true' : 'false')
}

function createCollapsibleToggleDom(editor: LexicalEditor, interactive: boolean): HTMLElement {
  const toggle = document.createElement(interactive ? 'button' : 'span')
  toggle.className = 'editor-collapsible-toggle'
  if (interactive) {
    toggle.setAttribute('type', 'button')
    toggle.addEventListener('click', (event) => {
      event.preventDefault()
      event.stopPropagation()
      editor.update(() => {
        const containerDom = toggle.closest('.editor-collapsible')
        if (!(containerDom instanceof HTMLElement)) return
        const titleDom = containerDom.querySelector(':scope > .editor-collapsible-title')
        const titleNode = titleDom ? $getNearestNodeFromDOMNode(titleDom) : null
        if ($isCollapsibleTitleNode(titleNode)) {
          const container = titleNode.getParent()
          if ($isCollapsibleContainerNode(container)) container.toggleOpen()
        }
      })
    })
  } else {
    toggle.setAttribute('aria-hidden', 'true')
  }

  const label = document.createElement('span')
  label.className = 'editor-collapsible-toggle__label'
  const icon = document.createElement('span')
  icon.className = 'editor-collapsible-toggle__icon'
  icon.setAttribute('aria-hidden', 'true')
  toggle.append(label, icon)
  return toggle
}

function placeCollapsibleContainerToggle(containerDom: HTMLElement): void {
  const titleDom = containerDom.querySelector(':scope > .editor-collapsible-title')
  const toggle = containerDom.querySelector(':scope > .editor-collapsible-toggle')
  const contentDom = containerDom.querySelector(':scope > .editor-collapsible-content')
  if (!(titleDom instanceof HTMLElement) || !(toggle instanceof HTMLElement)) return

  const strayToggle = titleDom.querySelector(':scope > .editor-collapsible-toggle')
  if (strayToggle instanceof HTMLElement) {
    titleDom.removeChild(strayToggle)
  }

  const insertBefore = contentDom ?? null
  if (toggle.previousElementSibling !== titleDom) {
    containerDom.insertBefore(toggle, insertBefore)
  }
}

function ensureCollapsibleContainerToggle(containerDom: HTMLElement, editor: LexicalEditor): void {
  let toggle = containerDom.querySelector(':scope > .editor-collapsible-toggle')
  if (!(toggle instanceof HTMLElement)) {
    toggle = createCollapsibleToggleDom(editor, true)
    containerDom.appendChild(toggle)
  }

  placeCollapsibleContainerToggle(containerDom)

  const open = containerDom.hasAttribute('open')
  syncCollapsibleToggleDom(toggle as HTMLElement, open)
}

function ensureCollapsibleSummaryToggle(summaryDom: HTMLElement, editor: LexicalEditor): void {
  let toggle = summaryDom.querySelector(':scope > .editor-collapsible-toggle')
  if (!(toggle instanceof HTMLElement)) {
    toggle = createCollapsibleToggleDom(editor, false)
    summaryDom.appendChild(toggle)
  }

  const container = summaryDom.closest('.editor-collapsible')
  const open = container instanceof HTMLDetailsElement ? container.open : container?.hasAttribute('open') ?? false
  syncCollapsibleToggleDom(toggle as HTMLElement, open)
}

export type SerializedCollapsibleContainerNode = Spread<
  { open: boolean; type: 'collapsible-container'; version: 1 },
  SerializedElementNode
>

export class CollapsibleContainerNode extends ElementNode {
  __open: boolean

  constructor(open = true, key?: string) {
    super(key)
    this.__open = open
  }

  static getType(): string {
    return 'collapsible-container'
  }

  static clone(node: CollapsibleContainerNode): CollapsibleContainerNode {
    return new CollapsibleContainerNode(node.__open, node.__key)
  }

  isShadowRoot(): boolean {
    return false
  }

  collapseAtStart(_selection: RangeSelection): boolean {
    if (!this.getOpen()) {
      if (this.getTextContent().trim() === '') {
        this.remove()
        return true
      }
      return false
    }

    const nodesToInsert: LexicalNode[] = []
    for (const child of this.getChildren()) {
      if ($isElementNode(child)) {
        nodesToInsert.push(...child.getChildren())
      }
    }
    const caret = $rewindSiblingCaret($getSiblingCaret(this, 'previous'))
    caret.splice(1, nodesToInsert)
    const [firstChild] = nodesToInsert
    if (firstChild) {
      firstChild.selectStart().deleteCharacter(true)
    }
    return true
  }

  createDOM(_config: EditorConfig, editor: LexicalEditor): HTMLElement {
    if (useDivCollapsibleShell()) {
      const dom = document.createElement('div')
      dom.className = 'editor-collapsible'
      if (this.__open) dom.setAttribute('open', '')
      ensureCollapsibleContainerToggle(dom, editor)
      return dom
    }

    const details = document.createElement('details')
    details.className = 'editor-collapsible'
    details.open = this.__open
    details.addEventListener('toggle', () => {
      const open = editor.getEditorState().read(() => this.getOpen())
      if (open !== details.open) {
        editor.update(() => this.toggleOpen())
      }
    })
    return details
  }

  updateDOM(prev: CollapsibleContainerNode, dom: HTMLElement): boolean {
    if (prev.__open !== this.__open) {
      if (useDivCollapsibleShell()) {
        const contentDom = dom.querySelector(':scope > .editor-collapsible-content')
        if (this.__open) {
          dom.setAttribute('open', '')
          if (contentDom instanceof HTMLElement) contentDom.hidden = false
        } else {
          dom.removeAttribute('open')
          if (contentDom instanceof HTMLElement) setDomHiddenUntilFound(contentDom)
        }
      } else if (dom instanceof HTMLDetailsElement) {
        dom.open = this.__open
      }
    }

    if (useDivCollapsibleShell()) {
      placeCollapsibleContainerToggle(dom)
      const toggle = dom.querySelector(':scope > .editor-collapsible-toggle')
      if (toggle instanceof HTMLElement) {
        syncCollapsibleToggleDom(toggle, this.__open)
      }
    } else {
      const titleDom = dom.querySelector(':scope > .editor-collapsible-title')
      if (titleDom instanceof HTMLElement) {
        const toggle = titleDom.querySelector(':scope > .editor-collapsible-toggle')
        if (toggle instanceof HTMLElement) syncCollapsibleToggleDom(toggle, this.__open)
      }
    }

    return false
  }

  static importJSON(serialized: SerializedCollapsibleContainerNode): CollapsibleContainerNode {
    return $createCollapsibleContainerNode(serialized.open)
  }

  exportJSON(): SerializedCollapsibleContainerNode {
    return {
      ...super.exportJSON(),
      open: this.__open,
      type: 'collapsible-container',
      version: 1,
    }
  }

  getOpen(): boolean {
    return this.getLatest().__open
  }

  setOpen(open: boolean): void {
    const writable = this.getWritable()
    writable.__open = open
  }

  toggleOpen(): void {
    this.setOpen(!this.getOpen())
  }

  exportDOM(_editor: LexicalEditor): DOMExportOutput {
    const details = document.createElement('details')
    details.className = 'doc-export-collapsible'
    if (this.__open) details.open = true
    return { element: details }
  }

  canBeEmpty(): boolean {
    return false
  }

  isInline(): boolean {
    return false
  }
}

export class CollapsibleTitleNode extends ElementNode {
  static getType(): string {
    return 'collapsible-title'
  }

  static clone(node: CollapsibleTitleNode): CollapsibleTitleNode {
    return new CollapsibleTitleNode(node.__key)
  }

  createDOM(_config: EditorConfig, editor: LexicalEditor): HTMLElement {
    if (useDivCollapsibleShell()) {
      const row = document.createElement('div')
      row.className = 'editor-collapsible-title'
      return row
    }

    const summary = document.createElement('summary')
    summary.className = 'editor-collapsible-title'
    ensureCollapsibleSummaryToggle(summary, editor)
    return summary
  }

  updateDOM(_prev: CollapsibleTitleNode, dom: HTMLElement): boolean {
    if (useDivCollapsibleShell()) {
      const strayToggle = dom.querySelector(':scope > .editor-collapsible-toggle')
      if (strayToggle instanceof HTMLElement) {
        strayToggle.remove()
      }
      if (dom.parentElement instanceof HTMLElement) {
        placeCollapsibleContainerToggle(dom.parentElement)
      }
      return false
    }

    const container = this.getLatest().getParent()
    const open = $isCollapsibleContainerNode(container) ? container.getOpen() : false
    const toggle = dom.querySelector(':scope > .editor-collapsible-toggle')
    if (toggle instanceof HTMLElement) syncCollapsibleToggleDom(toggle, open)
    return false
  }

  insertNewAfter(_selection: RangeSelection, restoreSelection = true): ElementNode {
    const containerNode = this.getParentOrThrow()
    if (!$isCollapsibleContainerNode(containerNode)) {
      throw new Error('CollapsibleTitleNode expects CollapsibleContainerNode parent')
    }

    if (containerNode.getOpen()) {
      const contentNode = this.getNextSibling()
      if (!$isCollapsibleContentNode(contentNode)) {
        throw new Error('CollapsibleTitleNode expects CollapsibleContentNode sibling')
      }
      const firstChild = contentNode.getFirstChild()
      if ($isElementNode(firstChild)) return firstChild
      const paragraph = $createParagraphNode()
      contentNode.append(paragraph)
      return paragraph
    }

    const paragraph = $createParagraphNode()
    containerNode.insertAfter(paragraph, restoreSelection)
    return paragraph
  }

  exportDOM(_editor: LexicalEditor): DOMExportOutput {
    const summary = document.createElement('summary')
    summary.className = 'doc-export-collapsible-title'
    return { element: summary }
  }

  static importJSON(): CollapsibleTitleNode {
    return $createCollapsibleTitleNode()
  }

  exportJSON(): SerializedElementNode & { type: 'collapsible-title'; version: 1 } {
    return { ...super.exportJSON(), type: 'collapsible-title', version: 1 }
  }

  canBeEmpty(): boolean {
    return false
  }
}

export class CollapsibleContentNode extends ElementNode {
  static getType(): string {
    return 'collapsible-content'
  }

  static clone(node: CollapsibleContentNode): CollapsibleContentNode {
    return new CollapsibleContentNode(node.__key)
  }

  createDOM(_config: EditorConfig, editor: LexicalEditor): HTMLElement {
    const dom = document.createElement('div')
    dom.className = 'editor-collapsible-content'
    dom.setAttribute('data-lexical-collapsible-content', 'true')

    if (useDivCollapsibleShell()) {
      const parent = this.getParent()
      if ($isCollapsibleContainerNode(parent) && !parent.getOpen()) {
        setDomHiddenUntilFound(dom)
      }
      domOnBeforeMatch(dom, () => {
        editor.update(() => {
          const containerNode = this.getParent()?.getLatest()
          if ($isCollapsibleContainerNode(containerNode) && !containerNode.getOpen()) {
            containerNode.toggleOpen()
          }
        })
      })
    }

    return dom
  }

  updateDOM(): boolean {
    return false
  }

  exportDOM(_editor: LexicalEditor): DOMExportOutput {
    const div = document.createElement('div')
    div.className = 'doc-export-collapsible-content'
    return { element: div }
  }

  isShadowRoot(): boolean {
    return true
  }

  static importJSON(): CollapsibleContentNode {
    return $createCollapsibleContentNode()
  }

  exportJSON(): SerializedElementNode & { type: 'collapsible-content'; version: 1 } {
    return { ...super.exportJSON(), type: 'collapsible-content', version: 1 }
  }

  canBeEmpty(): boolean {
    return false
  }
}

export function $createCollapsibleTitleNode(): CollapsibleTitleNode {
  const node = $applyNodeReplacement(new CollapsibleTitleNode())
  node.append($createParagraphNode())
  return node
}

export function $createCollapsibleContentNode(): CollapsibleContentNode {
  const node = $applyNodeReplacement(new CollapsibleContentNode())
  node.append($createParagraphNode())
  return node
}

export function $createCollapsibleContainerNode(open = true): CollapsibleContainerNode {
  const container = $applyNodeReplacement(new CollapsibleContainerNode(open))
  container.append($createCollapsibleTitleNode())
  container.append($createCollapsibleContentNode())
  return container
}

export function $isCollapsibleContainerNode(
  node: LexicalNode | null | undefined,
): node is CollapsibleContainerNode {
  return node instanceof CollapsibleContainerNode
}

export function $isCollapsibleTitleNode(
  node: LexicalNode | null | undefined,
): node is CollapsibleTitleNode {
  return node instanceof CollapsibleTitleNode
}

export function $isCollapsibleContentNode(
  node: LexicalNode | null | undefined,
): node is CollapsibleContentNode {
  return node instanceof CollapsibleContentNode
}
