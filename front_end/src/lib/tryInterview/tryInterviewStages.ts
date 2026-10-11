import { ClipboardList, Clock, Code2, MessageSquare, PenLine, type LucideIcon } from 'lucide-react'

export type TryInterviewStageId = 'form' | 'talk' | 'coding' | 'writing'

export type TryInterviewStageMeta = {
  label: string
  icon: LucideIcon
}

/** Same kind labels + Lucide glyphs as the interview landing stage tags. */
export const TRY_INTERVIEW_STAGE_META: Record<TryInterviewStageId, TryInterviewStageMeta> = {
  form: { label: 'Form', icon: ClipboardList },
  talk: { label: 'Conversation', icon: MessageSquare },
  coding: { label: 'Coding', icon: Code2 },
  writing: { label: 'Writing', icon: PenLine },
}

/** Same Clock glyph as the interview landing duration tag. */
export const TRY_INTERVIEW_TIME_ICON = Clock

/** Landing-style duration chip. Keep the template here so kit fixtures stay at 9 feature labels. */
export function tryInterviewProposedTimeLabel(minutes: number) {
  return `~${minutes} min`
}
