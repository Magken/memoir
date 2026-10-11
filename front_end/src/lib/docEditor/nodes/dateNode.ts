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
import { DocEditorDateEmbed } from '../../../components/docEditorParts/embeds/DocEditorDateEmbed'

export type SerializedDateNode = Spread<
  { date: string; type: 'doc-date'; version: 1 },
  SerializedLexicalNode
>

export class DateNode extends DecoratorNode<ReactElement> {
  __date: string

  constructor(date: string, key?: NodeKey) {
    super(key)
    this.__date = date
  }

  static getType(): string {
    return 'doc-date'
  }

  static clone(node: DateNode): DateNode {
    return new DateNode(node.__date, node.__key)
  }

  createDOM(config: EditorConfig): HTMLElement {
    const span = document.createElement('span')
    span.className = config.theme.date ?? 'editor-date'
    return span
  }

  updateDOM(): boolean {
    return false
  }

  decorate(): ReactElement {
    return createElement(DocEditorDateEmbed, { nodeKey: this.getKey(), date: this.__date })
  }

  exportDOM(_editor: LexicalEditor): DOMExportOutput {
    const time = document.createElement('time')
    time.className = 'doc-export-date'
    time.dateTime = this.__date
    time.textContent = this.__date
    return { element: time }
  }

  getDate(): string {
    return this.__date
  }

  setDate(date: string): void {
    const writable = this.getWritable()
    writable.__date = date
  }

  static importJSON(serialized: SerializedDateNode): DateNode {
    return $createDateNode(serialized.date)
  }

  exportJSON(): SerializedDateNode {
    return { date: this.__date, type: 'doc-date', version: 1 }
  }

  isInline(): boolean {
    return false
  }
}

export function $createDateNode(date?: string): DateNode {
  const value = date ?? new Date().toISOString().slice(0, 10)
  return $applyNodeReplacement(new DateNode(value))
}

export function $isDateNode(node: LexicalNode | null | undefined): node is DateNode {
  return node instanceof DateNode
}
