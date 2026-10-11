/** Assist presets loaded from `toolAssistCatalog.json` — add levels there, not in editors. */

import catalog from './toolAssistCatalog.json'

export type ToolAssistCaps = {
  chat: boolean
  spoilers: boolean
  write: boolean
}

export type ToolAssistNamedBundleId = (typeof catalog.bundles)[number]['id']
export type ToolAssistBundleId = ToolAssistNamedBundleId
export type ToolAssistBundleMatch = ToolAssistNamedBundleId | 'custom'

export type ToolAssistBundle = ToolAssistCaps & {
  id: string
  label: string
  summary: string
}

export const TOOL_ASSIST_NONE: ToolAssistCaps = {
  chat: false,
  spoilers: false,
  write: false,
}

export const TOOL_ASSIST_BUNDLES: readonly ToolAssistBundle[] = catalog.bundles.map((b) => ({
  id: b.id,
  label: b.label,
  summary: b.summary,
  chat: b.chat,
  spoilers: b.spoilers,
  write: b.write,
}))

export function toolAssistBundleById(id: string): ToolAssistBundle {
  return TOOL_ASSIST_BUNDLES.find((b) => b.id === id) ?? TOOL_ASSIST_BUNDLES[0]!
}

function applyImplied(caps: ToolAssistCaps): ToolAssistCaps {
  const next: ToolAssistCaps = { ...caps }
  for (const [cap, others] of Object.entries(catalog.implied)) {
    if (next[cap as keyof ToolAssistCaps]) {
      for (const other of others) {
        if (other === 'chat' || other === 'spoilers' || other === 'write') next[other] = true
      }
    }
  }
  return next
}

export function resolveToolAssistCaps(
  assist?: Partial<ToolAssistCaps> | null,
): ToolAssistCaps {
  if (!assist) return { ...TOOL_ASSIST_NONE }
  return applyImplied({
    chat: Boolean(assist.chat),
    spoilers: Boolean(assist.spoilers),
    write: Boolean(assist.write),
  })
}

export function isToolAssistNone(caps: ToolAssistCaps): boolean {
  return !caps.chat && !caps.spoilers && !caps.write
}

/** Persist caps; omit when None so existing briefs stay field-missing. */
export function toolAssistForStore(
  assist?: Partial<ToolAssistCaps> | null,
): ToolAssistCaps | undefined {
  const caps = resolveToolAssistCaps(assist)
  return isToolAssistNone(caps) ? undefined : caps
}

export function matchToolAssistBundle(values: ToolAssistCaps): ToolAssistBundleMatch {
  const caps = resolveToolAssistCaps(values)
  for (const bundle of TOOL_ASSIST_BUNDLES) {
    if (
      bundle.chat === caps.chat &&
      bundle.spoilers === caps.spoilers &&
      bundle.write === caps.write
    ) {
      return bundle.id
    }
  }
  return 'custom'
}

export function toolAssistPatchFromBundle(id: string): ToolAssistCaps {
  const b = toolAssistBundleById(id)
  return { chat: b.chat, spoilers: b.spoilers, write: b.write }
}

export function toolAssistSummaryLine(caps: ToolAssistCaps): string {
  const id = matchToolAssistBundle(caps)
  if (id === 'none') return 'Assist off'
  const named = TOOL_ASSIST_BUNDLES.find((b) => b.id === id)
  if (named && id !== 'custom') return `Assist · ${named.label}`
  const bits = [
    caps.chat ? 'chat' : null,
    caps.spoilers ? 'answers' : null,
    caps.write ? 'write' : null,
  ].filter(Boolean)
  return bits.length ? `Assist · ${bits.join('+')}` : 'Assist off'
}

/** Payload to pass into the candidate interviewer (`StageAssistContext.privileges`). */
export function toolAssistInterviewerPayload(assist?: Partial<ToolAssistCaps> | null): {
  bundleId: ToolAssistBundleMatch
  caps: ToolAssistCaps
} {
  const caps = resolveToolAssistCaps(assist)
  return { bundleId: matchToolAssistBundle(caps), caps }
}

/** Form / Coding / Writing — same cells as Creator-2 spine Assist. Talk has no peel. */
export const STRUCTURE_ASSIST_TOOL_TYPES = new Set(['form_quiz', 'coding', 'doc'])

/**
 * Practice / fixture interviews stamp Copilot on every Assist-capable tool.
 * Omit / all-false is None; structure expects a named bundle on those kinds.
 */
export function stampStructureCopilotAssist<
  T extends {
    tools: Record<string, { type?: string; assist?: Partial<ToolAssistCaps> } | undefined>
  },
>(doc: T): T {
  const caps = toolAssistPatchFromBundle('copilot')
  const tools = Object.fromEntries(
    Object.entries(doc.tools).map(([id, tool]) => {
      if (!tool || !STRUCTURE_ASSIST_TOOL_TYPES.has(String(tool.type ?? ''))) {
        return [id, tool]
      }
      return [id, { ...tool, assist: { ...caps } }]
    }),
  ) as T['tools']
  return { ...doc, tools }
}
