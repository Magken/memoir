import { useLexicalEditable } from '@lexical/react/useLexicalEditable'
import { VideoEmbedBlock } from '../../VideoEmbedBlock'
import { resolveVideoEmbedMode } from '../../../lib/docEditor/embeds/videoSource'

type DocEditorVideoEmbedProps = {
  title: string
  videoId: string
}

export function DocEditorVideoEmbed({ title, videoId }: DocEditorVideoEmbedProps) {
  const isEditable = useLexicalEditable()
  const mode = resolveVideoEmbedMode(videoId)

  if (mode === 'empty' && isEditable) {
    return (
      <div className="editor-video-embed editor-video-embed--empty">
        <p className="type-caption type-muted">Video — use Insert to add a file or URL</p>
      </div>
    )
  }

  return (
    <div className="editor-video-embed">
      <VideoEmbedBlock videoId={videoId} title={title} />
    </div>
  )
}
