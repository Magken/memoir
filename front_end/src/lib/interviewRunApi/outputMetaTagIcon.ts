import {
  Braces,
  CircleAlert,
  CircleCheck,
  CircleMinus,
  CircleX,
  Clock,
  Compass,
  Gauge,
  Keyboard,
  ListChecks,
  Scan,
  ScanEye,
  ScanSearch,
  Shield,
  ShieldAlert,
  ShieldX,
  type LucideIcon,
} from 'lucide-react'
import type { InterviewOutputMetaTag } from './fixtures/output-cards/outputCardFixture'
import type { SittingReadTag } from './sittingReadMarkup'

type SittingReadChipKind = 'talk' | 'coding' | 'doc' | 'form'

export type SittingReadChipHintOpts = {
  hint?: string
  kind?: SittingReadChipKind
  tags: readonly Pick<SittingReadTag, 'label'>[]
  index: number
}

function percentRank(
  tags: readonly Pick<SittingReadTag, 'label'>[],
  index: number,
): number {
  let rank = -1
  for (let i = 0; i <= index; i += 1) {
    if (/%/.test(tags[i]?.label ?? '')) rank += 1
  }
  return rank
}

/** Tooltip copy when chips share an icon (coding 90% vs 75%). */
export function sittingReadChipHint(
  label: string,
  opts: SittingReadChipHintOpts,
): string {
  const named = opts.hint?.trim()
  if (named && !/^(score|count|typical)$/i.test(named)) return named
  const text = label.trim()
  const kind = opts.kind
  if (/\bwpm\b/i.test(text)) return 'Typing'
  if (/\bmin\b/i.test(text)) return 'Time'
  if (/^pass$/i.test(text) || /^fail$/i.test(text)) return 'Gate'
  if (/%/.test(text)) {
    if (kind === 'coding') {
      const rank = percentRank(opts.tags, opts.index)
      if (rank === 0) return 'Hidden tests'
      if (rank === 1) return 'Approach mark'
    }
    if (kind === 'doc') return 'Essay mark'
    if (kind === 'talk') return 'Conversation turns'
    if (kind === 'form') return 'Form items'
    return 'Time on the work'
  }
  if (/^\d+\s*\/\s*\d+$/.test(text)) {
    if (kind === 'form') return 'Form items'
    if (kind === 'talk') return 'Conversation turns'
    if (kind === 'coding') return 'Hidden tests'
    return 'Form items'
  }
  return opts.hint?.trim() || 'Measure'
}

/** Same icon map as the collapsed Results card. */
export function outputMetaTagIcon(tag: InterviewOutputMetaTag): LucideIcon {
  if (tag.id === 'sections') return ListChecks
  if (tag.id === 'gate') {
    if (tag.signal === 'good') return CircleCheck
    if (tag.signal === 'bad') return CircleX
    return CircleAlert
  }
  if (tag.id === 'duration') return Clock
  if (tag.id === 'skipped') return CircleMinus
  if (tag.id === 'anomalies') {
    if (tag.signal === 'good') return Scan
    if (tag.signal === 'watch') return ScanSearch
    return ScanEye
  }
  if (tag.signal === 'good') return Shield
  if (tag.signal === 'watch') return ShieldAlert
  return ShieldX
}

/** Chip icon for a sitting-read reading (time, score, gate, count). */
export function sittingReadChipIcon(
  label: string,
  signal: InterviewOutputMetaTag['signal'],
  hint?: string,
): LucideIcon {
  const text = label.trim()
  const key = (hint ?? '').trim().toLowerCase()
  if (key === 'time' || /\bmin\b/i.test(text)) return Clock
  if (key === 'marking') return CircleAlert
  if (key === 'tests') return Braces
  if (key === 'method') return Compass
  if (key === 'typing' || /\bwpm\b/i.test(text)) return Keyboard
  if (key === 'items' || key === 'count' || key === 'turns' || key === 'stages') {
    return ListChecks
  }
  if (key === 'gate' || /^pass$/i.test(text)) return CircleCheck
  if (key === 'marking' || /^marking$/i.test(text)) return CircleAlert
  if (/^fail$/i.test(text)) return CircleX
  if (/%/.test(text)) return Gauge
  if (/^\d+\s*\/\s*\d+$/.test(text)) return ListChecks
  if (signal === 'good') return CircleCheck
  if (signal === 'watch') return CircleAlert
  return CircleX
}

/** Complete n/n chips stay green even when a collector left them on watch. */
export function completeRatioSignal(
  reading: string,
): InterviewOutputMetaTag['signal'] | null {
  const text = reading.trim()
  if (!text || /\bmin\b/i.test(text)) return null
  const m = /^(\d+)\s*\/\s*(\d+)(?:\s|$)/.exec(text)
  if (!m) return null
  const got = Number(m[1])
  const max = Number(m[2])
  if (!max) return null
  if (got >= max) return 'good'
  if (got <= 0) return 'bad'
  return 'watch'
}
