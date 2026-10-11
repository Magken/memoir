import type { ReactNode } from 'react'

type EditorTitlebarProps = {
  fileMenu?: ReactNode
  historyTray?: ReactNode
  titleBlock: ReactNode
  titleRefresh?: ReactNode
  saveTray?: ReactNode
  exportMenu?: ReactNode
  className?: string
}

export function EditorTitlebar({
  fileMenu,
  historyTray,
  titleBlock,
  titleRefresh,
  saveTray,
  exportMenu,
  className = '',
}: EditorTitlebarProps) {
  return (
    <header
      className={['theme-editor-titlebar', className].filter(Boolean).join(' ')}
    >
      {fileMenu ? <div className="theme-editor-titlebar__leading">{fileMenu}</div> : null}
      {historyTray}
      <div className="theme-editor-titlebar__title-block">
        {titleBlock}
        {titleRefresh}
      </div>
      <div className="theme-editor-titlebar__spacer" aria-hidden />
      <div className="theme-editor-titlebar__trailing">
        {saveTray}
        {exportMenu}
      </div>
    </header>
  )
}
