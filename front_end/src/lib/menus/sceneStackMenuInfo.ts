import type { LucideIcon } from 'lucide-react'
import {
  Building2,
  ClipboardCheck,
  FileText,
  ListOrdered,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Users,
  Waypoints,
} from 'lucide-react'
import { HOME_ASSETS } from '../homeAssets/catalog'

/** Scrollable reading article for SceneStackMenu `info` mode. */
export type SceneStackMenuInfoArticle = {
  id: string
  overline?: string
  title: string
  /** Short introduction under the title. */
  lead?: string
  /** Pinned side preview (above copy on small screens). */
  video?: {
    src: string
    alt: string
  }
  blocks: readonly SceneStackMenuInfoBlock[]
}

export type SceneStackMenuInfoFeature = {
  icon: LucideIcon
  label: string
}

export type SceneStackMenuInfoBlock =
  | { type: 'p'; text: string }
  | {
      type: 'section'
      title: string
      icon: LucideIcon
      text: string
    }
  | { type: 'image'; src: string; alt: string; caption?: string }
  | { type: 'video'; src: string; alt: string }
  | { type: 'features'; items: readonly SceneStackMenuInfoFeature[] }

/**
 * Home “What gets it done” → menu info peel.
 * Copy from Auryn overview proposal, plain voice. Desktop: text left, pinned video right.
 */
export const VURIFY_OFFER_INFO_ARTICLES = {
  organisation: {
    id: 'organisation',
    overline: 'What gets it done',
    title: 'Hiring managers',
    lead: 'Think of Vurify as standing up a hiring organisation under your name — for hiring managers and recruiters. Roles, interviews, and results live there. It is your roof.',
    video: {
      src: HOME_ASSETS.offerAgencyManagementVideo.src,
      alt: 'Organisation workspace preview',
    },
    blocks: [
      {
        type: 'section',
        title: 'Your hiring roof',
        icon: Building2,
        text: 'We create the organisation space for your company. One home for interviews, interviewers, candidates, and results. Hiring managers and recruiters steer the hire. Everything sits under your name.',
      },
      {
        type: 'section',
        title: 'Interviewers under your name',
        icon: Users,
        text: 'Interviewers belong to the organisation. They can create and edit interviews of their own, in their voice and tailor it to fit the company’s model. Your team can fill that role. Vurify can also act as interviewers under your organisation when you see the PROOF.',
      },
      {
        type: 'section',
        title: 'Security and ownership',
        icon: ShieldCheck,
        text: 'Security stays inside the roof too. You control who can see roles, attempts, and results, and you manage ownership from one place.',
      },
    ],
  },
  'interview-creation': {
    id: 'interview-creation',
    overline: 'What gets it done',
    title: 'Interview creation',
    lead: 'Interviewers build the path for a role: which steps, in what order, and what good looks like.',
    video: {
      src: HOME_ASSETS.offerInterviewCreationVideo.src,
      alt: 'Interview creator preview',
    },
    blocks: [
      {
        type: 'section',
        title: 'Build the path',
        icon: Waypoints,
        text: 'Conversation, quiz, coding, writing, and custom editors when you need them. The creator keeps the whole path in one place, with help beside the work.',
      },
      {
        type: 'section',
        title: 'Topics and interview structure',
        icon: ListOrdered,
        text: 'You set the topics and what good answers should cover. Timers, stages, follow-ups, and interview structure sit inside the path so each hire can run the same way.',
      },
      {
        type: 'section',
        title: 'Bots beside the work',
        icon: Sparkles,
        text: 'Use the pieces you need for a role. Skip the rest. Bot assistants sit at each stage too, and each one can edit the work itself, not only chat about it.',
      },
    ],
  },
  'cv-intake': {
    id: 'cv-intake',
    overline: 'What gets it done',
    title: 'Résumé intake',
    lead: 'Gather details, documents, and eligibility before the interview starts so it opens ready.',
    video: {
      src: HOME_ASSETS.offerCvIntakeVideo.src,
      alt: 'Résumé intake preview',
    },
    blocks: [
      {
        type: 'section',
        title: 'One place for intake',
        icon: FileText,
        text: 'Intake sits in front of the live interview. Candidates send what you need once, in one place, instead of scattering forms across email and side tools.',
      },
      {
        type: 'section',
        title: 'Ready before start',
        icon: ClipboardCheck,
        text: 'You can collect the basics for the role, attach documents, and ask eligibility questions up front. When the interview begins, the path opens clean.',
      },
      {
        type: 'section',
        title: 'Checks when the role needs them',
        icon: ShieldCheck,
        text: 'Add background checks to intake when the role needs them, before or beside the interview. The goal is simple: the candidate arrives ready, and your team is not chasing paperwork mid-interview.',
      },
    ],
  },
  'live-interview': {
    id: 'live-interview',
    overline: 'What gets it done',
    title: 'Live interview',
    lead: 'Candidates see a clear overview of the interview, then walk each step in order. Follow-ups and tasks stay in one story.',
    video: {
      src: HOME_ASSETS.offerLiveInterviewVideo.src,
      alt: 'Live interview preview',
    },
    blocks: [
      {
        type: 'section',
        title: 'Overview before they start',
        icon: ListOrdered,
        text: 'Before they start, candidates can see the role, the length, and the structure of the interview. Then they move through each step you set for that hire.',
      },
      {
        type: 'section',
        title: 'Conversation with follow-ups',
        icon: MessageCircle,
        text: 'In conversation, the interviewer opens the topic and follows up when answers stay thin. You can warm up, go deep, talk through conflict, or close with the candidate’s own questions.',
      },
      {
        type: 'section',
        title: 'One story for the interview',
        icon: Waypoints,
        text: 'Coding, writing, forms, and custom editors sit in the same path. The candidate is not bounced between separate tools. One story for the whole interview.',
      },
    ],
  },
  'hiring-package': {
    id: 'hiring-package',
    overline: 'What gets it done',
    title: 'Output card',
    lead: 'When the attempt ends, the hiring manager and the organisation get the output card: who rose, and why.',
    video: {
      src: HOME_ASSETS.offerHiringPackageVideo.src,
      alt: 'Hiring package preview',
    },
    blocks: [
      {
        type: 'section',
        title: 'Packed for the reviewer',
        icon: ClipboardCheck,
        text: 'Everything from the attempt is packed for the reviewer at the end. Conversation, quiz, coding, and writing come together in one view.',
      },
      {
        type: 'section',
        title: 'Open where marks came from',
        icon: MessageCircle,
        text: 'Open the full conversation and see where each mark came from, including what the interviewer assigned and why. Add your own notes, adjust the decision process, and keep the call in your hands.',
      },
      {
        type: 'section',
        title: 'Ranked output card with reasons',
        icon: Building2,
        text: 'You decide which signals matter more for that role. The output is a ranked output card with short explanations you can check, not a single number with no trail.',
      },
    ],
  },
} as const satisfies Record<string, SceneStackMenuInfoArticle>

export function vurifyOfferInfoArticle(
  itemId: string,
): SceneStackMenuInfoArticle | null {
  return VURIFY_OFFER_INFO_ARTICLES[itemId as keyof typeof VURIFY_OFFER_INFO_ARTICLES] ?? null
}
