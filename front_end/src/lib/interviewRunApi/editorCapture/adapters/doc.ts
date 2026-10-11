/**
 * Writing (DocEditor) capture adapter — markdown body only, never author scaffolds.
 */
import type { DocEditorPayload } from '../../../editorContext/types'
import { applySplice, looksLikePaste, pasteActionDetails, spliceDiff } from '../splice'
import { routeSittingPaste } from '../../sittingPolicy/clipboardRoute'
import type {
  Checkpoint,
  EditorCaptureAdapter,
  EditorTapeActionName,
  EditorTapePatch,
} from '../types'

export type DocCheckpoint = {
  title: string
  markdown: string
}

function lexicalPlain(lexical: unknown): string {
  if (!lexical || typeof lexical !== 'object') return ''
  const parts: string[] = []
  const walk = (node: unknown) => {
    if (!node || typeof node !== 'object') return
    const n = node as { type?: string; text?: string; children?: unknown[] }
    if (typeof n.text === 'string' && n.text) parts.push(n.text)
    if (Array.isArray(n.children)) {
      for (const child of n.children) walk(child)
      if (n.type === 'paragraph' || n.type === 'heading') parts.push('\n')
    }
  }
  walk((lexical as { root?: unknown }).root ?? lexical)
  return parts.join('').replace(/\n+$/g, '').trim()
}

export const docCaptureAdapter: EditorCaptureAdapter<DocEditorPayload> = {
  kind: 'doc',
  sanitize(live) {
    const markdown =
      typeof live?.markdown === 'string' && live.markdown.trim()
        ? live.markdown
        : lexicalPlain(live?.lexical)
    return {
      title: typeof live?.title === 'string' ? live.title : '',
      markdown,
    } satisfies DocCheckpoint
  },
  diff(prev, next) {
    const patches: EditorTapePatch[] = []
    if (String(prev.title ?? '') !== String(next.title ?? '')) {
      patches.push({ op: 'set_title', title: String(next.title ?? '') })
    }
    const splice = spliceDiff(String(prev.markdown ?? ''), String(next.markdown ?? ''))
    if (splice) {
      patches.push({
        op: 'splice',
        start: splice.start,
        end: splice.end,
        text: splice.text,
      })
    }
    return patches
  },
  apply(checkpoint, patch) {
    const next: Checkpoint = {
      title: String(checkpoint.title ?? ''),
      markdown: String(checkpoint.markdown ?? ''),
    }
    if (patch.op === 'set_title') {
      next.title = String(patch.title ?? '')
      return next
    }
    if (patch.op === 'splice') {
      next.markdown = applySplice(
        String(next.markdown),
        Number(patch.start ?? 0),
        Number(patch.end ?? 0),
        String(patch.text ?? ''),
      )
    }
    return next
  },
  inferActions(prev, next) {
    const actions: Array<{ action: EditorTapeActionName; detail?: Record<string, unknown> }> =
      []
    const splice = spliceDiff(String(prev.markdown ?? ''), String(next.markdown ?? ''))
    if (splice && looksLikePaste(splice)) {
      const detail = pasteActionDetails(splice, String(next.markdown ?? '').length)
      actions.push({ action: 'paste', detail })
      const route = routeSittingPaste(splice.text, 'doc')
      actions.push({
        action: 'paste_route',
        detail: {
          ...detail,
          from: route.from,
          srcSurface: route.srcSurface,
          destSurface: route.destSurface,
          label: route.label,
        },
      })
    }
    return actions
  },
}
