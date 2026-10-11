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
import { DocEditorStickyNoteEmbed } from '../../../components/docEditorParts/embeds/DocEditorStickyNoteEmbed'

export type StickyNoteColor = 'yellow' | 'pink'

export type SerializedStickyNoteNode = Spread<
  {
    caption: string
    color: StickyNoteColor
    type: 'sticky-note'
    version: 2
    xOffset: number
    yOffset: number
  },
  SerializedLexicalNode
>

export class StickyNoteNode extends DecoratorNode<ReactElement> {
  __x: number
  __y: number
  __color: StickyNoteColor
  __caption: string

  constructor(
    xOffset = 0,
    yOffset = 0,
    color: StickyNoteColor = 'yellow',
    caption = '',
    key?: NodeKey,
  ) {
    super(key)
    this.__x = xOffset
    this.__y = yOffset
    this.__color = color
    this.__caption = caption
  }

  static getType(): string {
    return 'sticky-note'
  }

  static clone(node: StickyNoteNode): StickyNoteNode {
    return new StickyNoteNode(node.__x, node.__y, node.__color, node.__caption, node.__key)
  }

  createDOM(_config: EditorConfig): HTMLElement {
    const div = document.createElement('div')
    div.style.display = 'contents'
    return div
  }

  updateDOM(): boolean {
    return false
  }

  decorate(): ReactElement {
    return createElement(DocEditorStickyNoteEmbed, {
      caption: this.__caption,
      color: this.__color,
      nodeKey: this.getKey(),
      x: this.__x,
      y: this.__y,
    })
  }

  exportDOM(_editor: LexicalEditor): DOMExportOutput {
    const aside = document.createElement('aside')
    aside.className = `doc-export-sticky doc-export-sticky--${this.__color}`
    aside.textContent = this.__caption || 'Sticky note'
    return { element: aside }
  }

  isIsolated(): boolean {
    return true
  }

  getPosition(): { x: number; y: number } {
    return { x: this.__x, y: this.__y }
  }

  setPosition(x: number, y: number): void {
    const writable = this.getWritable()
    writable.__x = x
    writable.__y = y
  }

  toggleColor(): void {
    const writable = this.getWritable()
    writable.__color = writable.__color === 'yellow' ? 'pink' : 'yellow'
  }

  getCaption(): string {
    return this.__caption
  }

  setCaption(caption: string): void {
    const writable = this.getWritable()
    writable.__caption = caption
  }

  static importJSON(serialized: SerializedStickyNoteNode): StickyNoteNode {
    return $createStickyNoteNode(serialized.xOffset, serialized.yOffset, serialized.color, serialized.caption)
  }

  exportJSON(): SerializedStickyNoteNode {
    return {
      caption: this.__caption,
      color: this.__color,
      type: 'sticky-note',
      version: 2,
      xOffset: this.__x,
      yOffset: this.__y,
    }
  }

  isInline(): boolean {
    return false
  }
}

export function $createStickyNoteNode(
  xOffset = 20,
  yOffset = 20,
  color: StickyNoteColor = 'yellow',
  caption = '',
): StickyNoteNode {
  return $applyNodeReplacement(new StickyNoteNode(xOffset, yOffset, color, caption))
}

export function $isStickyNoteNode(node: LexicalNode | null | undefined): node is StickyNoteNode {
  return node instanceof StickyNoteNode
}
