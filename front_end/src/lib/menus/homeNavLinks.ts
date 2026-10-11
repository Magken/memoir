import {
  AiMicIcon,
  DashboardSquare01Icon,
  DollarCircleIcon,
  Home01Icon,
  Layers01Icon,
  Linkedin01Icon,
  Mail01Icon,
  NewTwitterIcon,
  Route01Icon,
  SparklesIcon,
} from '@hugeicons/core-free-icons'
import type {
  SceneStackMenuCategory,
  SceneStackMenuFooterItem,
  SceneStackMenuLink,
  SceneStackMenuPreview,
} from './sceneStackMenu'
import { HOME_ASSETS } from '../homeAssets/catalog'

/** Special target: open footer booking/contact peel (header + CTAs). */
export const VURIFY_CONTACT_TARGET_ID = 'vurify-contact'

/** Special target: open in-menu login panel (header). */
export const VURIFY_LOGIN_TARGET_ID = 'vurify-login'

/** Special target: open Vurify ScaleCoverModal sign-up stub (header). */
export const VURIFY_SIGN_UP_TARGET_ID = 'vurify-sign-up'

/** Special target: header Book now — opens footer booking/contact peel. */
export const VURIFY_BOOK_NOW_TARGET_ID = 'vurify-book-now'

/** Public contact emails (mailto display; form send → contact-send / Resend). */
export const VURIFY_CONTACT_EMAILS = [
  'Contact@vurify.co',
  'Info@vurify.co',
] as const

export const VURIFY_LINKEDIN_URL = 'https://www.linkedin.com/company/vurify/'
export const VURIFY_TWITTER_URL = 'https://x.com/vurifyhq?s=11'

/**
 * Special target: dashboard entry (header).
 * AUTH_DASHBOARD_HOTWIRE — navigate to the logged-in dashboard route when wired.
 */
export const VURIFY_DASHBOARD_TARGET_ID = 'vurify-dashboard'

/** Header chrome: Dashboard icon + label (paired with Home). */
export const HOME_SCENE_STACK_DASHBOARD = {
  id: 'dashboard',
  label: 'Dashboard',
  icon: DashboardSquare01Icon,
  targetId: VURIFY_DASHBOARD_TARGET_ID,
} as const

/** Header Log in | Sign up — `RadioGroup variant="vurify"`. */
export const HOME_SCENE_STACK_AUTH_OPTIONS = [
  { value: VURIFY_LOGIN_TARGET_ID, label: 'Log in' },
  { value: VURIFY_SIGN_UP_TARGET_ID, label: 'Sign up' },
] as const

/** Live Home header — Book now (own cluster) + Sign in (auth cluster; later the sign-up switch). */
export const HOME_SCENE_STACK_LAUNCH_AUTH_OPTIONS = [
  { value: VURIFY_BOOK_NOW_TARGET_ID, label: 'Book now' },
  { value: VURIFY_LOGIN_TARGET_ID, label: 'Sign in' },
] as const

/** Default preview when no home-nav link is hovered. */
export const HOME_NAV_DEFAULT_PREVIEW = {
  layout: 'media',
  overline: 'Vurify',
  title: 'Talent made visible',
  body: 'Find, assess, and decide — for hiring managers and recruiters.',
  image: {
    src: HOME_ASSETS.talentMadeVisible.src,
    alt: HOME_ASSETS.talentMadeVisible.alt,
    fit: 'contain',
  },
} as const satisfies SceneStackMenuPreview

/** Home destinations: shared by SceneStackMenu (header) and HomeFooter explore links. */
export const HOME_NAV_LINKS = [
  {
    id: 'what-we-do',
    label: 'What we do',
    icon: SparklesIcon,
    targetId: 'home-scene-2',
    preview: {
      layout: 'media',
      overline: 'Product',
      title: 'Beyond the résumé',
      body: 'Screening, conversation, and proof — then an output card you can read.',
      image: {
        src: HOME_ASSETS.whatWeDo.src,
        alt: HOME_ASSETS.whatWeDo.alt,
        fit: 'contain',
      },
    },
  },
  {
    id: 'what-we-offer',
    label: 'What gets it done',
    icon: Layers01Icon,
    targetId: 'home-scene-3',
    preview: {
      layout: 'media',
      overline: 'Capabilities',
      title: 'Steps you choose',
      body: 'Conversation, quiz, coding, writing, custom tools. Skip what a role does not need.',
      image: {
        src: HOME_ASSETS.whatGetsItDone.src,
        alt: HOME_ASSETS.whatGetsItDone.alt,
        fit: 'contain',
      },
    },
  },
  {
    id: 'how-it-works',
    label: 'How it works',
    icon: Route01Icon,
    targetId: 'home-scene-4',
    preview: {
      layout: 'media',
      overline: 'Path',
      title: 'Hiring managers',
      body: 'Recruiters and interviewers under your name. Candidates walk the path. You get the package.',
      image: {
        src: HOME_ASSETS.howItWorks.src,
        alt: HOME_ASSETS.howItWorks.alt,
        fit: 'contain',
      },
    },
  },
  {
    id: 'pricing',
    label: 'Pricing',
    icon: DollarCircleIcon,
    targetId: 'home-scene-5',
    preview: {
      layout: 'media',
      overline: 'Plans',
      title: 'Simple clear seats',
      body: 'Candidates stay free. Solo and Team seats for hiring.',
      image: {
        src: HOME_ASSETS.pricing.src,
        alt: HOME_ASSETS.pricing.alt,
        fit: 'contain',
      },
    },
  },
  {
    id: 'try-vurify',
    label: 'Try Vurify',
    icon: AiMicIcon,
    targetId: 'home-scene-7',
    preview: {
      layout: 'media',
      overline: 'Start',
      title: 'Walk the path',
      body: 'Take an interview. See the package a hiring manager would read.',
      image: {
        src: HOME_ASSETS.tryVurify.src,
        alt: HOME_ASSETS.tryVurify.alt,
        fit: 'contain',
      },
    },
  },
] as const satisfies readonly SceneStackMenuLink[]

/**
 * Resolve the Home subsection link id for a live scene element id
 * (`home-scene-2` → `what-we-do`). Landing (`home-scene-1`) has no subsection.
 */
export function homeNavLinkIdForTargetId(targetId: string | null | undefined): string | null {
  if (!targetId) return null
  const match = HOME_NAV_LINKS.find((link) => link.targetId === targetId)
  return match?.id ?? null
}

/** Header category rail — Home only for now (Talent / Companies deferred). */
export const HOME_SCENE_STACK_CATEGORIES = [
  {
    id: 'home',
    label: 'Home',
    icon: Home01Icon,
    preview: HOME_NAV_DEFAULT_PREVIEW,
    items: HOME_NAV_LINKS,
  },
] as const satisfies readonly SceneStackMenuCategory[]

/** Header/footer utility strip: Contact opens booking peel; socials open external hrefs. */
export const HOME_SCENE_STACK_FOOTER = [
  {
    id: 'contact',
    label: 'Contact',
    icon: Mail01Icon,
    targetId: VURIFY_CONTACT_TARGET_ID,
    variant: 'fill',
    group: 'utility',
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    icon: Linkedin01Icon,
    targetId: 'home-scene-1',
    href: VURIFY_LINKEDIN_URL,
    iconOnly: true,
    group: 'social',
  },
  {
    id: 'twitter',
    label: 'Twitter',
    icon: NewTwitterIcon,
    targetId: 'home-scene-1',
    href: VURIFY_TWITTER_URL,
    iconOnly: true,
    group: 'social',
  },
] as const satisfies readonly SceneStackMenuFooterItem[]
