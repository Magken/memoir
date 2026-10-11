export function parseYoutubeVideoId(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  try {
    const url = new URL(trimmed)
    const host = url.hostname.replace(/^www\./, '')

    if (host === 'youtu.be') {
      const id = url.pathname.slice(1).split('/')[0]
      return id || null
    }

    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
      if (url.pathname === '/watch') {
        return url.searchParams.get('v')
      }
      const embedMatch = url.pathname.match(/^\/embed\/([^/?]+)/)
      if (embedMatch) return embedMatch[1] ?? null
      const shortsMatch = url.pathname.match(/^\/shorts\/([^/?]+)/)
      if (shortsMatch) return shortsMatch[1] ?? null
    }
  } catch {
    if (/^[\w-]{11}$/.test(trimmed)) return trimmed
  }

  return null
}

export function youtubeEmbedSrc(videoId: string): string {
  const params = new URLSearchParams({
    rel: '0',
    modestbranding: '1',
    playsinline: '1',
  })
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`
}
