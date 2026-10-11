import { useLexicalEditable } from '@lexical/react/useLexicalEditable'
import type { ImageMediaKind } from '../../../lib/docEditor/nodes/imageNode'

type DocEditorImageEmbedProps = {
  altText: string
  mediaKind: ImageMediaKind
  src: string
}

export function DocEditorImageEmbed({ altText, mediaKind, src }: DocEditorImageEmbedProps) {
  const isEditable = useLexicalEditable()

  if (!src && isEditable) {
    return (
      <div className="editor-image editor-image--empty">
        <p className="type-caption type-muted">
          {mediaKind === 'gif' ? 'GIF' : 'Image'} — use Insert to add a file or URL
        </p>
      </div>
    )
  }

  return (
    <figure className={['editor-image', mediaKind === 'gif' ? 'editor-image--gif' : ''].filter(Boolean).join(' ')}>
      <img src={src} alt={altText || (mediaKind === 'gif' ? 'GIF' : 'Image')} />
    </figure>
  )
}
