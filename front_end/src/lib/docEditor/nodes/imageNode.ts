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
import { DocEditorImageEmbed } from '../../../components/docEditorParts/embeds/DocEditorImageEmbed'

export type ImageMediaKind = 'image' | 'gif'

export type SerializedImageNode = Spread<
  {
    altText: string
    mediaKind: ImageMediaKind
    src: string
    type: 'doc-image'
    version: 1
  },
  SerializedLexicalNode
>

export class ImageNode extends DecoratorNode<ReactElement> {
  __src: string
  __altText: string
  __mediaKind: ImageMediaKind

  constructor(src: string, altText: string, mediaKind: ImageMediaKind, key?: NodeKey) {
    super(key)
    this.__src = src
    this.__altText = altText
    this.__mediaKind = mediaKind
  }

  static getType(): string {
    return 'doc-image'
  }

  static clone(node: ImageNode): ImageNode {
    return new ImageNode(node.__src, node.__altText, node.__mediaKind, node.__key)
  }

  createDOM(config: EditorConfig): HTMLElement {
    const span = document.createElement('span')
    span.className = config.theme.image ?? 'editor-image'
    return span
  }

  updateDOM(): boolean {
    return false
  }

  decorate(): ReactElement {
    return createElement(DocEditorImageEmbed, {
      src: this.__src,
      altText: this.__altText,
      mediaKind: this.__mediaKind,
    })
  }

  exportDOM(_editor: LexicalEditor): DOMExportOutput {
    const figure = document.createElement('figure')
    figure.className = 'doc-export-image'
    const img = document.createElement('img')
    img.src = this.__src
    img.alt = this.__altText
    figure.appendChild(img)
    return { element: figure }
  }

  getSrc(): string {
    return this.__src
  }

  getAltText(): string {
    return this.__altText
  }

  getMediaKind(): ImageMediaKind {
    return this.__mediaKind
  }

  setSrc(src: string): void {
    const writable = this.getWritable()
    writable.__src = src
  }

  setAltText(altText: string): void {
    const writable = this.getWritable()
    writable.__altText = altText
  }

  static importJSON(serialized: SerializedImageNode): ImageNode {
    return $createImageNode(serialized.src, serialized.altText, serialized.mediaKind)
  }

  exportJSON(): SerializedImageNode {
    return {
      altText: this.__altText,
      mediaKind: this.__mediaKind,
      src: this.__src,
      type: 'doc-image',
      version: 1,
    }
  }

  isInline(): boolean {
    return false
  }
}

export function $createImageNode(
  src: string,
  altText = '',
  mediaKind: ImageMediaKind = 'image',
): ImageNode {
  return $applyNodeReplacement(new ImageNode(src, altText, mediaKind))
}

export function $isImageNode(node: LexicalNode | null | undefined): node is ImageNode {
  return node instanceof ImageNode
}
