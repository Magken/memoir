/** Shared surface-level planning vocabulary for website-plan nodes. */

export const WEBSITE_PLANNER_SCHEMA_VERSION = 1

export type PlannerStatus = 'existing' | 'planned' | 'missing' | 'blocked' | 'external'

export const PLANNER_STATUS_OPTIONS: readonly { value: PlannerStatus; label: string }[] = [
  { value: 'existing', label: 'Existing' },
  { value: 'planned', label: 'Planned' },
  { value: 'missing', label: 'Missing' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'external', label: 'External' },
] as const

export type PlannerRelation =
  | 'contains'
  | 'transitions to'
  | 'navigates to'
  | 'opens'
  | 'triggers'
  | 'calls'
  | 'reads'
  | 'writes'
  | 'emits'
  | 'depends on'
  | 'implemented by'

export const PLANNER_RELATION_OPTIONS: readonly PlannerRelation[] = [
  'contains',
  'transitions to',
  'navigates to',
  'opens',
  'triggers',
  'calls',
  'reads',
  'writes',
  'emits',
  'depends on',
  'implemented by',
] as const

export type PlannerNodeConfig = {
  status?: PlannerStatus
  phase?: string
  summary?: string
  /**
   * Optional second role for the same element in a later scene
   * (e.g. loading visual that continues as Landing Scene background).
   */
  continuesAs?: string
  /** Backend catalog system id when kind is a system node. */
  systemId?: string
  hotWire?: string
  feLibs?: string
}

export type WebsitePlanDraft = {
  schemaVersion: number
  title: string
  flow: import('../flowEditor/types').FlowDocument
  updatedAt: string
}

export type PlanCoverageIssue = {
  id: string
  severity: 'info' | 'warn'
  message: string
  nodeIds?: string[]
}

export type PlanCoverageReport = {
  pages: { id: string; label: string; status: PlannerStatus }[]
  systems: { id: string; label: string; systemId?: string; status: PlannerStatus }[]
  integrations: { id: string; label: string; status: PlannerStatus }[]
  missing: { id: string; label: string; status: PlannerStatus }[]
  steps: { id: string; label: string; phase: string; status: PlannerStatus }[]
  disconnected: { id: string; label: string }[]
  implementationOrder: { id: string; label: string; phase: string }[]
  issues: PlanCoverageIssue[]
}
