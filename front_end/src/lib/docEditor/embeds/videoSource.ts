import { parseYoutubeVideoId } from './youtubeUrl'

export type VideoEmbedMode = 'youtube' | 'file' | 'empty'

export function resolveVideoEmbedMode(videoId: string): VideoEmbedMode {
  if (!videoId) return 'empty'
  if (videoId.startsWith('blob:') || videoId.startsWith('data:video/')) return 'file'
  if (/\.(mp4|webm|ogg|mov)(\?|$)/i.test(videoId)) return 'file'
  if (parseYoutubeVideoId(videoId) || /^[\w-]{11}$/.test(videoId)) return 'youtube'
  return 'youtube'
}
