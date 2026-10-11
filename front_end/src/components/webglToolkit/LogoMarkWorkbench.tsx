/**
 * Logo designer on `/WGLTOOLKIT?page=logo`.
 * SVG and PNG download with a clear background.
 */
import { useRef } from 'react'
import { Button } from '../Button'
import { DrawCanvas, type DrawCanvasHandle } from '../DrawCanvas'

type LogoMarkWorkbenchProps = {
  open?: boolean
}

export function LogoMarkWorkbench({ open = true }: LogoMarkWorkbenchProps) {
  const drawRef = useRef<DrawCanvasHandle>(null)

  return (
    <section
      className={['theme-webgl-toolkit__panel theme-logo-mark', open ? 'theme-webgl-toolkit__panel--open' : '']
        .filter(Boolean)
        .join(' ')}
      aria-labelledby="logo-mark-title"
      aria-label="Logo"
    >
      <div className="theme-webgl-toolkit__chrome">
        <header className="theme-webgl-toolkit__titlebar">
          <h2 id="logo-mark-title" className="theme-webgl-toolkit__title">
            Logo
          </h2>
          <div className="theme-webgl-toolkit__title-spacer" aria-hidden />
          <Button type="button" size="xs" variant="ghost" labelAnim={false} onClick={() => drawRef.current?.exportClear('svg')}>
            SVG
          </Button>
          <Button type="button" size="xs" variant="ghost" labelAnim={false} onClick={() => drawRef.current?.exportClear('png')}>
            PNG
          </Button>
        </header>
      </div>
      {open ? (
        <div className="theme-logo-mark__stage">
          <DrawCanvas ref={drawRef} initialTitle="Logo" clearExport />
        </div>
      ) : null}
    </section>
  )
}
