/** Simulated token stream for BotChat fixture replies. */

export type StreamController = {
  stop: () => void
  done: Promise<string>
}

export function streamText(
  fullText: string,
  onTick: (partial: string) => void,
  opts: { msPerChunk?: number; chunkSize?: number } = {},
): StreamController {
  const ms = opts.msPerChunk ?? 24
  const chunkSize = opts.chunkSize ?? 3
  let stopped = false
  let timer: ReturnType<typeof setTimeout> | null = null
  let index = 0

  const done = new Promise<string>((resolve) => {
    const step = () => {
      if (stopped) {
        resolve(fullText.slice(0, index))
        return
      }
      index = Math.min(fullText.length, index + chunkSize)
      onTick(fullText.slice(0, index))
      if (index >= fullText.length) {
        resolve(fullText)
        return
      }
      timer = setTimeout(step, ms)
    }
    timer = setTimeout(step, ms)
  })

  return {
    stop() {
      stopped = true
      if (timer) clearTimeout(timer)
    },
    done,
  }
}

export const BOT_DEFAULT_REPLY = `Thanks — here's a concise fixture reply.

- Composer attachments stage in a compact rail
- Enter sends, Shift+Enter inserts a newline
- Rich parts (markdown, HTML, galleries) render in the bubble

Ask for **markdown**, **html**, or a **gallery** to exercise those Theme scenarios.`
