import type { LucideIcon } from 'lucide-react'
import {
  Bot,
  Briefcase,
  Calendar,
  ChartColumn,
  ClipboardList,
  GraduationCap,
  Mail,
  MessageSquare,
  ShieldCheck,
  Users,
} from 'lucide-react'

/** One extras card from Auryn “What more does Vurify offer”. */
export type VurifyMoreFeature = {
  id: string
  title: string
  body: string
  icon: LucideIcon
}

/**
 * Curated extras for Home — proposal copy, plain voice.
 * Skip pieces already covered hard in Scene 03 / How it Works (intake, feedback).
 */
export const VURIFY_MORE_FEATURES: readonly VurifyMoreFeature[] = [
  {
    id: 'security',
    title: 'Security',
    body: 'Control who can see roles, attempts, and results. Keep hiring data inside your organisation.',
    icon: ShieldCheck,
  },
  {
    id: 'interview-features',
    title: 'Interview features',
    body: 'Timers, stages, follow-ups, and structure sit inside the path so each hire runs the same way.',
    icon: ClipboardList,
  },
  {
    id: 'bot-assistance',
    title: 'Bot assistance',
    body: 'Not a simple chat helper. Each assistant can edit and drive the default editors and your custom ones too.',
    icon: Bot,
  },
  {
    id: 'ats',
    title: 'ATS',
    body: 'An applicant tracking system for your pipeline: candidates, stages, status, and handoff into the interview path.',
    icon: Briefcase,
  },
  {
    id: 'messaging',
    title: 'Messaging',
    body: 'Direct chat with candidates and your hiring team, next to the work, not in a separate app.',
    icon: MessageSquare,
  },
  {
    id: 'email',
    title: 'Email',
    body: 'Send invites, reminders, and updates by email when people need a nudge outside the product.',
    icon: Mail,
  },
  {
    id: 'timetabling',
    title: 'Timetabling',
    body: 'Set open windows, slots, and timing so candidates and interviewers know when things happen.',
    icon: Calendar,
  },
  {
    id: 'reporting',
    title: 'Reporting',
    body: 'See attempts, scores, and outcomes across candidates without digging through each output card by hand.',
    icon: ChartColumn,
  },
  {
    id: 'candidate-onboarding',
    title: 'Candidate onboarding',
    body: 'Teach candidates how to use each step before they start: conversation, forms, coding, writing, and custom editors.',
    icon: GraduationCap,
  },
  {
    id: 'direct-management',
    title: 'Direct management',
    body: 'Manage roles, interviewers, ownership, and who sits under the organisation from one place.',
    icon: Users,
  },
]
