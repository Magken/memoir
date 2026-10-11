import {
  Bot,
  CheckCircle2,
  Layers,
  LayoutPanelLeft,
  MessageSquare,
  PackageCheck,
  Route,
  Shield,
  Sparkles,
  Workflow,
  type LucideIcon,
} from 'lucide-react'

export const MOCKUP_TOOLKIT = ['mockup'] as const

export type MockupKind =
  | 'title'
  | 'gleam'
  | 'expand'
  | 'pills'
  | 'step'
  | 'hub'
  | 'window'
  | 'metric'
  | 'callout'

export type MockupIconId =
  | 'sparkles'
  | 'route'
  | 'layout'
  | 'bot'
  | 'shield'
  | 'layers'
  | 'workflow'
  | 'check'
  | 'message'
  | 'package'

export const MOCKUP_ICON_MAP: Record<MockupIconId, LucideIcon> = {
  sparkles: Sparkles,
  route: Route,
  layout: LayoutPanelLeft,
  bot: Bot,
  shield: Shield,
  layers: Layers,
  workflow: Workflow,
  check: CheckCircle2,
  message: MessageSquare,
  package: PackageCheck,
}

export const MOCKUP_ICON_OPTIONS: readonly { value: MockupIconId; label: string }[] = [
  { value: 'sparkles', label: 'Sparkles' },
  { value: 'route', label: 'Route' },
  { value: 'layout', label: 'Layout' },
  { value: 'bot', label: 'Bot' },
  { value: 'shield', label: 'Shield' },
  { value: 'layers', label: 'Layers' },
  { value: 'workflow', label: 'Workflow' },
  { value: 'check', label: 'Check' },
  { value: 'message', label: 'Message' },
  { value: 'package', label: 'Package' },
]

export type MockupNodeConfig = {
  kicker?: string
  title?: string
  body?: string
  pills?: string
  iconId?: MockupIconId
  gleam?: boolean
  defaultOpen?: boolean
  step?: string
  metric?: string
}

export function isMockupKind(kind: string): kind is `mockup.${MockupKind}` {
  return kind.startsWith('mockup.')
}

export function mockupKindFromNode(kind: string): MockupKind {
  const suffix = kind.startsWith('mockup.') ? kind.slice('mockup.'.length) : kind
  switch (suffix) {
    case 'title':
    case 'gleam':
    case 'expand':
    case 'pills':
    case 'step':
    case 'hub':
    case 'window':
    case 'metric':
    case 'callout':
      return suffix
    default:
      return 'title'
  }
}

export function parseMockupPills(raw: string | undefined): string[] {
  if (!raw) return []
  return raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
}

export function readMockupConfig(raw: Record<string, unknown> | undefined): MockupNodeConfig {
  const config = raw ?? {}
  const iconId = config.iconId
  return {
    kicker: typeof config.kicker === 'string' ? config.kicker : '',
    title: typeof config.title === 'string' ? config.title : '',
    body: typeof config.body === 'string' ? config.body : '',
    pills: typeof config.pills === 'string' ? config.pills : '',
    iconId:
      typeof iconId === 'string' && iconId in MOCKUP_ICON_MAP ? (iconId as MockupIconId) : 'sparkles',
    gleam: config.gleam === true,
    defaultOpen: config.defaultOpen === true,
    step: typeof config.step === 'string' ? config.step : '',
    metric: typeof config.metric === 'string' ? config.metric : '',
  }
}
