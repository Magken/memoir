/**
 * Resolve Talk Verify section chrome from the live interview brief —
 * same title / description path as gate Talk (`buildInterviewLandingView`).
 */
import type { Creator2BriefDocument } from '../interviewBrief/creator2BriefTypes'
import { buildInterviewLandingView } from '../interviewBrief/interviewLandingView'
import { mapCreator2BriefToTimeline } from '../interviewBrief/mapCreator2BriefToTimeline'
import type { TalkVerifyTalkSectionsFile } from './talkVerifyModal'

export type TalkVerifyBriefSection = {
  phaseId: string
  topicId: string
  title: string
  description: string
  probeCount: number
  maxFollowUps: number
  targets?: Array<{ key: string; label: string }>
}

/**
 * Live Talk depth string at section open (probe 1 / follow-up 0).
 * Matches {@link buildDepthLabel} shape from discussionRunner.
 */
export function formatTalkVerifyDepthLabel(
  probeCount: number,
  maxFollowUps: number,
): string {
  const total = Math.max(1, probeCount)
  if (maxFollowUps <= 0) return `Probe 1 of ${total}`
  return `Probe 1 of ${total} · Follow-up 0 of ${maxFollowUps}`
}

/**
 * Discussion sections in spine order — title/description from landing view.
 */
export function talkVerifyBriefSections(
  brief: Creator2BriefDocument,
): TalkVerifyBriefSection[] {
  const landing = buildInterviewLandingView(brief)
  const timeline = mapCreator2BriefToTimeline(brief)
  const rawDefaults = brief.definition?.probeDefaults?.maxFollowUps
  const defaultFollowUps = Math.max(
    0,
    typeof rawDefaults === 'number' && Number.isFinite(rawDefaults) ? rawDefaults : 1,
  )
  return timeline.steps
    .filter((step) => step.kind === 'talk' && !step.offSpine)
    .map((step) => {
      const landingSec = landing.sections.find((s) => s.id === step.id)
      const te = step.talkEditor
      const probes = te?.probes?.length ?? step.probes?.length ?? 1
      const maxProbesRaw = te?.maxProbes
      const probeCount =
        maxProbesRaw != null && maxProbesRaw > 0
          ? Math.min(probes, maxProbesRaw)
          : Math.max(1, probes)
      const maxFollowUps =
        te?.maxFollowUps != null ? Math.max(0, te.maxFollowUps) : defaultFollowUps
      const topicId = te?.topicId || ''
      const topic = brief.topicLibrary?.find((t) => t.id === topicId)
      const targets = (topic?.targets ?? [])
        .filter((t) => t.key)
        .map((t) => ({ key: t.key, label: String(t.label || t.key).trim() }))
      return {
        phaseId: step.id,
        topicId,
        title: (landingSec?.title || step.title || 'Discussion').trim(),
        description: (landingSec?.description || '').trim(),
        probeCount,
        maxFollowUps,
        ...(targets.length ? { targets } : {}),
      }
    })
}

/**
 * Talk Verify sidecar from the live brief — same titles as gate Talk.
 * Used instead of the canned attempt fixture when reviewing this interview.
 */
export function talkSectionsMetaFromBrief(
  brief: Creator2BriefDocument,
): TalkVerifyTalkSectionsFile {
  const byTopicId: TalkVerifyTalkSectionsFile['byTopicId'] = {}
  for (const s of talkVerifyBriefSections(brief)) {
    if (!s.topicId) continue
    byTopicId[s.topicId] = {
      phaseId: s.phaseId,
      title: s.title,
      description: s.description,
    }
  }
  return { byTopicId }
}
