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
import { DocEditorVideoEmbed } from '../../../components/docEditorParts/embeds/DocEditorVideoEmbed'

export type SerializedVideoEmbedNode = Spread<
  { title: string; videoId: string; type: 'video-embed'; version: 1 },
  SerializedLexicalNode
>

export class VideoEmbedNode extends DecoratorNode<ReactElement> {
  __videoId: string
  __title: string

  constructor(videoId: string, title: string, key?: NodeKey) {
    super(key)
    this.__videoId = videoId
    this.__title = title
  }

  static getType(): string {
    return 'video-embed'
  }

  static clone(node: VideoEmbedNode): VideoEmbedNode {
    return new VideoEmbedNode(node.__videoId, node.__title, node.__key)
  }

  createDOM(config: EditorConfig): HTMLElement {
    const span = document.createElement('span')
    span.className = config.theme.videoEmbed ?? 'editor-video-embed'
    return span
  }

  updateDOM(): boolean {
    return false
  }

  decorate(): ReactElement {
    return createElement(DocEditorVideoEmbed, {
      videoId: this.__videoId,
      title: this.__title,
    })
  }

  exportDOM(_editor: LexicalEditor): DOMExportOutput {
    const link = document.createElement('a')
    link.className = 'doc-export-video-link'
    link.href = this.__videoId
      ? `https://www.youtube.com/watch?v=${encodeURIComponent(this.__videoId)}`
      : '#'
    link.textContent = this.__title || 'Watch video'
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    return { element: link }
  }

  getVideoId(): string {
    return this.__videoId
  }

  getTitle(): string {
    return this.__title
  }

  setVideoId(videoId: string): void {
    const writable = this.getWritable()
    writable.__videoId = videoId
  }

  setTitle(title: string): void {
    const writable = this.getWritable()
    writable.__title = title
  }

  static importJSON(serialized: SerializedVideoEmbedNode): VideoEmbedNode {
    return $createVideoEmbedNode(serialized.videoId, serialized.title)
  }

  exportJSON(): SerializedVideoEmbedNode {
    return {
      title: this.__title,
      type: 'video-embed',
      version: 1,
      videoId: this.__videoId,
    }
  }

  isInline(): boolean {
    return false
  }
}

export function $createVideoEmbedNode(videoId: string, title = 'YouTube video'): VideoEmbedNode {
  return $applyNodeReplacement(new VideoEmbedNode(videoId, title))
}

export function $isVideoEmbedNode(node: LexicalNode | null | undefined): node is VideoEmbedNode {
  return node instanceof VideoEmbedNode
}
