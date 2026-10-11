import { useMemo, useState, type RefObject } from 'react'
import { getEditorCatalog, type EditorCatalogKind } from '../../lib/editorCatalog/manifest'
import { dispatchEditorAction } from '../../lib/editorContext/actionRegistry'
import type { EditorActionResult, EditorRuntimeHandle } from '../../lib/editorContext/types'
import { Button } from '../Button'

type EditorActionSpineLabProps = {
  kind: Extract<EditorCatalogKind, 'bot' | 'dm' | 'calendar' | 'testform'>
  runtimeRef: RefObject<EditorRuntimeHandle | null>
  className?: string
}

export function EditorActionSpineLab({ kind, runtimeRef, className = '' }: EditorActionSpineLabProps) {
  const catalog = getEditorCatalog(kind)
  const actions = useMemo(
    () => catalog.actions.filter((a) => a.implemented),
    [catalog.actions],
  )
  const [actionId, setActionId] = useState(actions[0]?.id ?? '')
  const [value, setValue] = useState('')
  const [targetId, setTargetId] = useState('')
  const [payloadText, setPayloadText] = useState('{}')
  const [result, setResult] = useState<EditorActionResult | null>(null)
  const [busy, setBusy] = useState(false)

  const invoke = async () => {
    const runtime = runtimeRef.current
    if (!runtime) {
      setResult({ ok: false, actionId, error: 'Runtime not mounted' })
      return
    }
    let payload: unknown
    try {
      payload = payloadText.trim() ? JSON.parse(payloadText) : undefined
    } catch {
      setResult({ ok: false, actionId, error: 'Payload JSON is invalid' })
      return
    }
    setBusy(true)
    try {
      const next = await dispatchEditorAction(runtime, {
        kind,
        actionId,
        value: value || undefined,
        targetId: targetId || undefined,
        payload,
      })
      setResult(next)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={['space-y-3 rounded-[var(--theme-radius-control)] border border-[var(--theme-border)] p-4', className].filter(Boolean).join(' ')}>
      <div className="space-y-1">
        <p className="type-overline">M-link / MCT action spine</p>
        <p className="type-caption type-muted">
          Invoke implemented <code className="type-code">{kind}.action.*</code> ids against the live workbench via{' '}
          <code className="type-code">dispatchEditorAction</code>.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="type-caption type-muted">Action</span>
          <select
            className="rounded-[var(--theme-radius-control)] border border-[var(--theme-border)] bg-[var(--theme-surface)] px-2 py-1.5 type-body-sm"
            value={actionId}
            onChange={(e) => setActionId(e.target.value)}
          >
            {actions.map((a) => (
              <option key={a.id} value={a.id}>
                {a.id}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="type-caption type-muted">value</span>
          <input
            className="rounded-[var(--theme-radius-control)] border border-[var(--theme-border)] bg-[var(--theme-surface)] px-2 py-1.5 type-body-sm"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="optional string"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="type-caption type-muted">targetId</span>
          <input
            className="rounded-[var(--theme-radius-control)] border border-[var(--theme-border)] bg-[var(--theme-surface)] px-2 py-1.5 type-body-sm"
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            placeholder="conversation / message / participant id"
          />
        </label>
        <div className="flex items-end">
          <Button type="button" size="sm" variant="action" disabled={busy || !actionId} onClick={() => void invoke()}>
            {busy ? 'Invoking…' : 'Invoke action'}
          </Button>
        </div>
      </div>
      <label className="flex flex-col gap-1">
        <span className="type-caption type-muted">payload (JSON)</span>
        <textarea
          className="min-h-20 rounded-[var(--theme-radius-control)] border border-[var(--theme-border)] bg-[var(--theme-surface)] px-2 py-1.5 font-mono type-caption"
          value={payloadText}
          onChange={(e) => setPayloadText(e.target.value)}
          spellCheck={false}
        />
      </label>
      {result ? (
        <pre className="overflow-auto rounded-[var(--theme-radius-control)] bg-[var(--theme-surface-raised)] p-3 type-caption">
          {JSON.stringify(result, null, 2)}
        </pre>
      ) : null}
    </div>
  )
}
