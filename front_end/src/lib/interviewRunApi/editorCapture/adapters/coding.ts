/**
 * Coding workspace capture adapter — candidate files only (no cases.json / reference / hidden).
 */
import type { CodeEditorPayload } from '../../../editorContext/types'
import { isAuthorOnlyCodingPath } from '../../../interviewBrief/codingWorkspaceFiles'
import { applySplice, looksLikePaste, pasteActionDetails, spliceDiff } from '../splice'
import { routeSittingPaste } from '../../sittingPolicy/clipboardRoute'
import type {
  EditorCaptureAdapter,
  EditorTapeActionName,
  EditorTapePatch,
} from '../types'

export type CodingFileSnap = {
  path: string
  language: string
  content: string
}

export type CodingCheckpoint = {
  title: string
  activeId: string | null
  openIds: string[]
  files: CodingFileSnap[]
}

function cloneFiles(files: CodingFileSnap[]): CodingFileSnap[] {
  return files.map((f) => ({
    path: f.path,
    language: f.language,
    content: String(f.content ?? ''),
  }))
}

function asFiles(value: unknown): CodingFileSnap[] {
  if (!Array.isArray(value)) return []
  const out: CodingFileSnap[] = []
  for (const row of value) {
    if (!row || typeof row !== 'object') continue
    const path = String((row as CodingFileSnap).path ?? '').trim()
    if (!path || isAuthorOnlyCodingPath(path)) continue
    out.push({
      path,
      language: String((row as CodingFileSnap).language ?? ''),
      content: String((row as CodingFileSnap).content ?? ''),
    })
  }
  return out
}

function fileMap(files: CodingFileSnap[]): Map<string, CodingFileSnap> {
  const map = new Map<string, CodingFileSnap>()
  for (const f of files) map.set(f.path, f)
  return map
}

export const codingCaptureAdapter: EditorCaptureAdapter<CodeEditorPayload> = {
  kind: 'coding',
  sanitize(live) {
    const files = asFiles(live?.files)
    const openIds = (live?.openIds ?? []).filter(
      (id) => typeof id === 'string' && !isAuthorOnlyCodingPath(id),
    )
    let activeId = typeof live?.activeId === 'string' ? live.activeId : null
    if (activeId && isAuthorOnlyCodingPath(activeId)) activeId = files[0]?.path ?? null
    return {
      title: typeof live?.title === 'string' ? live.title : '',
      activeId,
      openIds,
      files: cloneFiles(files),
    } satisfies CodingCheckpoint
  },
  diff(prev, next) {
    const patches: EditorTapePatch[] = []
    const before = fileMap(asFiles(prev.files))
    const after = fileMap(asFiles(next.files))
    for (const path of before.keys()) {
      if (!after.has(path)) patches.push({ op: 'delete_file', path })
    }
    for (const [path, file] of after) {
      const old = before.get(path)
      if (!old) {
        patches.push({
          op: 'create_file',
          path,
          language: file.language,
          content: file.content,
        })
        continue
      }
      if (old.language !== file.language) {
        patches.push({ op: 'set_language', path, language: file.language })
      }
      const splice = spliceDiff(old.content, file.content)
      if (splice) {
        patches.push({
          op: 'splice',
          path,
          start: splice.start,
          end: splice.end,
          text: splice.text,
        })
      }
    }
    const prevActive = prev.activeId ?? null
    const nextActive = next.activeId ?? null
    const prevOpen = JSON.stringify(prev.openIds ?? [])
    const nextOpen = JSON.stringify(next.openIds ?? [])
    if (prevActive !== nextActive || prevOpen !== nextOpen) {
      patches.push({
        op: 'set_active',
        activeId: nextActive,
        openIds: Array.isArray(next.openIds) ? next.openIds : [],
      })
    }
    if (String(prev.title ?? '') !== String(next.title ?? '')) {
      patches.push({ op: 'set_title', title: String(next.title ?? '') })
    }
    return patches
  },
  apply(checkpoint, patch) {
    const next: CodingCheckpoint = {
      title: String(checkpoint.title ?? ''),
      activeId: (checkpoint.activeId as string | null) ?? null,
      openIds: Array.isArray(checkpoint.openIds)
        ? [...(checkpoint.openIds as string[])]
        : [],
      files: cloneFiles(asFiles(checkpoint.files)),
    }
    if (patch.op === 'set_title') {
      next.title = String(patch.title ?? '')
      return next
    }
    if (patch.op === 'set_active') {
      next.activeId = (patch.activeId as string | null) ?? null
      next.openIds = Array.isArray(patch.openIds) ? patch.openIds.map(String) : next.openIds
      return next
    }
    if (patch.op === 'delete_file') {
      const path = String(patch.path ?? '')
      next.files = next.files.filter((f) => f.path !== path)
      return next
    }
    if (patch.op === 'create_file') {
      const path = String(patch.path ?? '')
      if (!path || isAuthorOnlyCodingPath(path)) return next
      if (!next.files.some((f) => f.path === path)) {
        next.files.push({
          path,
          language: String(patch.language ?? ''),
          content: String(patch.content ?? ''),
        })
      }
      return next
    }
    if (patch.op === 'set_language') {
      const path = String(patch.path ?? '')
      next.files = next.files.map((f) =>
        f.path === path ? { ...f, language: String(patch.language ?? f.language) } : f,
      )
      return next
    }
    if (patch.op === 'splice') {
      const path = String(patch.path ?? '')
      next.files = next.files.map((f) =>
        f.path === path
          ? {
              ...f,
              content: applySplice(
                f.content,
                Number(patch.start ?? 0),
                Number(patch.end ?? 0),
                String(patch.text ?? ''),
              ),
            }
          : f,
      )
    }
    return next
  },
  inferActions(prev, next) {
    const actions: Array<{ action: EditorTapeActionName; detail?: Record<string, unknown> }> =
      []
    const prevActive = String(prev.activeId ?? '')
    const nextActive = String(next.activeId ?? '')
    if (prevActive && nextActive && prevActive !== nextActive) {
      actions.push({ action: 'open_file', detail: { path: nextActive } })
    }
    const before = fileMap(asFiles(prev.files))
    const after = fileMap(asFiles(next.files))
    for (const [path, file] of after) {
      const old = before.get(path)
      if (!old) continue
      if (old.language !== file.language) {
        actions.push({ action: 'language', detail: { path, language: file.language } })
      }
      const splice = spliceDiff(old.content, file.content)
      if (splice && looksLikePaste(splice)) {
        const detail = pasteActionDetails(splice, file.content.length, { path })
        actions.push({ action: 'paste', detail })
        const route = routeSittingPaste(splice.text, 'editor')
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
    }
    return actions
  },
}
