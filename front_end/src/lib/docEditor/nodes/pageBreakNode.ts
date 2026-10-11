import {
  $applyNodeReplacement,
  DecoratorNode,
  type DOMExportOutput,
  type EditorConfig,
  type LexicalEditor,
  type LexicalNode,
  type NodeKey,
  type SerializedLexicalNode,
  type Spread,
} from 'lexical'
import { createElement, type ReactElement } from 'react'
import { DocEditorPageBreakEmbed } from '../../../components/docEditorParts/embeds/DocEditorPageBreakEmbed'

export type SerializedPageBreakNode = Spread<{ type: 'page-break'; version: 1 }, SerializedLexicalNode>

export class PageBreakNode extends DecoratorNode<ReactElement> {
  static getType(): string {
    return 'page-break'
  }

  static clone(node: PageBreakNode): PageBreakNode {
    return new PageBreakNode(node.__key)
  }

  createDOM(config: EditorConfig): HTMLElement {
    const el = document.createElement('div')
    el.className = config.theme.pageBreak ?? 'editor-page-break'
    el.setAttribute('data-lexical-page-break', 'true')
    el.setAttribute('role', 'separator')
    el.setAttribute('aria-label', 'Page break')
    el.setAttribute('contenteditable', 'false')
    return el
  }

  updateDOM(): boolean {
    return false
  }

  decorate(): ReactElement {
    return createElement(DocEditorPageBreakEmbed, { nodeKey: this.getKey() })
  }

  exportDOM(_editor: LexicalEditor): DOMExportOutput {
    const el = document.createElement('div')
    el.className = 'doc-export-page-break'
    el.setAttribute('data-lexical-page-break', 'true')
    el.setAttribute('aria-hidden', 'true')
    return { element: el }
  }

  getTextContent(): string {
    return '\n'
  }

  static importJSON(_serialized: SerializedPageBreakNode): PageBreakNode {
    return $createPageBreakNode()
  }

  exportJSON(): SerializedPageBreakNode {
    return { type: 'page-break', version: 1 }
  }

  isInline(): boolean {
    return false
  }
}

export function $createPageBreakNode(): PageBreakNode {
  return $applyNodeReplacement(new PageBreakNode())
}

export function $isPageBreakNode(node: LexicalNode | null | undefined): node is PageBreakNode {
  return node instanceof PageBreakNode
}

export type PageBreakNodeKey = NodeKey
