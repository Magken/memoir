import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { LayoutGrid } from 'lucide-react'
import { ThemeProvider } from '../lib/theme'
import { MenuButton, type MenuItem } from '../components/MenuButton'
import { WebglSplatViewer } from '../components/webglToolkit/WebglSplatViewer'

/** Add a row here to put a new workbench on the pages menu. */
export const WGL_TOOLKIT_PAGES = [{ id: 'splat', label: 'Splat', Workbench: WebglSplatViewer }] as const

export type WglToolkitPageId = (typeof WGL_TOOLKIT_PAGES)[number]['id']

function isToolkitPageId(id: string): id is WglToolkitPageId {
  return WGL_TOOLKIT_PAGES.some((page) => page.id === id)
}

/**
 * WebGL toolkit lab at `/WGLTOOLKIT` — pick a workbench from the pages menu.
 */
export function WglToolkitPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const requested = searchParams.get('page')
  const pageId: WglToolkitPageId =
    requested !== null && isToolkitPageId(requested) ? requested : 'viewer'
  const current = WGL_TOOLKIT_PAGES.find((page) => page.id === pageId) ?? WGL_TOOLKIT_PAGES[0]
  const Workbench = current.Workbench
  const items: MenuItem[] = useMemo(
    () => WGL_TOOLKIT_PAGES.map((page) => ({ id: page.id, label: page.label })),
    [],
  )

  return (
    <ThemeProvider forcedPaletteId={pageId === 'lcl' ? 'grassDark' : undefined}>
      <main className="theme-webgl-toolkit w-full" data-page={pageId} aria-label="WGL toolkit">
        <header className="theme-webgl-toolkit__nav" aria-label="Toolkit pages">
          <div className="theme-webgl-toolkit__ribbon-col">
            <span className="theme-webgl-toolkit__ribbon-col-label type-caption type-muted">Pages</span>
            <MenuButton
              label={current.label}
              icon={LayoutGrid}
              iconDropdown
              items={items}
              selectedId={pageId}
              onSelect={(id) => {
                if (!isToolkitPageId(id)) return
                setSearchParams({ page: id }, { replace: true })
              }}
              size="xs"
              menuSize="compact"
              portal
              variant="tray"
            />
          </div>
        </header>
        <Workbench key={pageId} open />
      </main>
    </ThemeProvider>
  )
}
