import { useState } from 'react'
import { Button } from '../Button'
import { Input } from '../Input'
import { Modal, MODAL_SIZE_OPTIONS, type ModalSize } from '../Modal'
import { ScaleCoverModal } from '../ScaleCoverModal'
import { Select } from '../Select'
import { GsapPageProvider } from '../../lib/gsap'

const SCROLL_DEMO_PARAGRAPHS = [
  'Modal body scrolls independently while the header and footer stay pinned.',
  'Use size variants to cap width and max-height relative to the viewport.',
  'Large forms, tables, or long copy belong in the body slot — not in the chrome.',
  'Header and footer use compact padding with divider lines above and below the body.',
  'Press Escape or Cancel to dismiss. Confirm stays disabled until the example field has text.',
  'Additional paragraph to force overflow on smaller size presets.',
  'Another block of placeholder content for scroll testing.',
]

export type ModalsShowcasePanel = 'template' | 'scale-cover'

type ModalsShowcaseProps = {
  panel?: ModalsShowcasePanel
}

export function ModalsShowcase({ panel = 'template' }: ModalsShowcaseProps) {
  const [open, setOpen] = useState(false)
  const [scrollDemo, setScrollDemo] = useState(false)
  const [scaleOpen, setScaleOpen] = useState(false)
  const [size, setSize] = useState<ModalSize>('md')
  const [name, setName] = useState('')

  const activeOpen = open || scrollDemo

  function closeAll() {
    setOpen(false)
    setScrollDemo(false)
  }

  return (
    <div className="flex flex-col gap-10">
      {panel === 'template' ? (
        <section className="flex flex-col gap-8">
          <p className="type-body-sm type-muted max-w-prose">
            General modal shell — fixed header and footer with divider lines, scrollable body on
            the <code className="type-code">mini</code> micro scroll rail, and{' '}
            <code className="type-code">size</code> presets tied to viewport width and max-height.
          </p>

          <div className="flex max-w-md flex-col gap-3">
            <Select
              label="Size variant"
              value={size}
              options={MODAL_SIZE_OPTIONS.map((option) => ({
                value: option.value,
                label: option.label,
              }))}
              onChange={(value) => setSize(value as ModalSize)}
            />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="action" onClick={() => setOpen(true)}>
                Open template modal
              </Button>
              <Button size="sm" variant="inset" onClick={() => setScrollDemo(true)}>
                Open scroll demo
              </Button>
            </div>
          </div>

          <Modal
            open={activeOpen}
            size={size}
            title={scrollDemo ? 'Scrollable body' : 'Modal template'}
            onClose={closeAll}
            onConfirm={closeAll}
            confirmDisabled={!scrollDemo && name.trim().length === 0}
            confirmLabel="Confirm"
          >
            {scrollDemo ? (
              <div className="flex flex-col gap-3">
                {SCROLL_DEMO_PARAGRAPHS.map((paragraph) => (
                  <p key={paragraph} className="type-body-sm type-muted">
                    {paragraph}
                  </p>
                ))}
              </div>
            ) : (
              <Input
                label="Example field"
                placeholder="Type to enable confirm…"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoFocus
              />
            )}
          </Modal>
        </section>
      ) : null}

      {panel === 'scale-cover' ? (
        <section id="modals-scale-cover" className="flex flex-col gap-4">
          <div className="space-y-2">
            <p className="type-overline">Scale cover</p>
            <p className="type-body-sm type-muted max-w-prose">
              Verify shell via <code className="type-code">ScaleCoverModal</code> — the framed
              stage scales down while the cover rises. Escape or the X reverses the timeline.
              Full-page demo also at <code className="type-code">/scale-cover-modal</code>.
            </p>
          </div>

          <GsapPageProvider timing={{ layout: { pageLengthVph: 1 } }}>
            <div className="overflow-hidden border border-[var(--theme-border)]">
              <ScaleCoverModal
                className="theme-scale-cover-modal--host"
                open={scaleOpen}
                onClose={() => setScaleOpen(false)}
                title="Verify modal"
                panel={
                  <div className="mx-auto flex max-w-lg flex-col gap-4">
                    <p className="type-body-sm type-muted">
                      Rising cover over a scaled stage — same family of motion as the scene menu
                      peel, with scale instead of a vertical page slide.
                    </p>
                    <Button size="sm" variant="action" onClick={() => setScaleOpen(false)}>
                      Done
                    </Button>
                  </div>
                }
              >
                <div className="flex h-full flex-col justify-center gap-6 px-6 py-8 sm:px-8">
                  <div className="max-w-md space-y-3">
                    <p className="type-h4">Page under the modal</p>
                    <p className="type-body-sm type-muted">
                      Open to see this stage shrink while the cover fills the frame.
                    </p>
                    <Button size="sm" variant="action" onClick={() => setScaleOpen(true)}>
                      Open scale-cover modal
                    </Button>
                  </div>
                  <div className="grid max-w-lg gap-3 sm:grid-cols-3">
                    {['Proof', 'Intake', 'Match'].map((label) => (
                      <div
                        key={label}
                        className="border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3"
                      >
                        <p className="type-caption">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </ScaleCoverModal>
            </div>
          </GsapPageProvider>
        </section>
      ) : null}
    </div>
  )
}
