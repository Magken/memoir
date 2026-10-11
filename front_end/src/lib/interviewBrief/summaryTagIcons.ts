import {
  BadgeCheck,
  Clock,
  Code2,
  Crosshair,
  Filter,
  Hash,
  Info,
  Link2,
  ListChecks,
  ListOrdered,
  Lock,
  MessageCircle,
  Package,
  Reply,
  Shield,
  ShieldAlert,
  Sunrise,
  Sunset,
  type LucideIcon,
} from 'lucide-react'
import type {
  InterviewFlowSummaryGlyph,
  InterviewFlowSummaryTagTone,
} from './flowTimelineTypes'

export type { InterviewFlowSummaryGlyph }

/** One concept → one icon across collapsed day chips and expanded editor chips / rail. */
export const SUMMARY_GLYPH_ICON: Record<InterviewFlowSummaryGlyph, LucideIcon> = {
  time: Clock,
  turns: MessageCircle,
  replies: Reply,
  probes: ListChecks,
  probeCap: ListOrdered,
  targets: Crosshair,
  pack: Package,
  opening: Sunrise,
  closing: Sunset,
  required: BadgeCheck,
  when: Filter,
  fail: ShieldAlert,
  gate: Shield,
  count: Hash,
  meta: Info,
  kind: Hash,
  lang: Code2,
  lock: Lock,
  refs: Link2,
}

const TONE_FALLBACK_GLYPH: Record<InterviewFlowSummaryTagTone, InterviewFlowSummaryGlyph> = {
  kind: 'kind',
  count: 'count',
  time: 'time',
  pack: 'pack',
  gate: 'gate',
  meta: 'meta',
  accent: 'opening',
}

export function iconForSummaryGlyph(glyph: InterviewFlowSummaryGlyph): LucideIcon {
  return SUMMARY_GLYPH_ICON[glyph]
}

export function iconForSummaryTag(tag: {
  glyph?: InterviewFlowSummaryGlyph
  tone?: InterviewFlowSummaryTagTone
}): LucideIcon {
  if (tag.glyph) return SUMMARY_GLYPH_ICON[tag.glyph]
  if (tag.tone) return SUMMARY_GLYPH_ICON[TONE_FALLBACK_GLYPH[tag.tone]]
  return SUMMARY_GLYPH_ICON.meta
}
