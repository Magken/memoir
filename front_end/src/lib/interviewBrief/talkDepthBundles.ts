/** Selectable conversation depth presets for Creator 2 talk sections. */

export type TalkDepthBundleId = 'short' | 'standard' | 'long'

export type TalkDepthValues = {
  targetMinutes: number
  maxFollowUps: number
  maxProbes: number
  minCandidateTurns: number
}

export type TalkDepthBundle = TalkDepthValues & {
  id: TalkDepthBundleId
  label: string
  /** Compact chip / teaser line. */
  summary: string
}

export const TALK_DEPTH_BUNDLES: readonly TalkDepthBundle[] = [
  {
    id: 'short',
    label: 'Short',
    summary: 'Quick check — ~3 minutes, one turn, no follow-ups, two probes',
    targetMinutes: 3,
    maxFollowUps: 0,
    maxProbes: 2,
    minCandidateTurns: 1,
  },
  {
    id: 'standard',
    label: 'Standard',
    summary: 'Balanced talk — ~5 minutes, one turn, one reply, four probes',
    targetMinutes: 5,
    maxFollowUps: 1,
    maxProbes: 4,
    minCandidateTurns: 1,
  },
  {
    id: 'long',
    label: 'Long',
    summary: 'Deep dive — ~10 minutes, two turns, two replies, six probes',
    targetMinutes: 10,
    maxFollowUps: 2,
    maxProbes: 6,
    minCandidateTurns: 2,
  },
]

export function talkDepthBundleById(id: TalkDepthBundleId): TalkDepthBundle {
  return TALK_DEPTH_BUNDLES.find((b) => b.id === id) ?? TALK_DEPTH_BUNDLES[1]!
}

export function resolveTalkDepthValues(
  state: {
    targetMinutes: number
    maxFollowUps?: number | null
    maxProbes?: number | null
    minCandidateTurns?: number | null
  },
  defaults: {
    maxFollowUps?: number
    maxProbes?: number
    minCandidateTurns?: number
  } = {},
): TalkDepthValues {
  return {
    targetMinutes: state.targetMinutes,
    maxFollowUps: state.maxFollowUps ?? defaults.maxFollowUps ?? 1,
    maxProbes: state.maxProbes ?? defaults.maxProbes ?? 4,
    minCandidateTurns: state.minCandidateTurns ?? defaults.minCandidateTurns ?? 1,
  }
}

export function matchTalkDepthBundle(
  values: TalkDepthValues,
): TalkDepthBundleId | 'custom' {
  for (const bundle of TALK_DEPTH_BUNDLES) {
    if (
      bundle.targetMinutes === values.targetMinutes &&
      bundle.maxFollowUps === values.maxFollowUps &&
      bundle.maxProbes === values.maxProbes &&
      bundle.minCandidateTurns === values.minCandidateTurns
    ) {
      return bundle.id
    }
  }
  return 'custom'
}

export function talkDepthPatchFromBundle(id: TalkDepthBundleId): TalkDepthValues {
  const b = talkDepthBundleById(id)
  return {
    targetMinutes: b.targetMinutes,
    maxFollowUps: b.maxFollowUps,
    maxProbes: b.maxProbes,
    minCandidateTurns: b.minCandidateTurns,
  }
}
