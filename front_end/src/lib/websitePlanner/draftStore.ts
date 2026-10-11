import type { FlowDocument } from '../flowEditor/types'
import { WEBSITE_PLANNER_SCHEMA_VERSION, type WebsitePlanDraft } from './types'

export const WEBSITE_PLAN_DRAFT_KEY = 'theme_website_plan_draft_v12'

export function createWebsitePlanDraft(
  title: string,
  flow: FlowDocument,
): WebsitePlanDraft {
  return {
    schemaVersion: WEBSITE_PLANNER_SCHEMA_VERSION,
    title,
    flow,
    updatedAt: new Date().toISOString(),
  }
}

export function serializeWebsitePlanDraft(draft: WebsitePlanDraft): string {
  return JSON.stringify(draft, null, 2)
}

export function parseWebsitePlanDraft(raw: string): WebsitePlanDraft | null {
  try {
    const parsed = JSON.parse(raw) as Partial<WebsitePlanDraft>
    if (
      typeof parsed !== 'object' ||
      parsed == null ||
      typeof parsed.schemaVersion !== 'number' ||
      typeof parsed.title !== 'string' ||
      !parsed.flow ||
      !Array.isArray(parsed.flow.nodes) ||
      !Array.isArray(parsed.flow.edges)
    ) {
      return null
    }
    if (parsed.schemaVersion > WEBSITE_PLANNER_SCHEMA_VERSION) return null
    return {
      schemaVersion: parsed.schemaVersion,
      title: parsed.title,
      flow: {
        nodes: parsed.flow.nodes,
        edges: parsed.flow.edges,
        groups: parsed.flow.groups ?? [],
        viewport: parsed.flow.viewport,
        meta: parsed.flow.meta,
      },
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString(),
    }
  } catch {
    return null
  }
}

export function loadWebsitePlanDraft(): WebsitePlanDraft | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(WEBSITE_PLAN_DRAFT_KEY)
    if (!raw) return null
    return parseWebsitePlanDraft(raw)
  } catch {
    return null
  }
}

export function saveWebsitePlanDraft(draft: WebsitePlanDraft): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(WEBSITE_PLAN_DRAFT_KEY, serializeWebsitePlanDraft(draft))
  } catch {
    // Quota / private mode — ignore; export still works.
  }
}

export function clearWebsitePlanDraft(): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.removeItem(WEBSITE_PLAN_DRAFT_KEY)
  } catch {
    // ignore
  }
}

export function downloadWebsitePlanJson(draft: WebsitePlanDraft, filename?: string): void {
  const blob = new Blob([serializeWebsitePlanDraft(draft)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename ?? `${draft.title.trim() || 'website-plan'}.website-plan.json`
  a.click()
  URL.revokeObjectURL(url)
}
