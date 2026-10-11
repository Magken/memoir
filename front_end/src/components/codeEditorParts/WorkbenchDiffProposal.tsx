/**
 * Inline Monaco DiffEditor overlay — Copilot coding/essay proposal with Check / X.
 */
import { useEffect, useState } from 'react'
import { DiffEditor } from '@monaco-editor/react'
import { Check, X } from 'lucide-react'
import { prefersReducedMotion, streamPrefixes } from '../../lib/codeEditor/proposeFileEdit'
import { IconButton } from '../IconButton'
import { Tooltip } from '../Tooltip'

type WorkbenchDiffProposalProps = {
  original: string
  next: string
  language?: string
  monacoTheme: string
  fontSize?: number
  pathLabel?: string
  onAccept: () => void
  onReject: () => void
  className?: string
}

export function WorkbenchDiffProposal({
  original,
  next,
  language = 'plaintext',
  monacoTheme,
  fontSize = 14,
  pathLabel,
  onAccept,
  onReject,
  className = '',
}: WorkbenchDiffProposalProps) {
  const [modified, setModified] = useState(() => (prefersReducedMotion() ? next : ''))

  useEffect(() => {
    const reduced = prefersReducedMotion()
    const frames = streamPrefixes(next, reduced)
    if (reduced || frames.length <= 1) {
      setModified(next)
      return
    }
    let i = 0
    let raf = 0
    const tick = () => {
      setModified(frames[i] ?? next)
      i += 1
      if (i < frames.length) raf = window.requestAnimationFrame(tick)
    }
    raf = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(raf)
  }, [next])

  return (
    <div className={['theme-workbench-diff', className].filter(Boolean).join(' ')}>
      <div className="theme-workbench-diff__bar">
        <p className="theme-workbench-diff__label type-caption type-muted">
          {pathLabel ? `Proposed · ${pathLabel}` : 'Proposed change'}
        </p>
        <span className="theme-workbench-diff__actions">
          <Tooltip content="Keep change" placement="bottom">
            <IconButton
              icon={Check}
              aria-label="Keep change"
              size="xs"
              variant="tray"
              onClick={onAccept}
            />
          </Tooltip>
          <Tooltip content="Discard change" placement="bottom">
            <IconButton
              icon={X}
              aria-label="Discard change"
              size="xs"
              variant="tray"
              onClick={onReject}
            />
          </Tooltip>
        </span>
      </div>
      <div className="theme-workbench-diff__stage">
        <DiffEditor
          height="100%"
          original={original}
          modified={modified}
          language={language}
          theme={monacoTheme}
          keepCurrentOriginalModel
          keepCurrentModifiedModel
          options={{
            readOnly: true,
            renderSideBySide: false,
            automaticLayout: true,
            fontSize,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            padding: { top: 8 },
          }}
        />
      </div>
    </div>
  )
}
