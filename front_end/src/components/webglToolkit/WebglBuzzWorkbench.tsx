/**
 * Buzz workbench on `/WGLTOOLKIT?page=buzz`.
 * Detects DataFeel Dots through `/api/haptics` and buzzes the one a button names.
 */
import { useEffect, useState } from 'react'
import { Button } from '../Button'
import { buzzBody, parseHapticDots, type HapticDot } from '../../lib/haptics/hapticsClient'

type WebglBuzzWorkbenchProps = {
  open?: boolean
}

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: unknown }
    if (typeof body.error === 'string') return body.error
  } catch {
    /* the proxy sometimes returns an empty body */
  }
  return 'The buzz API did not answer. Start it on port 5288.'
}

export function WebglBuzzWorkbench({ open = true }: WebglBuzzWorkbenchProps) {
  const [dots, setDots] = useState<HapticDot[]>([])
  const [note, setNote] = useState('Detecting Dots')
  const [busy, setBusy] = useState(false)

  async function detect() {
    setBusy(true)
    setNote('Detecting Dots')
    try {
      const response = await fetch('/api/haptics/dots')
      if (!response.ok) throw new Error(await readError(response))
      const found = parseHapticDots(await response.json())
      setDots(found.dots)
      setNote(found.dots.length === 0 ? `No Dot on ${found.port}` : `${found.dots.length} on ${found.port}`)
    } catch (error) {
      setDots([])
      setNote(error instanceof Error ? error.message : 'Detect failed')
    } finally {
      setBusy(false)
    }
  }

  async function buzz(address?: number) {
    setBusy(true)
    setNote(address === undefined ? 'Buzzing all' : `Buzzing Dot ${address}`)
    try {
      const response = await fetch('/api/haptics/buzz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buzzBody(address)),
      })
      if (!response.ok) throw new Error(await readError(response))
      setNote(address === undefined ? 'All Dots buzzed' : `Dot ${address} buzzed`)
    } catch (error) {
      setNote(error instanceof Error ? error.message : 'Buzz failed')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (!open) return
    void detect()
  }, [open])

  return (
    <section className="theme-webgl-toolkit__panel theme-webgl-toolkit__panel--open" aria-labelledby="webgl-buzz-title">
      <div className="theme-webgl-toolkit__chrome">
        <header className="theme-webgl-toolkit__titlebar">
          <h2 id="webgl-buzz-title" className="theme-webgl-toolkit__title">
            Buzz
          </h2>
          <div className="theme-webgl-toolkit__title-spacer" aria-hidden />
          <Button type="button" size="xs" variant="ghost" labelAnim={false} disabled={busy} onClick={() => void detect()}>
            Detect
          </Button>
          <Button type="button" size="xs" variant="ghost" labelAnim={false} disabled={busy || dots.length === 0} onClick={() => void buzz()}>
            Buzz all
          </Button>
        </header>
      </div>
      {open ? (
        <div className="theme-webgl-toolkit__viewport">
          <div className="flex flex-wrap gap-2 p-4">
            {dots.map((dot) => (
              <Button
                key={dot.address}
                type="button"
                size="sm"
                labelAnim={false}
                disabled={busy}
                onClick={() => void buzz(dot.address)}
              >
                {`Dot ${dot.address}`}
              </Button>
            ))}
          </div>
          <p className="theme-webgl-toolkit__status font-mono text-[0.65rem] mb-0">{note}</p>
        </div>
      ) : null}
    </section>
  )
}
