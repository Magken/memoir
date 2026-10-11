/**
 * When to fire analysis templates. Grain enum stays after_turn | after_tool | topic_end | interview_end.
 * Talk after_turn stays in discussionRunner — this module calls scheduleTalkTemplates, it does not fork it.
 */
import {
  impliedToolTemplateIds,
  lockedToolTemplateIds,
  scheduleTalkTemplates,
} from './buildTalkContext'

const PROCESS_IDS = new Set([
  'mark.code.approach.v1',
  'mark.code.authorship.v1',
  'mark.doc.approach.v1',
  'mark.doc.authorship.v1',
])

const ASSIST_DISPLAY_IDS = new Set(['mark.assist.use.v1'])

export function isProcessTemplateId(templateId: string): boolean {
  return PROCESS_IDS.has(templateId)
}

export function isAssistDisplayTemplateId(templateId: string): boolean {
  return ASSIST_DISPLAY_IDS.has(templateId)
}

export function scheduleMarkTalk(templateIds: readonly string[], brief?: Parameters<typeof scheduleTalkTemplates>[1]) {
  return scheduleTalkTemplates(templateIds, brief)
}

export function scheduleToolFinalTemplateIds(input: {
  toolType?: string | null
  stored?: readonly string[] | null
  assistChat?: boolean
}): string[] {
  return lockedToolTemplateIds(input).filter(
    (id) => !isProcessTemplateId(id) && !isAssistDisplayTemplateId(id),
  )
}

export function scheduleToolProcessTemplateIds(input: {
  toolType?: string | null
  stored?: readonly string[] | null
  assistChat?: boolean
}): string[] {
  return lockedToolTemplateIds(input).filter((id) => isProcessTemplateId(id))
}

export function impliedFinalToolTemplateIds(
  toolType: string | undefined | null,
  assistChat?: boolean,
): string[] {
  return impliedToolTemplateIds(toolType, { assistChat }).filter(
    (id) => !isProcessTemplateId(id) && !isAssistDisplayTemplateId(id),
  )
}
