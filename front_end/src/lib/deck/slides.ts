/**
 * Deck presentation slides — copy from Auryn / Vurify overview proposal.
 * How-we-work Mermaid mirrors investor_docs/drafts/auryn-health/vurify-overview/assets/how-we-work.mmd
 */
import type { LucideIcon } from 'lucide-react'
import type { MockupMotionId } from '../mockups/motions'
import {
  Bot,
  Briefcase,
  Calendar,
  ClipboardList,
  FileCheck2,
  GraduationCap,
  Hand,
  Inbox,
  Languages,
  LayoutPanelLeft,
  Mail,
  MapPin,
  MessageSquare,
  PackageCheck,
  Route,
  Shield,
  ShieldCheck,
  Sparkles,
  Star,
  UserPlus,
  Users,
  BarChart3,
  Network,
} from 'lucide-react'

export type DeckSlideSide =
  | {
      kind: 'points'
      /** Compact two-column list for denser feature slides. */
      dense?: boolean
      items: readonly { icon: LucideIcon; title: string; body: string }[]
    }
  | {
      kind: 'mermaid'
      source: string
    }
  | {
      kind: 'draw'
      /** DrawCanvas titlebar label. */
      canvasTitle: string
    }
  | {
      kind: 'grading'
      cards: readonly { icon: LucideIcon; title: string; body: string }[]
      figures: readonly {
        sceneId: string
        kicker: string
        title: string
        body: string
        /** Omit for still. Walk / gleam / stagger loop on the deck. */
        motion?: MockupMotionId
      }[]
    }

export type DeckSlide = {
  id: string
  title: string
  /** Large Verify-style display line */
  headline: string
  /** Single readable supporting sentence under the headline */
  subtext: string
  /** Optional statement line under the side column (slide 1 closing beat). */
  footer?: string
  side: DeckSlideSide
}

/** First-paint Mermaid vars — deck CSS then maps nodes/edges onto live theme tokens. */
const DECK_MERMAID_INIT = `{
  "theme": "base",
  "themeVariables": {
    "fontFamily": "Nunito, Bricolage Grotesque, system-ui, sans-serif",
    "fontSize": "17px",
    "primaryColor": "#ECECFC",
    "primaryTextColor": "#121028",
    "primaryBorderColor": "#3B39F0",
    "secondaryColor": "#FFFFFF",
    "secondaryTextColor": "#121028",
    "secondaryBorderColor": "#D8D7E0",
    "tertiaryColor": "#F7F7FB",
    "lineColor": "#3B39F0",
    "textColor": "#121028",
    "mainBkg": "#FFFFFF",
    "nodeBorder": "#3B39F0",
    "titleColor": "#3B39F0",
    "clusterBkg": "#F7F7FB",
    "clusterBorder": "#3B39F0",
    "edgeLabelBackground": "#FFFFFF"
  },
  "flowchart": {
    "curve": "basis",
    "padding": 18,
    "htmlLabels": true,
    "useMaxWidth": false,
    "nodeSpacing": 26,
    "rankSpacing": 36
  }
}`

function deckMermaid(body: string): string {
  return `%%{init: ${DECK_MERMAID_INIT}}%%
${body.trim()}`
}

/** Brand-aligned flowchart from the overview proposal. */
export const DECK_HOW_WE_WORK_MERMAID = deckMermaid(`
flowchart TB
  org["Your organisation<br/>stood up under your name"]
  people["Interviewers under the organisation<br/>your team, and Vurify when you want us"]
  create["Create and edit interviews<br/>steps, order, and what good looks like"]
  cand["Candidates take the interview<br/>walk the path set for the role"]
  pack["Results for manager and organisation<br/>shortlist with reasons you can check"]

  org --> people --> create --> cand --> pack
`)

