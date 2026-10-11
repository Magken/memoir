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
import { DocEditorDiagramEmbed } from '../../../components/docEditorParts/embeds/DocEditorDiagramEmbed'
import type { DocDiagramCodeLanguage } from '../diagramCodeLanguages'
import { docDiagramCodeLanguageLabel } from '../diagramCodeLanguages'

export type SerializedDiagramCodeNode = Spread<
  {
    height?: number
    language: DocDiagramCodeLanguage
    leftOffset?: number
    source: string
    type: 'diagram-code'
    version: 1
    width?: number
  },
  SerializedLexicalNode
>

export class DiagramCodeNode extends DecoratorNode<ReactElement> {
  __language: DocDiagramCodeLanguage
  __source: string
  __width: number | undefined
  __height: number | undefined
  __leftOffset: number | undefined

  constructor(
    language: DocDiagramCodeLanguage,
    source: string,
    width?: number,
    height?: number,
    leftOffset?: number,
    key?: NodeKey,
  ) {
    super(key)
    this.__language = language
    this.__source = source
    this.__width = width
    this.__height = height
    this.__leftOffset = leftOffset
  }

  static getType(): string {
    return 'diagram-code'
  }

  static clone(node: DiagramCodeNode): DiagramCodeNode {
    return new DiagramCodeNode(
      node.__language,
      node.__source,
      node.__width,
      node.__height,
      node.__leftOffset,
      node.__key,
    )
  }

  createDOM(config: EditorConfig): HTMLElement {
    const div = document.createElement('div')
    div.className = config.theme.diagramCode ?? 'editor-diagram-code-host'
    div.setAttribute('data-diagram-language', this.__language)
    div.setAttribute('contenteditable', 'false')
    return div
  }

  updateDOM(prevNode: DiagramCodeNode): boolean {
    return prevNode.__language !== this.__language
  }

  decorate(): ReactElement {
    return createElement(DocEditorDiagramEmbed, { nodeKey: this.getKey() })
  }

  exportDOM(_editor: LexicalEditor): DOMExportOutput {
    const figure = document.createElement('figure')
    figure.className = 'doc-export-diagram'
    figure.setAttribute('data-export-node-key', this.getKey())
    figure.setAttribute('data-diagram-language', this.__language)
    const caption = document.createElement('figcaption')
    caption.textContent = docDiagramCodeLanguageLabel(this.__language)
    caption.className = 'doc-export-diagram__caption'
    figure.appendChild(caption)
    return { element: figure }
  }

  getLanguage(): DocDiagramCodeLanguage {
    return this.__language
  }

  getSource(): string {
    return this.__source
  }

  setSource(source: string): void {
    const writable = this.getWritable()
    writable.__source = source
  }

  getBlockWidth(): number | undefined {
    return this.__width
  }

  getBlockHeight(): number | undefined {
    return this.__height
  }

  getLeftOffset(): number | undefined {
    return this.__leftOffset
  }

  setBlockSize(width: number, height: number, leftOffset: number): void {
    const writable = this.getWritable()
    writable.__width = width
    writable.__height = height
    writable.__leftOffset = leftOffset
  }

  getTextContent(): string {
    return this.__source
  }

  static importJSON(serialized: SerializedDiagramCodeNode): DiagramCodeNode {
    return $createDiagramCodeNode(
      serialized.language,
      serialized.source,
      serialized.width,
      serialized.height,
      serialized.leftOffset,
    )
  }

  exportJSON(): SerializedDiagramCodeNode {
    return {
      height: this.__height,
      language: this.__language,
      leftOffset: this.__leftOffset,
      source: this.__source,
      type: 'diagram-code',
      version: 1,
      width: this.__width,
    }
  }

  isInline(): boolean {
    return false
  }
}

export function $createDiagramCodeNode(
  language: DocDiagramCodeLanguage,
  source: string,
  width?: number,
  height?: number,
  leftOffset?: number,
): DiagramCodeNode {
  return $applyNodeReplacement(new DiagramCodeNode(language, source, width, height, leftOffset))
}

export function $isDiagramCodeNode(node: LexicalNode | null | undefined): node is DiagramCodeNode {
  return node instanceof DiagramCodeNode
}
