import type { LucideIcon } from 'lucide-react'
import {
  Building2,
  ClipboardCheck,
  Code2,
  FileText,
  FormInput,
  ListOrdered,
  MessageCircle,
  PenLine,
  ShieldCheck,
  Star,
  Users,
  Waypoints,
} from 'lucide-react'
import { HOME_ASSETS } from '../homeAssets/catalog'

export type VurifyExpertiseStepTag = {
  label: string
  icon: LucideIcon
}

export type VurifyExpertiseStep = {
  id: string
  title: string
  body: string
  image: {
    src: string
    alt: string
  }
  /** Concrete proposal pieces as icon pills (not soft slogans). */
  tags?: readonly VurifyExpertiseStepTag[]
  /** Final rail note — shows Get Started marquee instead of media. */
  kind?: 'step' | 'cta'
}

export type VurifyExpertiseAudience = 'employers' | 'candidates'

/**
 * Employers path — proposal “How we work with you” diagram (4 beats + CTA).
 * Copy stays close to draft.tex; art reuses Home offer illustrations.
 */
export const VURIFY_EXPERTISE_EMPLOYERS: readonly VurifyExpertiseStep[] = [
  {
    id: 'organisation',
    title: 'Hiring managers',
    body: 'We create the organisation space for your company. One home for interviews, interviewers, candidates, and results. Hiring managers and recruiters steer the hire. Everything sits under your name.',
    image: {
      src: HOME_ASSETS.offerAgencyManagement.src,
      alt: HOME_ASSETS.offerAgencyManagement.alt,
    },
    tags: [
      { icon: Building2, label: 'Interviews' },
      { icon: Users, label: 'Interviewers' },
      { icon: ClipboardCheck, label: 'Results' },
    ],
  },
  {
    id: 'create',
    title: 'Create and edit interviews',
    body: 'Interviewers build the path for a role: which steps, in what order, and what good looks like. Conversation, quiz, coding, writing, and custom editors when you need them.',
    image: {
      src: HOME_ASSETS.offerReviewAnalysis.src,
      alt: HOME_ASSETS.offerReviewAnalysis.alt,
    },
    tags: [
      { icon: MessageCircle, label: 'Conversation' },
      { icon: FormInput, label: 'Quiz' },
      { icon: Code2, label: 'Coding' },
      { icon: PenLine, label: 'Writing' },
    ],
  },
  {
    id: 'live',
    title: 'Candidates take the interview',
    body: 'Candidates see a clear overview of the interview, then walk each step in order. Follow-ups and tasks stay in one story.',
    image: {
      src: HOME_ASSETS.offerInterviewTaking.src,
      alt: HOME_ASSETS.offerInterviewTaking.alt,
    },
    tags: [
      { icon: ListOrdered, label: 'Role, length, structure' },
      { icon: MessageCircle, label: 'Follow-ups' },
      { icon: Waypoints, label: 'One story' },
    ],
  },
  {
    id: 'package',
    title: 'Output card',
    body: 'When the attempt ends, the hiring manager and the organisation get the output card: who rose, and why. Reasons you can open and check.',
    image: {
      src: HOME_ASSETS.offerInformedDecision.src,
      alt: HOME_ASSETS.offerInformedDecision.alt,
    },
    tags: [
      { icon: Users, label: 'Who rose' },
      { icon: FileText, label: 'Why' },
      { icon: ClipboardCheck, label: 'Open and check' },
    ],
  },
  {
    id: 'start',
    kind: 'cta',
    title: 'Start under your name',
    body: 'Stand up the organisation, set the path, and get an output card with reasons you can check.',
    image: {
      src: HOME_ASSETS.offerAgencyManagement.src,
      alt: '',
    },
  },
]

/**
 * Candidates path — proposal: interviewee intake → clear overview →
 * walk each step → interviewee feedback.
 */
export const VURIFY_EXPERTISE_CANDIDATES: readonly VurifyExpertiseStep[] = [
  {
    id: 'intake',
    title: 'Interviewee intake',
    body: 'Gather details, documents, and eligibility before the interview starts so it opens ready.',
    image: {
      src: HOME_ASSETS.offerResumeUpload.src,
      alt: HOME_ASSETS.offerResumeUpload.alt,
    },
    tags: [
      { icon: FileText, label: 'Details' },
      { icon: ClipboardCheck, label: 'Documents' },
      { icon: ShieldCheck, label: 'Eligibility' },
    ],
  },
  {
    id: 'overview',
    title: 'A clear overview',
    body: 'Before you start, see the role, the length, and how the interview is structured.',
    image: {
      src: HOME_ASSETS.tryVurify.src,
      alt: HOME_ASSETS.tryVurify.alt,
    },
    tags: [
      { icon: Building2, label: 'Role' },
      { icon: ListOrdered, label: 'Length' },
      { icon: Waypoints, label: 'Structure' },
    ],
  },
  {
    id: 'walk',
    title: 'Walk each step',
    body: 'Then walk each step in order — conversation, quiz, coding, writing, and more. Follow-ups and tasks stay in one story.',
    image: {
      src: HOME_ASSETS.offerInterviewTaking.src,
      alt: HOME_ASSETS.offerInterviewTaking.alt,
    },
    tags: [
      { icon: MessageCircle, label: 'Conversation' },
      { icon: Code2, label: 'Coding' },
      { icon: PenLine, label: 'Writing' },
      { icon: FormInput, label: 'Forms' },
    ],
  },
  {
    id: 'feedback',
    title: 'Interviewee feedback',
    body: 'After you finish, share how the interview felt, so the path can improve for the next hire.',
    image: {
      src: HOME_ASSETS.offerInformedDecision.src,
      alt: HOME_ASSETS.offerInformedDecision.alt,
    },
    tags: [
      { icon: Star, label: 'How it felt' },
      { icon: Waypoints, label: 'Improve the path' },
    ],
  },
  {
    id: 'start',
    kind: 'cta',
    title: 'Take the interview',
    body: 'Walk the path set for the role — from intake through every step.',
    image: {
      src: HOME_ASSETS.offerResumeUpload.src,
      alt: '',
    },
  },
]

export const VURIFY_EXPERTISE_BY_AUDIENCE: Record<
  VurifyExpertiseAudience,
  readonly VurifyExpertiseStep[]
> = {
  employers: VURIFY_EXPERTISE_EMPLOYERS,
  candidates: VURIFY_EXPERTISE_CANDIDATES,
}
