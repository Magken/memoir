/**
 * Static candidate preamble tips for a gate — not AI copy.
 * Compact summary-row voice (short label + trailing meta).
 */
import { isTalkKindLabel, TALK_KIND_LABEL } from '../interviewBrief/interviewLandingView'

export type GatePreambleIcon =
  | 'water'
  | 'pause'
  | 'timer'
  | 'focus'
  | 'quiet'
  | 'device'
  | 'note'
  | 'noLeave'
  | 'mic'
  | 'keyboard'
  | 'form'
  | 'doc'
  | 'assist'
  | 'assistOff'
  | 'assistCoach'
  | 'assistCopilot'

export type GatePreambleItem = {
  id: string
  icon: GatePreambleIcon
  /** Short primary line (summary-list style). */
  label: string
  /** Trailing caption (like stage time). */
  meta?: string
}

export type GatePreamble = {
  eyebrow: string
  items: readonly GatePreambleItem[]
}

function uniqueById(items: GatePreambleItem[]): GatePreambleItem[] {
  const seen = new Set<string>()
  const out: GatePreambleItem[] = []
  for (const item of items) {
    if (seen.has(item.id)) continue
    seen.add(item.id)
    out.push(item)
  }
  return out
}

/** Build a short prep list for the arriving gate. */
export function buildGatePreamble(input: {
  kindLabel: string
  timed: boolean
  timeLabel: string
  index: number
  /** Catalog candidate notice + bundle label — Form/Coding/Writing only. Prep fact, not a speaking I. */
  assist?: { candidateNotice: string; label: string } | null
}): GatePreamble {
  const kind = input.kindLabel
  const timed = input.timed
  const limit = input.timeLabel.trim() || 'Timed'
  const rotate = input.index % 3

  const commonUntimed: GatePreambleItem[] = [
    { id: 'water', icon: 'water', label: 'Water & stretch', meta: 'OK now' },
    { id: 'pause', icon: 'pause', label: 'Pause between answers', meta: 'No timer' },
    {
      id: 'quiet',
      icon: 'quiet',
      label: rotate === 0 ? 'Quiet spot' : rotate === 1 ? 'Silence notifications' : 'Stay on this tab',
      meta: 'Focus',
    },
    { id: 'device', icon: 'device', label: 'Stable connection', meta: 'Type-ready' },
  ]

  const commonTimed: GatePreambleItem[] = [
    { id: 'timer', icon: 'timer', label: 'Hard timer', meta: limit },
    { id: 'noLeave', icon: 'noLeave', label: 'Leave forfeits stage', meta: 'No resume' },
    { id: 'focus', icon: 'focus', label: 'No breaks after Start', meta: 'Prep first' },
    { id: 'quiet', icon: 'quiet', label: 'Silence notifications', meta: 'Before Start' },
  ]

  const kindExtras: GatePreambleItem[] = []
  if (isTalkKindLabel(kind)) {
    kindExtras.push(
      timed
        ? { id: 'mic', icon: 'mic', label: 'Short, concrete answers', meta: TALK_KIND_LABEL }
        : {
            id: 'mic',
            icon: 'mic',
            label: rotate === 0 ? 'Short turns' : 'Pause to think',
            meta: TALK_KIND_LABEL,
          },
    )
  } else if (kind === 'Form') {
    kindExtras.push({
      id: 'form',
      icon: 'form',
      label: timed ? 'Required items first' : 'Review before submit',
      meta: 'Form',
    })
  } else if (kind === 'Coding') {
    kindExtras.push({
      id: 'keyboard',
      icon: 'keyboard',
      label: timed ? 'Editor ready' : 'Skim, then code',
      meta: 'Coding',
    })
  } else if (kind === 'Writing') {
    kindExtras.push({
      id: 'doc',
      icon: 'doc',
      label: timed ? 'Outline, then write' : 'Structure before polish',
      meta: 'Writing',
    })
  } else {
    kindExtras.push({
      id: 'note',
      icon: 'note',
      label: 'Read the stage notes',
      meta: 'Then Start',
    })
  }

  const assistIcon: GatePreambleIcon =
    input.assist?.label === 'Off'
      ? 'assistOff'
      : input.assist?.label === 'Coach'
        ? 'assistCoach'
        : input.assist?.label === 'Copilot'
          ? 'assistCopilot'
          : 'assist'

  const assistRow: GatePreambleItem | null =
    (kind === 'Form' || kind === 'Coding' || kind === 'Writing') && input.assist
      ? {
          id: 'assist',
          icon: assistIcon,
          label: input.assist.candidateNotice,
          meta: input.assist.label,
        }
      : null

  const items = uniqueById([
    ...(timed ? commonTimed : commonUntimed).slice(0, 3),
    ...kindExtras,
    ...(assistRow ? [assistRow] : []),
  ]).slice(0, 5)

  return {
    eyebrow: timed ? 'Before the clock' : 'Before you begin',
    items,
  }
}
