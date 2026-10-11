import type { IconSvgElement } from '@hugeicons/react'
import {
  AiMicIcon,
  CheckListIcon,
  File01Icon,
  Route01Icon,
  SparklesIcon,
} from '@hugeicons/core-free-icons'
import { HOME_ASSETS, type HomeAsset } from '../homeAssets/catalog'
import type { VurifyPricingFeature } from '../pricing/vurifyPricingTiers'
import type { TryInterviewStageId } from './tryInterviewStages'

export type TryInterviewKitId = 'talk' | 'coding' | 'full'

export type TryInterviewKit = {
  id: TryInterviewKitId
  title: string
  description: string
  headline: string
  note: string
  /** Resting marquee on the take CTA. */
  ctaLabel: string
  /** Hover strip on the take CTA. */
  ctaMarquee: string
  icon: IconSvgElement
  art: HomeAsset
  features: readonly VurifyPricingFeature[]
  /** Interview landing stage kinds shown as icon+label tags. */
  stages: readonly TryInterviewStageId[]
  /** Proposed interview length for the landing-style time tag. */
  proposedMinutes: number
}

export const TRY_INTERVIEW_KITS: readonly TryInterviewKit[] = [
  {
    id: 'talk',
    title: 'Test conversational interview',
    description:
      'Talk with Harbor about one piece of work you owned. The interviewer asks again when the story stays thin so the record has a real example, not a slogan.',
    headline: 'Conversation',
    note: 'About 8 minutes',
    ctaLabel: 'Take a conversational interview',
    ctaMarquee: 'Proof in the room',
    icon: AiMicIcon,
    art: HOME_ASSETS.offerInterviewTaking,
    features: [
      { id: 'live-talk', label: 'Talk with Harbor', icon: AiMicIcon },
      { id: 'follow-up', label: 'Follow-up when answers stay thin', icon: SparklesIcon },
      { id: 'spoken-proof', label: 'Spoken proof on the record', icon: File01Icon },
    ],
    stages: ['talk'],
    proposedMinutes: 8,
  },
  {
    id: 'coding',
    title: 'Test coding interview',
    description:
      'Write the Harbor weekly momentum score in the editor. Copilot can propose an edit on the same brief. Hidden tests check solve(n) while you work.',
    headline: 'Coding',
    note: 'Copilot on the brief',
    ctaLabel: 'Take a coding interview',
    ctaMarquee: 'Write with Copilot',
    icon: Route01Icon,
    art: HOME_ASSETS.whatGetsItDone,
    features: [
      { id: 'challenge', label: 'Harbor momentum score', icon: Route01Icon },
      { id: 'copilot', label: 'Copilot beside the brief', icon: SparklesIcon },
      { id: 'hidden-tests', label: 'Hidden tests on solve(n)', icon: CheckListIcon },
    ],
    stages: ['coding'],
    proposedMinutes: 20,
  },
  {
    id: 'full',
    title: 'Test full interview',
    description:
      'Open with a short Harbor form, then the momentum-score function, a ship or wait memo, and a live conversation to close. Four sections in one practice interview.',
    headline: 'Full interview',
    note: 'Four sections plus Copilot',
    ctaLabel: 'Take a full interview',
    ctaMarquee: 'Form through conversation',
    icon: CheckListIcon,
    art: HOME_ASSETS.tryVurify,
    features: [
      { id: 'form', label: 'Short form before you start', icon: CheckListIcon },
      { id: 'write-work', label: 'Coding and a written memo', icon: File01Icon },
      { id: 'talk-close', label: 'Live conversation to close', icon: AiMicIcon },
    ],
    stages: ['form', 'coding', 'writing', 'talk'],
    proposedMinutes: 45,
  },
]

export { wrapTryInterviewKitIndex } from './wrapTryInterviewKitIndex'
export type { TryInterviewStageId } from './tryInterviewStages'
export {
  TRY_INTERVIEW_STAGE_META,
  TRY_INTERVIEW_TIME_ICON,
  tryInterviewProposedTimeLabel,
} from './tryInterviewStages'
