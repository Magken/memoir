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
import katex from 'katex'
import { createElement, type ReactElement } from 'react'
import { DocEditorEquationEmbed } from '../../../components/docEditorParts/embeds/DocEditorEquationEmbed'

export type SerializedEquationNode = Spread<
  { draft?: boolean; latex: string; type: 'equation'; version: 1 },
  SerializedLexicalNode
>

export class EquationNode extends DecoratorNode<ReactElement> {
  __latex: string
  __draft: boolean

  constructor(latex: string, draft = false, key?: NodeKey) {
    super(key)
    this.__latex = latex
    this.__draft = draft
  }

  static getType(): string {
    return 'equation'
  }

  static clone(node: EquationNode): EquationNode {
    return new EquationNode(node.__latex, node.__draft, node.__key)
  }

  createDOM(config: EditorConfig): HTMLElement {
    const span = document.createElement('span')
    span.className = config.theme.equation ?? 'editor-equation'
    return span
  }

  updateDOM(): boolean {
    return false
  }

  decorate(): ReactElement {
    return createElement(DocEditorEquationEmbed, {
      nodeKey: this.getKey(),
      latex: this.__latex,
      draft: this.__draft,
    })
  }

  exportDOM(_editor: LexicalEditor): DOMExportOutput {
    const div = document.createElement('div')
    div.className = 'doc-export-equation'
    if (this.__latex.trim()) {
      try {
        div.innerHTML = katex.renderToString(this.__latex, { displayMode: true, throwOnError: false })
      } catch {
        div.textContent = this.__latex
      }
    }
    return { element: div }
  }

  getLatex(): string {
    return this.__latex
  }

  getDraft(): boolean {
    return this.__draft
  }

  setLatex(latex: string): void {
    const writable = this.getWritable()
    writable.__latex = latex
  }

  setDraft(draft: boolean): void {
    const writable = this.getWritable()
    writable.__draft = draft
  }

  static importJSON(serialized: SerializedEquationNode): EquationNode {
    return $createEquationNode(serialized.latex, serialized.draft ?? false)
  }

  exportJSON(): SerializedEquationNode {
    return {
      draft: this.__draft || undefined,
      latex: this.__latex,
      type: 'equation',
      version: 1,
    }
  }

  isInline(): boolean {
    return false
  }
}

export function $createEquationNode(latex = '', draft = false): EquationNode {
  return $applyNodeReplacement(new EquationNode(latex, draft))
}

export function $isEquationNode(node: LexicalNode | null | undefined): node is EquationNode {
  return node instanceof EquationNode
}
