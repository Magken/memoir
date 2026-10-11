/**
 * Dot Pad workbench on `/WGLTOOLKIT?page=dotpad`.
 * Loads the Web SDK when the page opens, then connects on the button click.
 */
import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '../Button'
import { Input } from '../Input'
import {
  brailleLine,
  connectDotPad,
  loadDotPadBridge,
  type DotPadBridge,
  type DotPadDevice,
  type DotPadLink,
} from '../../lib/dotpad/dotpadClient'

type WebglDotPadWorkbenchProps = {
  open?: boolean
}

export function WebglDotPadWorkbench({ open = true }: WebglDotPadWorkbenchProps) {
  const [bridge, setBridge] = useState<DotPadBridge | null>(null)
  const [device, setDevice] = useState<DotPadDevice | null>(null)
  const [text, setText] = useState('')
  const [note, setNote] = useState('Loading Dot Pad')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    let stop = false
    loadDotPadBridge()
      .then((next) => {
        if (stop) return
        next.setCallBack((pad, code) => {
          if (code !== 'Disconnected') return
          setDevice((current) => (current === pad ? null : current))
          setNote('Dot Pad disconnected')
        })
        setBridge(next)
        setNote('Connect the Dot Pad in Chrome')
      })
      .catch((error: unknown) => {
        if (stop) return
        setNote(error instanceof Error ? error.message : 'Dot Pad SDK failed to load')
      })
    return () => {
      stop = true
    }
  }, [open])

  async function connect(link: DotPadLink) {
    if (!bridge) return
    setBusy(true)
    setNote(link === 'usb' ? 'Choose the Dot Pad USB port' : 'Choose the Dot Pad Bluetooth device')
    try {
      const live = await connectDotPad(bridge, link, (pad, code) => {
        if (code !== 'Disconnected') return
        setDevice((current) => (current === pad ? null : current))
        setNote('Dot Pad disconnected')
      })
      setDevice(live)
      setNote(`Dot Pad ready · ${live.numberCellColumns}×${live.numberCellRows} graphic · ${live.numberBrailleCellColumns} braille cells`)
    } catch (error) {
      setDevice(null)
      setNote(error instanceof Error ? error.message : 'Dot Pad did not connect')
    } finally {
      setBusy(false)
    }
  }

  async function send(event: FormEvent) {
    event.preventDefault()
    if (!bridge || !device) return
    setBusy(true)
    try {
      const line = brailleLine(text)
      await bridge.showText(line, device)
      setNote(`Sent ${line}`)
    } catch (error) {
      setNote(error instanceof Error ? error.message : 'Send failed')
    } finally {
      setBusy(false)
    }
  }

  function pins(up: boolean) {
    if (!bridge || !device) return
    if (up) bridge.pinsUp(device)
    else bridge.pinsDown(device)
    setNote(up ? 'All pins up' : 'All pins down')
  }

  return (
    <section className="theme-webgl-toolkit__panel theme-webgl-toolkit__panel--open" aria-labelledby="webgl-dotpad-title">
      <div className="theme-webgl-toolkit__chrome">
        <header className="theme-webgl-toolkit__titlebar">
          <h2 id="webgl-dotpad-title" className="theme-webgl-toolkit__title">
            Dot Pad
          </h2>
          <div className="theme-webgl-toolkit__title-spacer" aria-hidden />
          <Button type="button" size="xs" variant="ghost" labelAnim={false} disabled={busy || !bridge} onClick={() => void connect('usb')}>
            Connect USB
          </Button>
          <Button type="button" size="xs" variant="ghost" labelAnim={false} disabled={busy || !bridge} onClick={() => void connect('ble')}>
            Connect Bluetooth
          </Button>
        </header>
      </div>
      {open ? (
        <div className="theme-webgl-toolkit__viewport">
          <div className="flex flex-col gap-3 p-4">
            <form className="flex flex-wrap items-end gap-2" onSubmit={(event) => void send(event)}>
              <Input
                label="Braille line"
                size="xs"
                variant="ghost"
                shadowless
                value={text}
                disabled={busy || !device}
                onChange={(event) => setText(event.target.value)}
                className="min-w-0 flex-1"
              />
              <Button type="submit" size="xs" variant="ghost" labelAnim={false} disabled={busy || !device || text.trim() === ''}>
                Send
              </Button>
            </form>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="xs" variant="ghost" labelAnim={false} disabled={busy || !device} onClick={() => pins(true)}>
                Pins up
              </Button>
              <Button type="button" size="xs" variant="ghost" labelAnim={false} disabled={busy || !device} onClick={() => pins(false)}>
                Pins down
              </Button>
              <Button
                type="button"
                size="xs"
                variant="ghost"
                labelAnim={false}
                disabled={busy || !device || !bridge}
                onClick={() => {
                  bridge?.disconnect(device ?? undefined)
                  setDevice(null)
                  setNote('Dot Pad disconnected')
                }}
              >
                Disconnect
              </Button>
            </div>
          </div>
          <p className="theme-webgl-toolkit__status font-mono text-[0.65rem] mb-0">{note}</p>
        </div>
      ) : null}
    </section>
  )
}