export const DECK_SLIDES: readonly DeckSlide[] = [
  {
    id: 'what-vurify-is',
    title: 'What Vurify is',
    headline: 'What Vurify is',
    subtext:
      'Vurify is your talent management system. It helps you find, assess, and decide on people under one organisation.',
    footer: 'We fit anywhere in the interview pipeline.',
    side: {
      kind: 'points',
      items: [
        {
          icon: Route,
          title: 'Orchestrator',
          body: 'We run the hiring path end to end — you choose where we start and stop.',
        },
        {
          icon: LayoutPanelLeft,
          title: 'Editors you host',
          body: 'Talk, forms, coding, writing, and custom tools live in one interview path.',
        },
        {
          icon: Bot,
          title: 'A bot that works the tools',
          body: 'Not only an assistant in chat — it can drive the editors on the path itself.',
        },
        {
          icon: PackageCheck,
          title: 'Output card',
          body: 'The package a hiring manager can open: who rose, and why.',
        },
      ],
    },
  },
  {
    id: 'how-vurify-works',
    title: 'How Vurify works',
    headline: 'How Vurify works',
    subtext:
      'Think of Vurify as standing up a hiring organisation under your name. Roles, interviews, and results live there.',
    side: {
      kind: 'mermaid',
      source: DECK_HOW_WE_WORK_MERMAID,
    },
  },
  {
    id: 'verified-grading',
    title: 'Verified grading',
    headline: 'How verified grading works',
    subtext:
      'You write the standard. The editors mark the work. A person can still change the call.',
    footer: 'Scroll to the map. Drag, select, zoom, or organise it again.',
    side: {
      kind: 'grading',
      cards: [
        {
          icon: MessageSquare,
          title: 'You write the Talk',
          body: 'Custom templates set probe order, targets, and what a complete answer sounds like — not a stock script on every role.',
        },
        {
          icon: LayoutPanelLeft,
          title: 'They work in real editors',
          body: 'Form, coding, and writing each keep their own marks on the artifact they host.',
        },
        {
          icon: PackageCheck,
          title: 'One package for the interview',
          body: 'Talk and tools leave together. A manager does not rebuild the interview from a chat log and a separate test.',
        },
        {
          icon: Route,
          title: 'The mark stays on the work',
          body: 'Capture, score, review, and report move the same artifact — not a recap written after the fact.',
        },
        {
          icon: GraduationCap,
          title: 'Bands you can defend',
          body: 'Levels use shared descriptors, in the style of IELTS and other standardised tests.',
        },
        {
          icon: Hand,
          title: 'A person can override',
          body: 'A human marker opens the same package the model already marked, and can change the call.',
        },
      ],
      figures: [
        {
          sceneId: 'deck-talk-templates',
          kicker: 'Conversation',
          title: 'You author the discussion',
          body: 'Open, probe, and close sit in the brief you write. The bot follows that order — it does not invent a script.',
          motion: 'walk',
        },
        {
          sceneId: 'deck-editors',
          kicker: 'Assess',
          title: 'Each tool scores its own work',
          body: 'The form, the file, and the page keep their marks. Vurify runs the path; it does not flatten three editors into one score.',
        },
        {
          sceneId: 'deck-path',
          kicker: 'Path',
          title: 'Capture to report',
          body: 'The same artifact moves through every beat. The mark is not written after the interview ends.',
          motion: 'walk',
        },
        {
          sceneId: 'deck-scoring',
          kicker: 'Read',
          title: 'The level sits on the artifact',
          body: 'Shared bands make the call comparable. A person can still override without leaving the pack.',
          motion: 'gleam',
        },
      ],
    },
  },
  {
    id: 'security',
    title: 'Security',
    headline: 'Security features',
    subtext:
      'Integrity signals sit beside the interview path so you can trust who took the interview and how they took it.',
    side: {
      kind: 'points',
      dense: true,
      items: [
        {
          icon: MapPin,
          title: 'Location',
          body: 'Track where the candidate is taking the interview.',
        },
        {
          icon: Hand,
          title: 'Typing & handwriting',
          body: 'Watch texting and handwriting patterns across the attempt.',
        },
        {
          icon: Languages,
          title: 'Language',
          body: 'Detect the language in play and shifts that do not match the role.',
        },
        {
          icon: Sparkles,
          title: 'Anti-AI checks',
          body: 'Surface likely AI-assisted answers without treating the model as the judge.',
        },
        {
          icon: Network,
          title: 'VPN / proxy presence',
          body: 'Flag when a VPN or proxy is present during the session.',
        },
        {
          icon: ShieldCheck,
          title: 'Session integrity',
          body: 'Watch focus, multi-device risk, and unusual session jumps.',
        },
        {
          icon: Shield,
          title: 'Access control',
          body: 'Keep roles, attempts, and results inside your organisation.',
        },
        {
          icon: FileCheck2,
          title: 'Audit trail',
          body: 'Keep a clear record of what happened for review and policy.',
        },
      ],
    },
  },
  {
    id: 'more-features',
    title: 'More features',
    headline: 'Additional Vurify features',
    subtext:
      'The interview path is the core. These extras sit around it so your organisation can run the hire smoothly.',
    side: {
      kind: 'points',
      dense: true,
      items: [
        {
          icon: ClipboardList,
          title: 'Interview features',
          body: 'Timers, stages, follow-ups, and day structure inside the path.',
        },
        {
          icon: Bot,
          title: 'Bot assistance',
          body: 'Each assistant can edit and drive default and custom editors — not only chat.',
        },
        {
          icon: Briefcase,
          title: 'ATS',
          body: 'Candidates, stages, status, and handoff into the interview path.',
        },
        {
          icon: Inbox,
          title: 'Interviewee intake',
          body: 'Details, documents, and eligibility before the interview starts.',
        },
        {
          icon: FileCheck2,
          title: 'Background checking',
          body: 'Add checks to intake when the role needs them.',
        },
        {
          icon: MessageSquare,
          title: 'Messaging',
          body: 'Direct chat with candidates and your hiring team beside the work.',
        },
        {
          icon: Mail,
          title: 'Email',
          body: 'Invites, reminders, and updates when people need a nudge outside the product.',
        },
        {
          icon: Calendar,
          title: 'Timetabling',
          body: 'Open windows, slots, and day timing for candidates and interviewers.',
        },
        {
          icon: Star,
          title: 'Interviewee feedback',
          body: 'Ask how the interview felt so you can improve the next path.',
        },
        {
          icon: BarChart3,
          title: 'Reporting',
          body: 'Attempts, scores, and outcomes across candidates without digging package by package.',
        },
        {
          icon: GraduationCap,
          title: 'Candidate onboarding',
          body: 'Teach each step before they start — talk, forms, coding, writing, custom editors.',
        },
        {
          icon: UserPlus,
          title: 'Organisation onboarding',
          body: 'Bring new members in with the right access to create and run hires.',
        },
        {
          icon: Users,
          title: 'Direct management',
          body: 'Roles, interviewers, ownership, and who sits under the organisation.',
        },
      ],
    },
  },
  {
    id: 'questions',
    title: 'Questions',
    headline: 'Questions',
    subtext: 'Write them here — we will take them live.',
    side: {
      kind: 'draw',
      canvasTitle: 'Questions',
    },
  },
]
