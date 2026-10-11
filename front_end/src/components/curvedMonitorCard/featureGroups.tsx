import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import {
  Briefcase,
  Calendar,
  ClipboardCheck,
  ClipboardList,
  Eye,
  FileText,
  GlobeLock,
  Laptop,
  ListOrdered,
  MessageCircle,
  MessageSquare,
  Shield,
  ShieldCheck,
  Waypoints,
} from 'lucide-react'
import { VURIFY_MORE_FEATURES } from '../../lib/home/vurifyMoreFeatures'
import type { CurvedMonitorSlide } from '../../lib/shape3d/curvedMonitor'
import { CURVED_MONITOR_OFFER_STILLS } from './stills'

export type FeatureItem = {
  id: string
  label: string
  icon: LucideIcon
  body: ReactNode
}

export type FeatureGroup = {
  id: string
  title: string
  icon: LucideIcon
  features: readonly FeatureItem[]
  slides: readonly CurvedMonitorSlide[]
}

const SECURITY_STILL = CURVED_MONITOR_OFFER_STILLS.cvIntake
const LIVE_STILL = CURVED_MONITOR_OFFER_STILLS.liveInterview
const OUTPUT_STILL = CURVED_MONITOR_OFFER_STILLS.hiringPackage

export const DEFAULT_STILL = SECURITY_STILL

export const DEFAULT_GROUP: FeatureGroup = {
  id: 'security',
  title: 'Security',
  icon: Shield,
  features: [
    {
      id: 'web-monitoring',
      label: 'Web monitoring',
      icon: Eye,
      body: (
        <>
          Watch browser tabs for <strong>unexpected navigation</strong>, extra windows, and copy-out.
          Pause the interview if the page leaves the path you set.
        </>
      ),
    },
    {
      id: 'vpn-tracking',
      label: 'VPN tracking',
      icon: GlobeLock,
      body: (
        <>
          Keep the interview on the network you invited. Flag hops that do not match the{' '}
          <strong>invite location</strong>, including a VPN or proxy that appears after the start.
        </>
      ),
    },
    {
      id: 'device-lock',
      label: 'Device lock',
      icon: Laptop,
      body: (
        <>
          Keep the interview on <strong>one machine</strong> from start to finish, and lock the
          session if a second device tries to join.
        </>
      ),
    },
    {
      id: 'session-audit',
      label: 'Session audit',
      icon: ClipboardCheck,
      body: (
        <>
          Keep a trail of who sat, on which machine, and <strong>when</strong> the session moved,
          stored beside the rest of the interview.
        </>
      ),
    },
  ],
  slides: [SECURITY_STILL],
}

const LIVE_GROUP: FeatureGroup = {
  id: 'live-interview',
  title: 'Live interview',
  icon: MessageCircle,
  features: [
    {
      id: 'overview',
      label: 'Overview',
      icon: ListOrdered,
      body: (
        <>
          Before they start, candidates see the role, the length, and the{' '}
          <strong>structure</strong> of the interview.
        </>
      ),
    },
    {
      id: 'conversation',
      label: 'Conversation',
      icon: MessageCircle,
      body: (
        <>
          The interviewer opens the topic and <strong>follows up</strong> when answers stay thin.
        </>
      ),
    },
    {
      id: 'work',
      label: 'Work',
      icon: Waypoints,
      body: (
        <>
          Coding, writing, forms, and <strong>custom editors</strong> sit in the same path.
        </>
      ),
    },
    {
      id: 'one-story',
      label: 'One story',
      icon: FileText,
      body: (
        <>
          Follow-ups and tasks stay in <strong>one interview</strong>, not a pile of separate tools.
        </>
      ),
    },
  ],
  slides: [LIVE_STILL],
}

