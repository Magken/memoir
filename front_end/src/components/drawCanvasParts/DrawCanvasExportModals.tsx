import { useEffect, useState } from 'react'
import { Checkbox } from '../Checkbox'
import { Modal } from '../Modal'
import { Select } from '../Select'

type DrawCanvasExportModalsProps = {
  imageOpen: boolean
  jsonOpen: boolean
  onCloseImage: () => void
  onCloseJson: () => void
  onExportPng: (opts: { withBackground: boolean; scale: number }) => void
  onExportSvg: (opts: { withBackground: boolean }) => void
  onExportJson: () => void
  /** Logo downloads start with the background left clear. */
  clearExport?: boolean
}

type ExportAs = 'png' | 'svg'

const FORMAT_OPTIONS = [
  { value: 'png', label: 'PNG' },
  { value: 'svg', label: 'SVG' },
] as const

export function DrawCanvasExportModals({
  imageOpen,
  jsonOpen,
  onCloseImage,
  onCloseJson,
  onExportPng,
  onExportSvg,
  onExportJson,
  clearExport = false,
}: DrawCanvasExportModalsProps) {
  const [format, setFormat] = useState<ExportAs>('png')
  const [withBackground, setWithBackground] = useState(true)

  useEffect(() => {
    if (imageOpen) {
      setFormat('png')
      setWithBackground(!clearExport)
    }
  }, [imageOpen, clearExport])

  return (
    <>
      <Modal
        open={imageOpen}
        title="Export image"
        onClose={onCloseImage}
        size="sm"
        placement="container"
        onConfirm={() => {
          if (format === 'svg') {
            onExportSvg({ withBackground })
          } else {
            onExportPng({ withBackground, scale: 2 })
          }
          onCloseImage()
        }}
        confirmLabel="Download"
      >
        <div className="theme-draw-canvas__export-options">
          <Select
            label="Export as"
            size="sm"
            options={[...FORMAT_OPTIONS]}
            value={format}
            onChange={(value) => setFormat(value as ExportAs)}
            scrollRail="hidden"
            portal
            portalZIndex={1300}
          />
          <Checkbox
            size="sm"
            checked={withBackground}
            onChange={setWithBackground}
            label="Include background"
          />
        </div>
      </Modal>

      <Modal
        open={jsonOpen}
        title="Export scene"
        onClose={onCloseJson}
        size="sm"
        placement="container"
        onConfirm={() => {
          onExportJson()
          onCloseJson()
        }}
        confirmLabel="Save"
      >
        <p className="type-body-sm type-muted">
          Saves a <code className="type-code">.excalidraw</code> file you can load later.
        </p>
      </Modal>
    </>
  )
}
