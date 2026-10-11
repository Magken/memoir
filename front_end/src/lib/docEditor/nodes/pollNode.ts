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
import { DocEditorPollEmbed } from '../../../components/docEditorParts/embeds/DocEditorPollEmbed'

export type SerializedPollNode = Spread<
  { options: string[]; question: string; type: 'poll'; version: 1 },
  SerializedLexicalNode
>

export class PollNode extends DecoratorNode<ReactElement> {
  __question: string
  __options: string[]

  constructor(question: string, options: string[], key?: NodeKey) {
    super(key)
    this.__question = question
    this.__options = options
  }

  static getType(): string {
    return 'poll'
  }

  static clone(node: PollNode): PollNode {
    return new PollNode(node.__question, [...node.__options], node.__key)
  }

  createDOM(config: EditorConfig): HTMLElement {
    const span = document.createElement('span')
    span.className = config.theme.poll ?? 'editor-poll'
    return span
  }

  updateDOM(): boolean {
    return false
  }

  decorate(): ReactElement {
    return createElement(DocEditorPollEmbed, {
      nodeKey: this.getKey(),
      question: this.__question,
      options: this.__options,
    })
  }

  exportDOM(_editor: LexicalEditor): DOMExportOutput {
    const div = document.createElement('div')
    div.className = 'doc-export-poll'
    const question = document.createElement('p')
    question.className = 'doc-export-poll__question'
    question.textContent = this.__question
    const list = document.createElement('ul')
    list.className = 'doc-export-poll__options'
    for (const option of this.__options) {
      const item = document.createElement('li')
      item.textContent = option
      list.appendChild(item)
    }
    div.append(question, list)
    return { element: div }
  }

  getQuestion(): string {
    return this.__question
  }

  getOptions(): string[] {
    return this.__options
  }

  setQuestion(question: string): void {
    const writable = this.getWritable()
    writable.__question = question
  }

  setOptions(options: string[]): void {
    const writable = this.getWritable()
    writable.__options = options
  }

  static importJSON(serialized: SerializedPollNode): PollNode {
    return $createPollNode(serialized.question, serialized.options)
  }

  exportJSON(): SerializedPollNode {
    return {
      options: this.__options,
      question: this.__question,
      type: 'poll',
      version: 1,
    }
  }

  isInline(): boolean {
    return false
  }
}

export function $createPollNode(
  question = 'Poll question',
  options: string[] = ['Option 1', 'Option 2'],
): PollNode {
  return $applyNodeReplacement(new PollNode(question, options))
}

export function $isPollNode(node: LexicalNode | null | undefined): node is PollNode {
  return node instanceof PollNode
}