const OUTPUT_GROUP: FeatureGroup = {
  id: 'output-card',
  title: 'Output card',
  icon: ClipboardCheck,
  features: [
    {
      id: 'who-rose',
      label: 'Who rose',
      icon: ClipboardCheck,
      body: (
        <>
          When the attempt ends, the hiring manager gets <strong>who rose</strong>, and why.
        </>
      ),
    },
    {
      id: 'reasons',
      label: 'Reasons',
      icon: FileText,
      body: (
        <>
          Open the reasons, check the signals, and keep the <strong>call</strong> in your hands.
        </>
      ),
    },
    {
      id: 'signals',
      label: 'Signals',
      icon: Eye,
      body: (
        <>
          Keep a trail of what the <strong>session</strong> showed, stored beside the rest of the
          interview.
        </>
      ),
    },
    {
      id: 'your-call',
      label: 'Your call',
      icon: Waypoints,
      body: (
        <>
          The output card is a read, not a verdict. <strong>You</strong> decide what happens next.
        </>
      ),
    },
  ],
  slides: [OUTPUT_STILL],
}

export const DEFAULT_GROUPS: readonly FeatureGroup[] = [DEFAULT_GROUP, LIVE_GROUP, OUTPUT_GROUP]

function moreFeatureItem(id: string, strong: string): FeatureItem {
  const src = VURIFY_MORE_FEATURES.find((item) => item.id === id)
  if (!src) {
    throw new Error(`missing more feature ${id}`)
  }
  const at = src.body.indexOf(strong)
  const body =
    at >= 0 ? (
      <>
        {src.body.slice(0, at)}
        <strong>{strong}</strong>
        {src.body.slice(at + strong.length)}
      </>
    ) : (
      <>{src.body}</>
    )
  return { id: src.id, label: src.title, icon: src.icon, body }
}

/** Home Scene 04b - extras grouped onto the bent card. */
export const HOME_FEATURE_GROUPS: readonly FeatureGroup[] = [
  {
    id: 'organisation',
    title: 'Organisation',
    icon: ShieldCheck,
    features: [
      moreFeatureItem('security', 'inside your organisation'),
      moreFeatureItem('direct-management', 'from one place'),
      moreFeatureItem('ats', 'applicant tracking system'),
    ],
    slides: [SECURITY_STILL],
  },
  {
    id: 'interview-extras',
    title: 'Interview extras',
    icon: ClipboardList,
    features: [
      moreFeatureItem('interview-features', 'inside the path'),
      moreFeatureItem('bot-assistance', 'custom ones too'),
      moreFeatureItem('candidate-onboarding', 'before they start'),
    ],
    slides: [LIVE_STILL],
  },
  {
    id: 'around-the-hire',
    title: 'Around the hire',
    icon: MessageSquare,
    features: [
      moreFeatureItem('messaging', 'next to the work'),
      moreFeatureItem('email', 'outside the product'),
      moreFeatureItem('timetabling', 'when things happen'),
      moreFeatureItem('reporting', 'across candidates'),
    ],
    slides: [OUTPUT_STILL],
  },
]

/** Hold variant: 5 groupings on the edge tags, no gallery chrome. */
export const NAV_FEATURE_GROUPS: readonly FeatureGroup[] = [
  {
    id: 'organisation',
    title: 'Organisation',
    icon: ShieldCheck,
    features: [
      moreFeatureItem('security', 'inside your organisation'),
      moreFeatureItem('direct-management', 'from one place'),
    ],
    slides: [SECURITY_STILL],
  },
  {
    id: 'ats',
    title: 'ATS',
    icon: Briefcase,
    features: [moreFeatureItem('ats', 'applicant tracking system')],
    slides: [SECURITY_STILL],
  },
  {
    id: 'interview-extras',
    title: 'Interview extras',
    icon: ClipboardList,
    features: [
      moreFeatureItem('interview-features', 'inside the path'),
      moreFeatureItem('bot-assistance', 'custom ones too'),
      moreFeatureItem('candidate-onboarding', 'before they start'),
    ],
    slides: [LIVE_STILL],
  },
  {
    id: 'messaging',
    title: 'Messaging',
    icon: MessageSquare,
    features: [
      moreFeatureItem('messaging', 'next to the work'),
      moreFeatureItem('email', 'outside the product'),
    ],
    slides: [OUTPUT_STILL],
  },
  {
    id: 'scheduling',
    title: 'Scheduling',
    icon: Calendar,
    features: [
      moreFeatureItem('timetabling', 'when things happen'),
      moreFeatureItem('reporting', 'across candidates'),
    ],
    slides: [OUTPUT_STILL],
  },
]
