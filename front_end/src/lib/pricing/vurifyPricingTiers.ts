import type { IconSvgElement } from '@hugeicons/react'
import {
  ArrowRight01Icon,
  Briefcase01Icon,
  Building01Icon,
  CheckListIcon,
  FileCheckIcon,
  Link01Icon,
  Message01Icon,
  Route01Icon,
  Share01Icon,
  SparklesIcon,
  Tick02Icon,
  UserGroupIcon,
  UserIcon,
} from '@hugeicons/core-free-icons'
import type { ButtonHoverFxMarqueeContent } from '../../components/ButtonHoverFx'

export type VurifyPricingTierId = 'free' | 'solo' | 'team'

export const VURIFY_PRICING_TIER_ORDER = ['free', 'solo', 'team'] as const satisfies readonly VurifyPricingTierId[]

export type VurifyPricingFeature = {
  id: string
  label: string
  icon: IconSvgElement
}

export type VurifyPricingTier = {
  id: VurifyPricingTierId
  title: string
  price: string
  priceNote: string
  features: readonly VurifyPricingFeature[]
  icon: IconSvgElement
  cta: ButtonHoverFxMarqueeContent
}

/** Tick used on every feature row (Hugeicons — matches menu glyph family). */
export const VURIFY_PRICING_TICK_ICON = Tick02Icon

/** Shared Get Started marquee — matches How-it-works timeline CTA. */
const GET_STARTED_CTA = {
  label: 'Get Started',
  marqueeLabel: 'Open the path',
  marqueeLabels: ['Get Started', 'Open the path', 'See the package', 'Walk the interview'],
  sideIcon: SparklesIcon,
  sideIconEnd: ArrowRight01Icon,
} satisfies ButtonHoverFxMarqueeContent

export const VURIFY_PRICING_TIERS: readonly VurifyPricingTier[] = [
  {
    id: 'free',
    title: 'Candidates',
    price: 'Free',
    priceNote: 'Proof-first profile. No seat fees.',
    icon: UserIcon,
    features: [
      { id: 'case-studies', label: 'Lead with case studies and finished work', icon: Briefcase01Icon },
      { id: 'proof-link', label: 'Share a single proof link with hiring teams', icon: Link01Icon },
      { id: 'matched-briefs', label: 'Match into briefs that already fit your craft', icon: SparklesIcon },
      { id: 'signal-trail', label: 'Keep a clear trail of why you fit each role', icon: FileCheckIcon },
    ],
    cta: GET_STARTED_CTA,
  },
  {
    id: 'solo',
    title: 'Solo',
    price: '$49',
    priceNote: 'Per month · Institutions personal seat.',
    icon: Building01Icon,
    features: [
      { id: 'open-briefs', label: 'Open briefs mapped to proof criteria', icon: CheckListIcon },
      { id: 'compare', label: 'Compare candidates on one evidence surface', icon: Route01Icon },
      { id: 'shortlists', label: 'Save shortlists with a shared trail of why', icon: FileCheckIcon },
      { id: 'role-fit', label: 'Score role fit against real delivered work', icon: SparklesIcon },
    ],
    cta: GET_STARTED_CTA,
  },
  {
    id: 'team',
    title: 'Team',
    price: '$129',
    priceNote: 'Per month · shared Institutions workspace.',
    icon: UserGroupIcon,
    features: [
      { id: 'shared-lists', label: 'Shared shortlists across hiring partners', icon: Share01Icon },
      { id: 'comments', label: 'Role briefs with team comments on proof', icon: Message01Icon },
      { id: 'decision-trail', label: 'Faster closes with a defensible decision trail', icon: FileCheckIcon },
      { id: 'workspace', label: 'One workspace for partners, roles, and proof', icon: Building01Icon },
    ],
    cta: GET_STARTED_CTA,
  },
]

export const VURIFY_PRICING_BY_ID: Record<VurifyPricingTierId, VurifyPricingTier> =
  Object.fromEntries(VURIFY_PRICING_TIERS.map((tier) => [tier.id, tier])) as Record<
    VurifyPricingTierId,
    VurifyPricingTier
  >

export function pricingTierIndex(id: VurifyPricingTierId): number {
  return VURIFY_PRICING_TIER_ORDER.indexOf(id)
}

export function pricingTierFromIndex(index: number): VurifyPricingTierId {
  const clamped = Math.max(0, Math.min(index, VURIFY_PRICING_TIER_ORDER.length - 1))
  return VURIFY_PRICING_TIER_ORDER[clamped]
}
