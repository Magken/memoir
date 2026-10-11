import type { ComponentType } from 'react'
import type { FlowContentRendererId } from '../types'
import { FlowNodeFieldsContent } from './FlowNodeFieldsContent'
import { FlowNodeInterviewContent } from './FlowNodeInterviewContent'
import { FlowNodeNoteContent } from './FlowNodeNoteContent'
import { FlowNodePlannerContent } from './FlowNodePlannerContent'
import { FlowNodeMockupContent } from './FlowNodeMockupContent'
import type { FlowNodeContentProps } from './types'

export type { FlowNodeContentProps }

export const FLOW_CONTENT_RENDERERS: Record<
  Exclude<FlowContentRendererId, 'none'>,
  ComponentType<FlowNodeContentProps>
> = {
  note: FlowNodeNoteContent,
  fields: FlowNodeFieldsContent,
  planner: FlowNodePlannerContent,
  interview: FlowNodeInterviewContent,
  mockup: FlowNodeMockupContent,
}

export function resolveContentRenderer(id: FlowContentRendererId | undefined): ComponentType<FlowNodeContentProps> | null {
  if (!id || id === 'none') return null
  return FLOW_CONTENT_RENDERERS[id] ?? null
}
