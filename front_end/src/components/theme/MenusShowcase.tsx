import {
  BookOpen,
  Boxes,
  Brain,
  Briefcase,
  Building2,
  Copy,
  CreditCard,
  FileDown,
  FileText,
  FormInput,
  Heading,
  Home,
  Image,
  LayoutGrid,
  Lightbulb,
  Link2,
  List,
  Mail,
  Megaphone,
  Newspaper,
  Package,
  Rocket,
  Search,
  SeparatorHorizontal,
  Settings,
  Share2,
  Shield,
  Sparkles,
  Target,
  Trash2,
  Type,
  Users,
} from 'lucide-react'
import { useMemo, useRef, useState, type ReactNode } from 'react'
import { MENU_SCALE_STEPS, menuScaleClass, type MenuScale } from '../../lib/menus/menuScale'
import type { ButtonVariant } from '../../lib/ui/buttonStyles'
import type { CascadeMenuItem } from '../../lib/menus/cascadeMenu'
import { sectionSubLinkIds } from '../../lib/menus/horizontalMenu'
import { Button } from '../Button'
import { Card } from '../Card'
import { CascadeMenuButton } from '../CascadeMenuButton'
import { CubeMenu3d } from '../CubeMenu3d'
import { Select } from '../Select'
import { MenuButton } from '../MenuButton'
import { MicroMenuDropdown } from '../MicroMenuDropdown'
import { DocNavMenu } from '../DocNavMenu'
import { DottedNavMenu, type DottedNavMenuItem } from '../DottedNavMenu'
import {
  GlowStepDotNav,
  GlowStepDotNavPanel,
  type GlowStepDotNavItem,
} from '../GlowStepDotNav'
import {
  GLOW_STEP_DOT_NAV_TRANSITIONS,
  type GlowStepDotNavOrientation,
  type GlowStepDotNavTransition,
} from '../../lib/menus/glowStepDotNav'
import type { DocNavMenuNode } from '../../lib/menus/docNavMenu'
import { DashboardMenu } from '../DashboardMenu'
import { flattenDashboardLinks } from '../../lib/menus/dashboardMenu'
import { TreeMapMenu } from '../TreeMapMenu'
import type { TreeMapMenuNode } from '../../lib/menus/treeMapMenu'
import { HamburgerMenu } from '../HamburgerMenu'
import { HorizontalMenu, type HorizontalMenuItem } from '../HorizontalMenu'
import { StackNavMenu } from '../StackNavMenu'
import { DragReorderMenu, type DragReorderMenuNode } from '../DragReorderMenu'
import { dragReorderMenuDefaultOrder, dragReorderRootIds } from '../../lib/menus/dragReorderMenu'
import { SCROLL_RAILS, type ScrollRailType } from '../../lib/scroll/scrollRail'
import { MiniStackedMenu, type MiniStackedMenuItem } from '../MiniStackedMenu'
import { MiniStackNavMenu, type MiniStackNavMenuItem } from '../MiniStackNavMenu'
import { MicroMenu } from '../MicroMenu'
import { NanoStackedMenu, type NanoStackedMenuItem } from '../NanoStackedMenu'
import { TabbedMenu, TabbedMenuPanel, type TabbedMenuItem } from '../TabbedMenu'

function nanoColorSwatch(fill: string, alt: string): NonNullable<NanoStackedMenuItem['image']> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="${fill}"/></svg>`
  return { src: `data:image/svg+xml,${encodeURIComponent(svg)}`, alt }
}

const nanoColorMenuItems: readonly NanoStackedMenuItem[] = [
  { id: 'rose', label: 'Rose', image: nanoColorSwatch('#e11d48', 'Rose swatch') },
  { id: 'amber', label: 'Amber', image: nanoColorSwatch('#d97706', 'Amber swatch') },
  { id: 'sage', label: 'Sage', image: nanoColorSwatch('#16a34a', 'Sage swatch') },
  { id: 'ocean', label: 'Ocean', image: nanoColorSwatch('#0284c7', 'Ocean swatch') },
  { id: 'violet', label: 'Violet', image: nanoColorSwatch('#7c3aed', 'Violet swatch') },
  { id: 'slate', label: 'Slate', image: nanoColorSwatch('#475569', 'Slate swatch') },
]

const miniStackedMenuItems: readonly MiniStackedMenuItem[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'projects', label: 'Projects', icon: LayoutGrid },
  {
    id: 'profile',
    label: 'Profile',
    icon: Users,
    image: { src: 'https://picsum.photos/96/96?random=61', alt: 'Profile avatar' },
  },
  { id: 'contact', label: 'Contact', icon: Mail },
]

const miniStackedMenuMoreItems: readonly MiniStackedMenuItem[] = [
  { id: 'news', label: 'News', icon: Newspaper },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'company', label: 'Company', icon: Building2 },
]

const WORKSPACE_SELECT_OPTIONS = [
  { value: 'home', label: 'Home' },
  { value: 'projects', label: 'Projects' },
  { value: 'settings', label: 'Settings' },
] as const

const dropdownActionItems = [
  { id: 'edit', label: 'Edit' },
  { id: 'duplicate', label: 'Duplicate' },
  { id: 'archive', label: 'Archive', disabled: true },
  { id: 'delete', label: 'Delete' },
] as const

const cascadeMenuItems: readonly CascadeMenuItem[] = [
  { id: 'copy-link', label: 'Copy link', icon: Link2 },
  {
    id: 'share',
    label: 'Share',
    icon: Share2,
    children: [
      { id: 'share-email', label: 'Email', icon: Mail },
      { id: 'share-copy', label: 'Copy link', icon: Copy },
    ],
  },
  {
    id: 'export',
    label: 'Export',
    icon: FileDown,
    children: [
      { id: 'export-pdf', label: 'PDF', icon: FileText },
      { id: 'export-png', label: 'PNG', icon: Image },
      {
        id: 'export-advanced',
        label: 'Advanced',
        icon: Settings,
        children: [
          { id: 'export-svg', label: 'SVG vector', icon: Image },
          { id: 'export-json', label: 'JSON data', icon: FileText },
        ],
      },
    ],
  },
  { id: 'delete', label: 'Delete', icon: Trash2, disabled: true },
]

const dropdownTriggerVariants: readonly ButtonVariant[] = ['outline', 'ghost', 'default', 'accent']

const miniStackNavMenuItems: readonly MiniStackNavMenuItem[] = [
  { type: 'link', id: 'home', label: 'Home', icon: Home },
  {
    type: 'section',
    id: 'workspace',
    label: 'Workspace',
    icon: LayoutGrid,
    subPanelVariant: 'stacked',
    links: [
      { id: 'projects', label: 'Projects', icon: LayoutGrid },
      { id: 'docs', label: 'Docs', icon: BookOpen },
      { id: 'settings', label: 'Settings', icon: Settings },
    ],
  },
  { type: 'link', id: 'profile', label: 'Profile', icon: Users },
  { type: 'link', id: 'contact', label: 'Contact', icon: Mail },
]

const dragReorderMenuNodes: readonly DragReorderMenuNode[] = [
  { type: 'link', id: 'heading', label: 'Section heading', icon: Heading },
  {
    type: 'section',
    id: 'inputs',
    label: 'Input blocks',
    icon: FormInput,
    children: [
      { type: 'link', id: 'text', label: 'Short text field', icon: FormInput },
      { type: 'link', id: 'body', label: 'Paragraph block', icon: Type },
      { type: 'link', id: 'email', label: 'Email field', icon: Mail },
    ],
  },
  {
    type: 'section',
    id: 'media',
    label: 'Media',
    icon: Image,
    children: [
      { type: 'link', id: 'image', label: 'Image upload', icon: Image },
      { type: 'link', id: 'gallery', label: 'Image gallery', icon: LayoutGrid },
      { type: 'link', id: 'divider', label: 'Divider', icon: SeparatorHorizontal },
    ],
  },
  { type: 'link', id: 'list', label: 'Bullet list', icon: List },
  { type: 'link', id: 'consent', label: 'Consent checkbox', icon: Shield },
]

const dragReorderMenuDefaultOrderState = dragReorderMenuDefaultOrder(dragReorderMenuNodes)

const tabbedMenuItems: readonly TabbedMenuItem[] = [
  { id: 'overview', label: 'Overview', icon: Home },
  { id: 'activity', label: 'Activity', icon: LayoutGrid },
  { id: 'settings', label: 'Settings', icon: Settings },
]

const dottedNavSlides: readonly DottedNavMenuItem[] = [
  { id: 'slide-1', label: 'Slide 1 — Dawn' },
  { id: 'slide-2', label: 'Slide 2 — Forest' },
  { id: 'slide-3', label: 'Slide 3 — Ocean' },
  { id: 'slide-4', label: 'Slide 4 — Dusk' },
  { id: 'slide-5', label: 'Slide 5 — Night' },
]

const glowStepNavItems: readonly GlowStepDotNavItem[] = [
  { id: 'brainstorm', label: 'Brainstorm', icon: Brain },
  { id: 'discuss', label: 'Discuss Ideas', icon: Lightbulb },
  { id: 'build', label: 'Make Project', icon: Rocket },
  { id: 'strategy', label: 'Select Strategy', icon: Target },
  { id: 'seo', label: 'SEO Target', icon: Search },
  { id: 'customers', label: 'Happy Customers', icon: Users },
]

const glowStepNavCopy: Record<string, { title: string; body: string }> = {
  brainstorm: {
    title: 'Brainstorm',
    body: 'Brainstorming is a great way to generate new ideas or to solve problems. When you engage in brainstorming, you allow yourself to think freely without restrictions or limitations.',
  },
  discuss: {
    title: 'Discuss Ideas',
    body: 'In order to fully explore and develop ideas, it is essential to engage in thoughtful and meaningful discussion with others.',
  },
  build: {
    title: 'Make Project',
    body: 'Creating a project involves identifying the problem, defining scope, planning milestones, executing, and monitoring progress.',
  },
  strategy: {
    title: 'Select Strategy',
    body: 'When selecting a strategy, consider company goals, available resources, industry trends, and market research.',
  },
  seo: {
    title: 'SEO Target',
    body: 'SEO is the process of optimizing the website and its content to improve ranking in search engine results pages.',
  },
  customers: {
    title: 'Happy Customers',
    body: 'Happy customers keep coming back, bring friends and family, and spread the word about your brand.',
  },
}

const dottedNavSlideToneClass: Record<string, string> = {
  'slide-1': 'theme-dotnav-gallery__slide--tone-1',
  'slide-2': 'theme-dotnav-gallery__slide--tone-2',
  'slide-3': 'theme-dotnav-gallery__slide--tone-3',
  'slide-4': 'theme-dotnav-gallery__slide--tone-4',
  'slide-5': 'theme-dotnav-gallery__slide--tone-5',
}

const tabbedMenuCopy: Record<string, { title: string; body: string }> = {
  overview: {
    title: 'Overview',
    body: 'Summary metrics and quick actions for the current workspace. Tabs use the WAI-ARIA tab pattern — arrow keys move selection; panels mount as TabbedMenuPanel children.',
  },
  activity: {
    title: 'Activity',
    body: 'Recent events, edits, and notifications appear here. Only the selected tab panel is visible; inactive panels stay in the DOM with hidden.',
  },
  settings: {
    title: 'Settings',
    body: 'Preferences and account options for this section. Pair TabbedMenu with TabbedMenuPanel ids that match item ids.',
  },
}

const docNavMenuItems: readonly DocNavMenuNode[] = [
  { type: 'link', id: 'home', label: 'Home', icon: Home },
  {
    type: 'section',
    id: 'products',
    label: 'Products',
    icon: Package,
    children: [
      {
        type: 'section',
        id: 'catalog',
        label: 'Catalog',
        icon: LayoutGrid,
        children: [
          { type: 'link', id: 'products-all', label: 'All products' },
          { type: 'link', id: 'widgets', label: 'Widgets' },
          { type: 'link', id: 'kits', label: 'Starter kits' },
        ],
      },
      {
        type: 'section',
        id: 'build',
        label: 'Build',
        icon: Boxes,
        children: [
          { type: 'link', id: 'components', label: 'Components' },
          { type: 'link', id: 'layouts', label: 'Layouts' },
          { type: 'link', id: 'forms', label: 'Forms' },
        ],
      },
      {
        type: 'section',
        id: 'reference',
        label: 'Reference',
        icon: BookOpen,
        children: [
          {
            type: 'section',
            id: 'reference-docs',
            label: 'Documentation',
            icon: BookOpen,
            children: [
              { type: 'link', id: 'docs', label: 'Overview' },
              { type: 'link', id: 'themes', label: 'Themes' },
              { type: 'link', id: 'icons', label: 'Icons' },
            ],
          },
        ],
      },
    ],
  },
  { type: 'link', id: 'pricing', label: 'Pricing', icon: CreditCard },
  {
    type: 'section',
    id: 'company',
    label: 'Company',
    icon: Building2,
    children: [
      { type: 'link', id: 'company-overview', label: 'About us', icon: Users },
      { type: 'link', id: 'careers', label: 'Careers', icon: Briefcase },
      { type: 'link', id: 'press', label: 'Press', icon: Megaphone },
      { type: 'link', id: 'blog', label: 'Blog', icon: Newspaper },
    ],
  },
  { type: 'link', id: 'contact', label: 'Contact', icon: Mail },
]

const pageMenuItems: readonly HorizontalMenuItem[] = [
  { type: 'link', id: 'home', label: 'Home', icon: Home },
  {
    type: 'section',
    id: 'products',
    label: 'Products',
    icon: Package,
    subPanelVariant: 'links',
    links: [],
    linkColumns: [
      {
        id: 'catalog',
        label: 'Catalog',
        icon: LayoutGrid,
        links: [
          { id: 'products-all', label: 'All products' },
          { id: 'widgets', label: 'Widgets' },
          { id: 'kits', label: 'Starter kits' },
        ],
      },
      {
        id: 'build',
        label: 'Build',
        icon: Boxes,
        links: [
          { id: 'components', label: 'Components' },
          { id: 'layouts', label: 'Layouts' },
          { id: 'forms', label: 'Forms' },
        ],
      },
      {
        id: 'reference',
        label: 'Reference',
        icon: BookOpen,
        links: [
          { id: 'docs', label: 'Documentation' },
          { id: 'themes', label: 'Themes' },
          { id: 'icons', label: 'Icons' },
        ],
      },
    ],
  },
  { type: 'link', id: 'pricing', label: 'Pricing', icon: CreditCard },
  {
    type: 'section',
    id: 'company',
    label: 'Company',
    icon: Building2,
    subPanelVariant: 'stacked',
    overview: {
      id: 'company-overview',
      label: 'About us',
      icon: Users,
    },
    links: [
      { id: 'careers', label: 'Careers', icon: Briefcase },
      { id: 'press', label: 'Press', icon: Megaphone },
      { id: 'blog', label: 'Blog', icon: Newspaper },
    ],
  },
  { type: 'link', id: 'contact', label: 'Contact', icon: Mail },
]

const scrollBarMenuItems: readonly HorizontalMenuItem[] = [
  ...pageMenuItems,
  { type: 'link', id: 'changelog', label: 'Changelog', icon: Newspaper },
  { type: 'link', id: 'security', label: 'Security', icon: Shield },
  { type: 'link', id: 'partners', label: 'Partners', icon: Sparkles },
  { type: 'link', id: 'support', label: 'Support', icon: Mail },
]

const pageCopy: Record<string, { title: string; body: string }> = {
  home: {
    title: 'Welcome',
    body: 'Horizontal tiered navigation for page and section headers. Top-level links navigate directly; sections open a sub-panel card below the bar.',
  },
  pricing: {
    title: 'Pricing',
    body: 'Plans scale with your team. Pick a tier on the pricing page or talk to sales for enterprise quotes.',
  },
  contact: {
    title: 'Contact',
    body: 'Reach the team via email, chat, or the support portal linked from your account dashboard.',
  },
  'products-all': {
    title: 'All products',
    body: 'Overview landing for the products section — repeated inside the sub-panel so every mental model can reach it.',
  },
  widgets: {
    title: 'Widgets',
    body: 'Composable UI primitives and layout blocks for dashboards and marketing pages.',
  },
  kits: {
    title: 'Starter kits',
    body: 'Opinionated bundles that wire typography, forms, and navigation together out of the box.',
  },
  docs: {
    title: 'Documentation',
    body: 'Implementation guides, token references, and migration notes for each release.',
  },
  components: {
    title: 'Components',
    body: 'Shared UI primitives — buttons, inputs, cards, and navigation patterns from the indexer catalog.',
  },
  layouts: {
    title: 'Layouts',
    body: 'Page shells, grid systems, and section frames for marketing and app chrome.',
  },
  themes: {
    title: 'Themes',
    body: 'Palette tokens, brutal shadows, and the Theme lab for previewing semantic colors.',
  },
  forms: {
    title: 'Forms',
    body: 'Field wrappers, validation states, and grouped choice controls.',
  },
  settings: {
    title: 'Settings',
    body: 'Preferences and account options for this workspace.',
  },
  profile: {
    title: 'Profile',
    body: 'Avatar, display name, and notification preferences.',
  },
  projects: {
    title: 'Projects',
    body: 'Active boards and archived work inside the workspace.',
  },
  icons: {
    title: 'Icons',
    body: 'Lucide React imports, sizing on buttons, and accessible decorative usage.',
  },
  'company-overview': {
    title: 'About us',
    body: 'Who we are, why the theme lab exists, and how we approach accessible brutalist UI.',
  },
  careers: {
    title: 'Careers',
    body: 'Design, engineering, and developer-relations roles — remote-friendly across time zones.',
  },
  press: {
    title: 'Press',
    body: 'Logos, boilerplate, and media contacts for coverage and conference partnerships.',
  },
  blog: {
    title: 'Blog',
    body: 'Release notes, pattern deep-dives, and case studies from teams using the schema.',
  },
  changelog: {
    title: 'Changelog',
    body: 'Version history and migration notes for the theme schema and component library.',
  },
  security: {
    title: 'Security',
    body: 'Reporting vulnerabilities, dependency policy, and safe defaults for production apps.',
  },
  partners: {
    title: 'Partners',
    body: 'Agencies and platforms building on the schema — co-marketing and integration support.',
  },
  support: {
    title: 'Support',
    body: 'Community channels, issue templates, and guidance for self-hosted deployments.',
  },
}

function resolvePageContent(activeId: string) {
  return pageCopy[activeId] ?? pageCopy.home
}

export type MenusShowcasePanel = 'dropdowns' | 'structure' | 'specialty' | 'layout'

function MenusShowcasePanelGate({
  panel,
  show,
  children,
}: {
  panel: MenusShowcasePanel
  show: MenusShowcasePanel
  children: ReactNode
}) {
  if (panel !== show) return null
  return <>{children}</>
}

export function MenusShowcase({ panel }: { panel: MenusShowcasePanel }) {
  const [selectedId, setSelectedId] = useState('home')
  const [cubeMenuFaceBorder, setCubeMenuFaceBorder] = useState('on')
  const [cubeMenuButtonLift, setCubeMenuButtonLift] = useState('on')
  const [scrollBarSelectedId, setScrollBarSelectedId] = useState('home')
  const [mobileSelectedId, setMobileSelectedId] = useState('home')
  const [mobileOverlaySelectedId, setMobileOverlaySelectedId] = useState('home')
  const [miniStackedVerticalSelectedId, setMiniStackedVerticalSelectedId] = useState('home')
  const [miniStackedHorizontalSelectedId, setMiniStackedHorizontalSelectedId] = useState('home')
  const [miniStackNavSelectedId, setMiniStackNavSelectedId] = useState('home')
  const [dragReorderOrder, setDragReorderOrder] = useState(dragReorderMenuDefaultOrderState)
  const [dragReorderSelectedId, setDragReorderSelectedId] = useState('heading')
  const [dragReorderFlat, setDragReorderFlat] = useState(false)
  const [dragReorderScrollRail, setDragReorderScrollRail] = useState<ScrollRailType>('curved')
  const [dragReorderLastAction, setDragReorderLastAction] = useState<string | null>(null)
  const [microVerticalSelectedId, setMicroVerticalSelectedId] = useState('home')
  const [microHorizontalSelectedId, setMicroHorizontalSelectedId] = useState('home')
  const [dottedNavHorizontalId, setDottedNavHorizontalId] = useState('slide-1')
  const [dottedNavVerticalId, setDottedNavVerticalId] = useState('slide-1')
  const [glowStepNavId, setGlowStepNavId] = useState('brainstorm')
  const [glowStepNavOrientation, setGlowStepNavOrientation] =
    useState<GlowStepDotNavOrientation>('horizontal')
  const [glowStepNavScrollFocus, setGlowStepNavScrollFocus] = useState(false)
  const [glowStepNavScrollRail, setGlowStepNavScrollRail] = useState<ScrollRailType>('curved')
  const [glowStepNavTransition, setGlowStepNavTransition] =
    useState<GlowStepDotNavTransition>('smooth')
  const [glowStepNavGlow, setGlowStepNavGlow] = useState(true)
  const [microMenuScale, setMicroMenuScale] = useState<MenuScale>(1)
  const [nanoColorVerticalSelectedId, setNanoColorVerticalSelectedId] = useState('rose')
  const [nanoColorHorizontalSelectedId, setNanoColorHorizontalSelectedId] = useState('rose')
  const [dropdownSelectValue, setDropdownSelectValue] = useState('home')
  const [menuButtonSelectedId, setMenuButtonSelectedId] = useState('edit')
  const [cascadePick, setCascadePick] = useState('')
  const [microDropdownSelectedId, setMicroDropdownSelectedId] = useState('home')
  const [tabbedMenuSelectedId, setTabbedMenuSelectedId] = useState('overview')
  const [docNavSelectedId, setDocNavSelectedId] = useState('docs')
  const [docNavCollapsed, setDocNavCollapsed] = useState(false)
  const [docNavFlat, setDocNavFlat] = useState(false)
  const [treeMapSelectedId, setTreeMapSelectedId] = useState('docs')
  const [treeMapCollapsed, setTreeMapCollapsed] = useState(false)
  const [treeMapFlat, setTreeMapFlat] = useState(false)
  const [treeMapLastAction, setTreeMapLastAction] = useState<string | null>(null)
  const [dashboardSelectedId, setDashboardSelectedId] = useState('docs')
  const [dashboardCollapsed, setDashboardCollapsed] = useState(false)
  const dashboardMenuItems = useMemo(() => flattenDashboardLinks(docNavMenuItems), [])
  const mobilePhoneShellRef = useRef<HTMLDivElement>(null)

  const docNavContent = useMemo(() => resolvePageContent(docNavSelectedId), [docNavSelectedId])
  const treeMapContent = useMemo(() => resolvePageContent(treeMapSelectedId), [treeMapSelectedId])
  const dashboardContent = useMemo(
    () => resolvePageContent(dashboardSelectedId),
    [dashboardSelectedId],
  )

  const parentSectionId = pageMenuItems.find(
    (item) => item.type === 'section' && sectionSubLinkIds(item).includes(selectedId),
  )?.id

  const mobileParentSectionId = pageMenuItems.find(
    (item) => item.type === 'section' && sectionSubLinkIds(item).includes(mobileSelectedId),
  )?.id

  const mobileOverlayParentSectionId = pageMenuItems.find(
    (item) => item.type === 'section' && sectionSubLinkIds(item).includes(mobileOverlaySelectedId),
  )?.id

  const scrollBarParentSectionId = scrollBarMenuItems.find(
    (item) => item.type === 'section' && sectionSubLinkIds(item).includes(scrollBarSelectedId),
  )?.id

  const activeId = parentSectionId ?? selectedId
  const activeSubId = parentSectionId ? selectedId : undefined
  const mobileActiveId = mobileParentSectionId ?? mobileSelectedId
  const mobileActiveSubId = mobileParentSectionId ? mobileSelectedId : undefined
  const mobileOverlayActiveId = mobileOverlayParentSectionId ?? mobileOverlaySelectedId
  const mobileOverlayActiveSubId = mobileOverlayParentSectionId ? mobileOverlaySelectedId : undefined
  const scrollBarActiveId = scrollBarParentSectionId ?? scrollBarSelectedId
  const scrollBarActiveSubId = scrollBarParentSectionId ? scrollBarSelectedId : undefined
  const miniStackNavParentSectionId = miniStackNavMenuItems.find(
    (item) => item.type === 'section' && sectionSubLinkIds(item).includes(miniStackNavSelectedId),
  )?.id
  const miniStackNavActiveId = miniStackNavParentSectionId ?? miniStackNavSelectedId
  const miniStackNavActiveSubId = miniStackNavParentSectionId ? miniStackNavSelectedId : undefined
  const miniStackNavContent = useMemo(
    () => resolvePageContent(miniStackNavSelectedId),
    [miniStackNavSelectedId],
  )
  const content = useMemo(() => resolvePageContent(selectedId), [selectedId])
  const scrollBarContent = useMemo(
    () => resolvePageContent(scrollBarSelectedId),
    [scrollBarSelectedId],
  )
  const mobileContent = useMemo(() => resolvePageContent(mobileSelectedId), [mobileSelectedId])
  const mobileOverlayContent = useMemo(
    () => resolvePageContent(mobileOverlaySelectedId),
    [mobileOverlaySelectedId],
  )

  return (
    <div className="space-y-10">
      <MenusShowcasePanelGate panel={panel} show="layout">
      <p className="type-body-sm type-muted prose-measure">
        Horizontal tiered navigation for page headers — disclosure pattern (plain links, not{' '}
        <code className="type-code">role=&quot;menu&quot;</code>). Sections with children open a
        sub-panel card below the bar. <strong>Products</strong> uses the linked-text column layout (
        <code className="type-code">linkColumns</code> + icon column titles); <strong>Company</strong>{' '}
        uses <code className="type-code">subPanelVariant=&quot;stacked&quot;</code> — icon-above-label
        neobrutal tiles (label only). The first mobile demo uses{' '}
        <code className="type-code">panelExpansion=&quot;push&quot;</code> (in-flow panel). The phone demo uses{' '}
        <code className="type-code">panelExpansion=&quot;overlay&quot;</code>{' '}
        — the menu covers the device viewport without shifting page content.
      </p>
      </MenusShowcasePanelGate>

      <MenusShowcasePanelGate panel={panel} show="dropdowns">
      <section className="space-y-6">
        <p className="type-overline">Dropdown menus</p>
        <p className="type-body-sm type-muted prose-measure">
          Compact dropdown selectors for toolbar and menu contexts — same field{' '}
          <code className="type-code">Select</code> as Forms (via{' '}
          <code className="type-code">MenuButton</code> + field shell), plain{' '}
          <code className="type-code">MenuButton</code> lists, cascading branches with{' '}
          <code className="type-code">ChevronRight</code> flyouts ([CascadeMenuButton](CascadeMenuButton.tsx)),
          and a portaled horizontal [MicroMenu](MicroMenu.tsx) rail ([MicroMenuDropdown](MicroMenuDropdown.tsx)).
          All use <code className="type-code">menuSize=&quot;compact&quot;</code>; triggers accept{' '}
          <code className="type-code">variant</code> (<code className="type-code">outline</code>,{' '}
          <code className="type-code">ghost</code>, <code className="type-code">default</code>,{' '}
          <code className="type-code">accent</code>).
        </p>

        <div className="space-y-3">
          <p className="type-caption type-faint font-mono">Field select (Forms parity)</p>
          <div className="max-w-xs">
            <Select
              label="Workspace"
              size="xs"
              options={WORKSPACE_SELECT_OPTIONS}
              value={dropdownSelectValue}
              onChange={setDropdownSelectValue}
              placeholder="Choose…"
            />
          </div>
        </div>

        <div className="space-y-3">
          <p className="type-caption type-faint font-mono">
            Field select · Verify (<code className="type-code">variant=&quot;verify&quot;</code> ·
            hidden list scroll)
          </p>
          <div className="max-w-xs">
            <Select
              label="Workspace"
              variant="verify"
              size="sm"
              options={WORKSPACE_SELECT_OPTIONS}
              value={dropdownSelectValue}
              onChange={setDropdownSelectValue}
              placeholder="Choose…"
            />
          </div>
        </div>

        <div className="space-y-3">
          <p className="type-caption type-faint font-mono">MenuButton — trigger variants</p>
          <div className="flex flex-wrap items-end gap-3">
            {dropdownTriggerVariants.map((triggerVariant) => (
              <MenuButton
                key={triggerVariant}
                label={triggerVariant}
                variant={triggerVariant}
                menuSize="compact"
                portal
                items={dropdownActionItems}
                selectedId={menuButtonSelectedId}
                onSelect={setMenuButtonSelectedId}
              />
            ))}
          </div>
          <p className="type-caption type-muted">
            Selected action: {menuButtonSelectedId || '—'}
          </p>
        </div>

        <div className="space-y-3">
          <p className="type-caption type-faint font-mono">Cascade menu</p>
          <CascadeMenuButton
            label="Actions"
            variant="ghost"
            menuSize="compact"
            items={cascadeMenuItems}
            onSelect={setCascadePick}
          />
          <p className="type-caption type-muted">
            Last pick: {cascadePick || '—'} — hover rows with <code className="type-code">&gt;</code>{' '}
            to open nested flyouts (portaled, compact tier).
          </p>
        </div>

        <div className="space-y-3">
          <p className="type-caption type-faint font-mono">Micro menu dropdown (portal)</p>
          <MicroMenuDropdown
            label="Tools"
            variant="outline"
            menuSize="compact"
            items={miniStackedMenuItems}
            moreItems={miniStackedMenuMoreItems}
            selectedId={microDropdownSelectedId}
            onSelect={setMicroDropdownSelectedId}
          />
          <p className="type-caption type-muted">
            Opens a horizontal micro-menu chip rail in a fixed portal — selected:{' '}
            {microDropdownSelectedId || '—'}
          </p>
        </div>
      </section>
      </MenusShowcasePanelGate>

      <MenusShowcasePanelGate panel={panel} show="dropdowns">
      <section className="space-y-6">
        <p className="type-overline">Mini stacked menu</p>
        <p className="type-body-sm type-muted prose-measure">
          Fixed floating rails in raised cards —{' '}
          <code className="type-code">expandable</code> chips (icon or media when collapsed) open on
          hover or when pinned via <code className="type-code">expanded</code>; exclusive selection.
          Pass <code className="type-code">moreItems</code> for a{' '}
          <code className="type-code">+</code> control at the rail end (right / bottom) that reveals
          overflow chips. Default <code className="type-code">orientation=&quot;vertical&quot;</code>
          ; pass <code className="type-code">horizontal</code> for a bottom row.
        </p>

        <div className="space-y-3">
          <p className="type-caption type-faint font-mono">Vertical</p>
          <div className="theme-msmenu-dock theme-msmenu-dock--vertical">
            <Card variant="raised" className="theme-msmenu-dock__card">
              <MiniStackedMenu
                label="Workspace"
                orientation="vertical"
                items={miniStackedMenuItems}
                moreItems={miniStackedMenuMoreItems}
                selectedId={miniStackedVerticalSelectedId}
                onSelect={setMiniStackedVerticalSelectedId}
              />
            </Card>
          </div>
        </div>

        <div className="space-y-3">
          <p className="type-caption type-faint font-mono">Horizontal</p>
          <div className="theme-msmenu-dock theme-msmenu-dock--horizontal">
            <Card variant="raised" className="theme-msmenu-dock__card">
              <MiniStackedMenu
                label="Workspace"
                orientation="horizontal"
                items={miniStackedMenuItems}
                moreItems={miniStackedMenuMoreItems}
                selectedId={miniStackedHorizontalSelectedId}
                onSelect={setMiniStackedHorizontalSelectedId}
              />
            </Card>
          </div>
        </div>

        <div className="space-y-3">
          <p className="type-caption type-faint font-mono">Mini stack nav (tiered)</p>
          <p className="type-body-sm type-muted prose-measure">
            Compact horizontal rail of <code className="type-code">stack</code> tiles — sections open a{' '}
            <code className="type-code">subPanelVariant=&quot;stacked&quot;</code> tray{' '}
            <strong>above</strong> the bar (width + height morph). Same tiered data model as{' '}
            [StackNavMenu](StackNavMenu.tsx).
          </p>
          <div className="theme-msnav-dock">
            <Card variant="raised" className="theme-msnav-dock__card">
              <MiniStackNavMenu
                label="Workspace"
                items={miniStackNavMenuItems}
                activeId={miniStackNavActiveId}
                activeSubId={miniStackNavActiveSubId}
                onLinkSelect={setMiniStackNavSelectedId}
              />
            </Card>
          </div>
          <p className="type-caption type-muted">
            {miniStackNavContent.title} — {miniStackNavContent.body}
          </p>
        </div>
      </section>
      </MenusShowcasePanelGate>

      <MenusShowcasePanelGate panel={panel} show="structure">
      <section className="space-y-6">
        <p className="type-overline">Drag reorder menu</p>
        <p className="type-body-sm type-muted prose-measure">
          Tiered block list for form builders — recursive{' '}
          <code className="type-code">DragReorderMenuNode</code> tree (sections nest child blocks).
          Drag the grip to reorder siblings at the same tier; row body is an [Button](Button.tsx){' '}
          (<code className="type-code">itemVariant=&quot;inset&quot;</code> default). Gear{' '}
          <code className="type-code">MenuButton</code> on root + first nested tier (Duplicate,
          Rename, Delete). Body scroll uses <code className="type-code">scrollRail</code> (
          <code className="type-code">curved</code> · <code className="type-code">straight</code> ·{' '}
          <code className="type-code">hidden</code>) like doc/tree nav menus.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={dragReorderFlat ? 'action' : 'ghost'}
            onClick={() => setDragReorderFlat((value) => !value)}
          >
            {dragReorderFlat ? 'Flat tiers on' : 'Flat tiers off'}
          </Button>
          {SCROLL_RAILS.map((rail) => (
            <Button
              key={rail}
              type="button"
              size="sm"
              variant={dragReorderScrollRail === rail ? 'action' : 'ghost'}
              onClick={() => setDragReorderScrollRail(rail)}
            >
              {rail} rail
            </Button>
          ))}
        </div>
        <Card variant="raised" className="max-w-md overflow-visible p-2.5">
          <DragReorderMenu
            label="Form blocks"
            items={dragReorderMenuNodes}
            order={dragReorderOrder}
            onReorder={setDragReorderOrder}
            selectedId={dragReorderSelectedId}
            onSelect={setDragReorderSelectedId}
            flat={dragReorderFlat}
            bodyMaxHeight={16}
            scrollRail={dragReorderScrollRail}
            onAction={(actionId, nodeId, nodeType) => {
              setDragReorderLastAction(`${actionId} · ${nodeType} · ${nodeId}`)
            }}
          />
        </Card>
        <p className="type-caption type-muted font-mono">
          root order: {dragReorderRootIds(dragReorderOrder).join(' → ')}
        </p>
        {dragReorderLastAction ? (
          <p className="type-caption type-muted font-mono">
            Last tier action: <code className="type-code">{dragReorderLastAction}</code>
          </p>
        ) : null}
      </section>
      </MenusShowcasePanelGate>

      <MenusShowcasePanelGate panel={panel} show="specialty">
      <section className="space-y-6">
        <p className="type-overline">Dotted nav menu</p>
        <p className="type-body-sm type-muted prose-measure">
          Gallery dot indicators — <code className="type-code">role=&quot;tablist&quot;</code>; the
          active dot morphs into an accent pill inside the inset track (siblings stay circular).
          Default <code className="type-code">orientation=&quot;horizontal&quot;</code> for
          carousels; pass <code className="type-code">vertical</code> for portrait galleries. Arrow
          keys move selection along the active axis.
        </p>

        <div className="grid max-w-2xl gap-6">
          <Card variant="raised" className="p-4">
            <p className="type-caption type-faint font-mono mb-3">Horizontal gallery</p>
            <div className="theme-dotnav-gallery theme-dotnav-gallery--horizontal">
              <div className="theme-dotnav-gallery__stage">
                {dottedNavSlides.map((slide) => (
                  <div
                    key={slide.id}
                    className={[
                      'theme-dotnav-gallery__slide',
                      dottedNavSlideToneClass[slide.id],
                      slide.id === dottedNavHorizontalId
                        ? 'theme-dotnav-gallery__slide--active'
                        : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    aria-hidden={slide.id !== dottedNavHorizontalId}
                  >
                    <p className="type-title">{slide.label}</p>
                  </div>
                ))}
              </div>
              <div className="theme-dotnav-gallery__nav">
                <DottedNavMenu
                  label="Horizontal gallery"
                  orientation="horizontal"
                  size="md"
                  items={dottedNavSlides}
                  selectedId={dottedNavHorizontalId}
                  onSelect={setDottedNavHorizontalId}
                />
              </div>
            </div>
          </Card>

          <Card variant="outline" className="p-4">
            <p className="type-caption type-faint font-mono mb-3">Vertical gallery</p>
            <div className="theme-dotnav-gallery theme-dotnav-gallery--vertical">
              <div className="theme-dotnav-gallery__stage">
                {dottedNavSlides.map((slide) => (
                  <div
                    key={slide.id}
                    className={[
                      'theme-dotnav-gallery__slide',
                      dottedNavSlideToneClass[slide.id],
                      slide.id === dottedNavVerticalId
                        ? 'theme-dotnav-gallery__slide--active'
                        : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    aria-hidden={slide.id !== dottedNavVerticalId}
                  >
                    <p className="type-title">{slide.label}</p>
                  </div>
                ))}
              </div>
              <div className="theme-dotnav-gallery__nav">
                <DottedNavMenu
                  label="Vertical gallery"
                  orientation="vertical"
                  size="sm"
                  items={dottedNavSlides}
                  selectedId={dottedNavVerticalId}
                  onSelect={setDottedNavVerticalId}
                />
              </div>
            </div>
          </Card>
        </div>
      </section>

      <section className="space-y-6">
        <p className="type-overline">3D cube nav menu</p>
        <p className="type-body-sm type-muted prose-measure">
          Six-face cube navigation from <code className="type-code">ref.3d-menu</code> —{' '}
          <code className="type-code">CssShape3dMenuCube</code> + divided face grids · stack{' '}
          <code className="type-code">Button</code> tiles · dark ref-style panels.
        </p>
        <div className="grid max-w-md gap-4 sm:grid-cols-2">
          <Select
            label="faceBorder"
            options={[
              { value: 'on', label: 'on' },
              { value: 'off', label: 'off' },
            ]}
            value={cubeMenuFaceBorder}
            onChange={setCubeMenuFaceBorder}
          />
          <Select
            label="buttonLift"
            options={[
              { value: 'on', label: 'on' },
              { value: 'off', label: 'off' },
            ]}
            value={cubeMenuButtonLift}
            onChange={setCubeMenuButtonLift}
          />
        </div>
        <div className="theme-shape3d__panel p-6 max-w-md overflow-visible">
          <CubeMenu3d
            faceBorder={cubeMenuFaceBorder === 'on'}
            buttonLift={cubeMenuButtonLift === 'on'}
          />
        </div>
      </section>

      <section className="space-y-6">
        <p className="type-overline">Glow step dot nav</p>
        <p className="type-body-sm type-muted prose-measure">
          Labeled step rail from <code className="type-code">ref.timeline-ref-1</code> — Lucide icons
          with <code className="type-code">borderGlow=&quot;icon&quot;</code>-style SVG glow,{' '}
          <code className="type-code">TypeAnimText</code> + <code className="type-code">type-glow</code>{' '}
          labels, glowing axis dots, and a sliding marker. Panels use{' '}
          <code className="type-code">Card</code>. <code className="type-code">stepTransition</code>{' '}
          picks rail motion — <code className="type-code">smooth</code> (default),{' '}
          <code className="type-code">gentle</code>, <code className="type-code">snappy</code>, or{' '}
          <code className="type-code">elastic</code> overshoot. Pass{' '}
          <code className="type-code">scrollFocus</code> for scroll-spy mode — sections stack in a{' '}
          <code className="type-code">Card</code> scroll body (focus the panel to scroll, like doc /
          drag-reorder menus); the active step follows scroll position and step clicks jump to the
          section.
        </p>

        <div className="flex flex-wrap items-center gap-2">
          {GLOW_STEP_DOT_NAV_TRANSITIONS.map((preset) => (
            <Button
              key={preset}
              type="button"
              size="sm"
              variant={glowStepNavTransition === preset ? 'action' : 'ghost'}
              onClick={() => setGlowStepNavTransition(preset)}
            >
              {preset}
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={glowStepNavGlow ? 'action' : 'ghost'}
            onClick={() => setGlowStepNavGlow((value) => !value)}
          >
            {glowStepNavGlow ? 'Glow on' : 'Glow off'}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={glowStepNavScrollFocus ? 'action' : 'ghost'}
            onClick={() => setGlowStepNavScrollFocus((value) => !value)}
          >
            {glowStepNavScrollFocus ? 'Scroll focus' : 'Click tabs'}
          </Button>
          {glowStepNavScrollFocus
            ? SCROLL_RAILS.map((rail) => (
                <Button
                  key={rail}
                  type="button"
                  size="sm"
                  variant={glowStepNavScrollRail === rail ? 'action' : 'ghost'}
                  onClick={() => setGlowStepNavScrollRail(rail)}
                >
                  {rail} rail
                </Button>
              ))
            : null}
          <Button
            type="button"
            size="sm"
            variant={glowStepNavOrientation === 'vertical' ? 'action' : 'ghost'}
            onClick={() =>
              setGlowStepNavOrientation((value: GlowStepDotNavOrientation) =>
                value === 'vertical' ? 'horizontal' : 'vertical',
              )
            }
          >
            {glowStepNavOrientation === 'vertical' ? 'Vertical' : 'Horizontal'}
          </Button>
        </div>

        <div className={glowStepNavOrientation === 'vertical' ? 'max-w-sm' : 'max-w-3xl'}>
          <GlowStepDotNav
            label="Process timeline"
            orientation={glowStepNavOrientation}
            size="md"
            items={glowStepNavItems}
            selectedId={glowStepNavId}
            onSelect={setGlowStepNavId}
            scrollFocus={glowStepNavScrollFocus}
            scrollRail={glowStepNavScrollRail}
            stepTransition={glowStepNavTransition}
            glow={glowStepNavGlow}
          >
            {glowStepNavItems.map((item) => (
              <GlowStepDotNavPanel
                key={item.id}
                id={item.id}
                title={glowStepNavCopy[item.id]?.title}
              >
                <p className="type-muted m-0">{glowStepNavCopy[item.id]?.body}</p>
                {glowStepNavScrollFocus ? (
                  <p className="type-body-sm type-muted mt-3 mb-0">
                    Scroll inside the raised card — edge clouds and the accent rail match other menu
                    scroll hosts. The step rail stays fixed while sections pass through the focus
                    line.
                  </p>
                ) : null}
              </GlowStepDotNavPanel>
            ))}
          </GlowStepDotNav>
        </div>
      </section>
      </MenusShowcasePanelGate>

      <MenusShowcasePanelGate panel={panel} show="dropdowns">
      <section className="space-y-6">
        <p className="type-overline">Tabbed menu</p>
        <p className="type-body-sm type-muted prose-measure">
          ARIA <code className="type-code">tablist</code> /{' '}
          <code className="type-code">tabpanel</code> — default{' '}
          <code className="type-code">variant=&quot;segmented&quot;</code> uses the same sliding
          pill as <code className="type-code">RadioGroup</code>{' '}
          <code className="type-code">segmented</code>. Pass{' '}
          <code className="type-code">variant=&quot;expandable&quot;</code> for icon chips that
          morph labels (selected tab stays pinned open). Mount bodies with{' '}
          <code className="type-code">TabbedMenuPanel</code>.
        </p>

        <Card variant="raised" className="max-w-2xl">
          <TabbedMenu
            label="Workspace sections"
            variant="segmented"
            items={tabbedMenuItems}
            selectedId={tabbedMenuSelectedId}
            onSelect={setTabbedMenuSelectedId}
          >
            {tabbedMenuItems.map((item) => (
              <TabbedMenuPanel key={item.id} id={item.id}>
                <h3 className="type-title">{tabbedMenuCopy[item.id]?.title ?? item.label}</h3>
                <p className="type-body-sm type-muted mt-2">{tabbedMenuCopy[item.id]?.body}</p>
              </TabbedMenuPanel>
            ))}
          </TabbedMenu>
        </Card>

        <Card variant="outline" className="max-w-2xl">
          <TabbedMenu
            label="Expandable workspace tabs"
            variant="expandable"
            size="sm"
            items={tabbedMenuItems}
            selectedId={tabbedMenuSelectedId}
            onSelect={setTabbedMenuSelectedId}
          >
            {tabbedMenuItems.map((item) => (
              <TabbedMenuPanel key={item.id} id={item.id}>
                <p className="type-label">{tabbedMenuCopy[item.id]?.title ?? item.label}</p>
                <p className="type-body-sm type-muted mt-2">{tabbedMenuCopy[item.id]?.body}</p>
              </TabbedMenuPanel>
            ))}
          </TabbedMenu>
        </Card>
      </section>

      <section className="space-y-6">
        <p className="type-overline">Micro menu</p>
        <p className="type-body-sm type-muted prose-measure">
          Extremely tiny icon/media chips — same vertical / horizontal rails and{' '}
          <code className="type-code">ghost</code> / <code className="type-code">action</code> styling
          as the mini menu, but selections stay compact (no{' '}
          <code className="type-code">expandable</code> label morph).{' '}
          <code className="type-code">moreItems</code> adds the same{' '}
          <code className="type-code">+</code>           overflow control. Use <code className="type-code">menuScale</code> (75%–125%) on the nav and
          matching dock wrapper — see preset toggles below. Media wins over icon when both are
          set.
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <span className="type-caption type-faint font-mono">menuScale</span>
          {MENU_SCALE_STEPS.map((step) => (
            <Button
              key={step}
              type="button"
              size="sm"
              variant={microMenuScale === step ? 'action' : 'ghost'}
              onClick={() => setMicroMenuScale(step)}
            >
              {step === 1 ? '100%' : `${Math.round(step * 100)}%`}
            </Button>
          ))}
        </div>

        <div className="space-y-3">
          <p className="type-caption type-faint font-mono">Vertical</p>
          <div
            className={[
              'theme-mmenu-dock',
              'theme-mmenu-dock--vertical',
              menuScaleClass(microMenuScale),
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <Card variant="raised" className="theme-mmenu-dock__card">
              <MicroMenu
                label="Micro workspace"
                orientation="vertical"
                menuScale={microMenuScale}
                items={miniStackedMenuItems}
                moreItems={miniStackedMenuMoreItems}
                selectedId={microVerticalSelectedId}
                onSelect={setMicroVerticalSelectedId}
              />
            </Card>
          </div>
        </div>

        <div className="space-y-3">
          <p className="type-caption type-faint font-mono">Horizontal</p>
          <div
            className={[
              'theme-mmenu-dock',
              'theme-mmenu-dock--horizontal',
              menuScaleClass(microMenuScale),
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <Card variant="raised" className="theme-mmenu-dock__card">
              <MicroMenu
                label="Micro workspace"
                orientation="horizontal"
                menuScale={microMenuScale}
                items={miniStackedMenuItems}
                moreItems={miniStackedMenuMoreItems}
                selectedId={microHorizontalSelectedId}
                onSelect={setMicroHorizontalSelectedId}
              />
            </Card>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <p className="type-overline">Nano stacked menu</p>
        <p className="type-body-sm type-muted prose-measure">
          Smaller than the micro rail — segmented full-bleed color strips in a raised shell (no
          captions). Idle segments are thin; hover or selection expands that strip along the axis.
        </p>

        <div className="space-y-3">
          <p className="type-caption type-faint font-mono">Nano anchor menu — text TOC rail</p>
          <p className="type-body-sm type-muted prose-measure">
            Sticky scroll-spy section menu (Doc-reference pattern). Live demo with long-form content: Theme →
            Data viz → Docs.
          </p>
        </div>

        <div className="space-y-3">
          <p className="type-caption type-faint font-mono">Vertical — palette swatches</p>
          <div className="theme-nmenu-dock theme-nmenu-dock--vertical">
            <NanoStackedMenu
              label="Theme colors"
              orientation="vertical"
              items={nanoColorMenuItems}
              selectedId={nanoColorVerticalSelectedId}
              onSelect={setNanoColorVerticalSelectedId}
            />
          </div>
        </div>

        <div className="space-y-3">
          <p className="type-caption type-faint font-mono">Horizontal — palette swatches</p>
          <div className="theme-nmenu-dock theme-nmenu-dock--horizontal">
            <NanoStackedMenu
              label="Theme colors"
              orientation="horizontal"
              items={nanoColorMenuItems}
              selectedId={nanoColorHorizontalSelectedId}
              onSelect={setNanoColorHorizontalSelectedId}
            />
          </div>
          <p className="type-caption type-muted">
            Selected: {nanoColorVerticalSelectedId} (vertical) · {nanoColorHorizontalSelectedId}{' '}
            (horizontal)
          </p>
        </div>
      </section>
      </MenusShowcasePanelGate>

      <MenusShowcasePanelGate panel={panel} show="structure">
      <section className="space-y-4">
        <p className="type-overline">Doc nav menu</p>
        <p className="type-body-sm type-muted prose-measure">
          Left sidebar for documentation — recursive <code className="type-code">DocNavMenuNode</code>{' '}
          tree (sections nest arbitrarily deep). Leaf links underline on hover; section titles do
          not. Toggle <code className="type-code">flat</code> to show every tier without chevrons
          and enable the sliding diamond on the active link.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={docNavFlat ? 'action' : 'ghost'}
            onClick={() => setDocNavFlat((value) => !value)}
          >
            {docNavFlat ? 'Flat tiers on' : 'Flat tiers off'}
          </Button>
        </div>
        <Card variant="outline" className="theme-dnav-shell max-w-3xl">
          <DocNavMenu
            title="Docs"
            label="Documentation"
            items={docNavMenuItems}
            selectedId={docNavSelectedId}
            bodyMaxHeight={20}
            flat={docNavFlat}
            collapsed={docNavCollapsed}
            onCollapsedChange={setDocNavCollapsed}
            onSelect={setDocNavSelectedId}
          />
          <div className="theme-dnav-page__body">
            <h3 className="type-h4">{docNavContent.title}</h3>
            <p className="type-body-sm type-muted mt-2 max-w-prose">{docNavContent.body}</p>
          </div>
        </Card>
      </section>

      <section className="space-y-4">
        <p className="type-overline">Dashboard menu</p>
        <p className="type-body-sm type-muted prose-measure">
          Side dashboard rail — flat <code className="type-code">DashboardMenuLink</code> list with
          icon+label <code className="type-code">VurifyMenuButton</code> rows (same <code className="type-code">md</code> size language as home submenu). Collapse narrows to icon-only; expand restores full labels.
        </p>
        <Card variant="outline" className="theme-dash-shell max-w-3xl">
          <DashboardMenu
            title="Dashboard"
            label="Dashboard navigation"
            items={dashboardMenuItems}
            selectedId={dashboardSelectedId}
            bodyMaxHeight={20}
            collapsed={dashboardCollapsed}
            onCollapsedChange={setDashboardCollapsed}
            onSelect={setDashboardSelectedId}
          />
          <div className="theme-dash-page__body">
            <h3 className="type-h4">{dashboardContent.title}</h3>
            <p className="type-body-sm type-muted mt-2 max-w-prose">{dashboardContent.body}</p>
          </div>
        </Card>
      </section>

      <section className="space-y-4">
        <p className="type-overline">Tree map menu</p>
        <p className="type-body-sm type-muted prose-measure">
          Same recursive sidebar as doc nav — <code className="type-code">TreeMapMenuNode</code>{' '}
          tree with connector lines on nested tiers. Gear{' '}
          <code className="type-code">MenuButton</code> on root + first nested tier (Duplicate,
          Rename, Delete). Toggle <code className="type-code">flat</code> for all tiers without
          chevrons and the sliding diamond on the active link.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={treeMapFlat ? 'action' : 'ghost'}
            onClick={() => setTreeMapFlat((value) => !value)}
          >
            {treeMapFlat ? 'Flat tiers on' : 'Flat tiers off'}
          </Button>
        </div>
        <Card variant="outline" className="theme-tmap-shell max-w-3xl">
          <TreeMapMenu
            title="Outline"
            label="Tree map navigation"
            items={docNavMenuItems as readonly TreeMapMenuNode[]}
            selectedId={treeMapSelectedId}
            bodyMaxHeight={20}
            flat={treeMapFlat}
            collapsed={treeMapCollapsed}
            onCollapsedChange={setTreeMapCollapsed}
            onSelect={setTreeMapSelectedId}
            onAction={(actionId, nodeId, nodeType) => {
              setTreeMapLastAction(`${actionId} · ${nodeType} · ${nodeId}`)
            }}
          />
          <div className="theme-tmap-page__body">
            <h3 className="type-h4">{treeMapContent.title}</h3>
            <p className="type-body-sm type-muted mt-2 max-w-prose">{treeMapContent.body}</p>
            {treeMapLastAction ? (
              <p className="type-body-sm type-muted mt-3">
                Last tier action: <code className="type-code">{treeMapLastAction}</code>
              </p>
            ) : null}
          </div>
        </Card>
      </section>
      </MenusShowcasePanelGate>

      <MenusShowcasePanelGate panel={panel} show="layout">
      <section className="space-y-4">
        <p className="type-overline">Mobile tiered — push</p>
        <Card variant="outline" className="theme-bmenu-page mx-auto max-w-sm">
          <HamburgerMenu
            label="Example site"
            brandLabel="Example site"
            items={pageMenuItems}
            activeId={mobileActiveId}
            activeSubId={mobileActiveSubId}
            onLinkSelect={setMobileSelectedId}
            panelExpansion="push"
          />
          <div className="theme-bmenu-page__body">
            <h3 className="type-h4">{mobileContent.title}</h3>
            <p className="type-body-sm type-muted mt-2 max-w-prose">{mobileContent.body}</p>
          </div>
        </Card>
      </section>

      <section className="space-y-4">
        <p className="type-overline">Mobile tiered — overlay (phone)</p>
        <Card variant="outline" className="theme-bmenu-page theme-bmenu-device-shell">
          <div ref={mobilePhoneShellRef} className="theme-bmenu-device-shell__viewport">
            <div className="theme-bmenu-device-shell__notch" aria-hidden />
            <HamburgerMenu
              label="Example site"
              brandLabel="Example site"
              items={pageMenuItems}
              activeId={mobileOverlayActiveId}
              activeSubId={mobileOverlayActiveSubId}
              onLinkSelect={setMobileOverlaySelectedId}
              panelExpansion="overlay"
              shellRef={mobilePhoneShellRef}
            />
            <div className="theme-bmenu-page__body">
              <h3 className="type-h4">{mobileOverlayContent.title}</h3>
              <p className="type-body-sm type-muted mt-2 max-w-prose">{mobileOverlayContent.body}</p>
            </div>
          </div>
        </Card>
      </section>

      <section className="space-y-4">
        <p className="type-overline">Page shell — scroll bar rails</p>
        <p className="type-body-sm type-muted prose-measure">
          Narrow header with many links — <code className="type-code">barVariant=&quot;scroll&quot;</code>{' '}
          with <code className="type-code">barScrollRail</code> (<code className="type-code">curved</code>{' '}
          · <code className="type-code">straight</code> · <code className="type-code">hidden</code>) and{' '}
          <code className="type-code">barScrollClouds</code> (default <code className="type-code">true</code>).
          Host sets <code className="type-code">data-scroll-rail</code> on the scroll container.
        </p>
        <div className="grid gap-6">
          {(['curved', 'straight', 'hidden'] as const).map((rail) => (
            <Card key={rail} variant="outline" className="theme-hmenu-page max-w-xl">
              <HorizontalMenu
                label="Example site"
                items={scrollBarMenuItems}
                barVariant="scroll"
                barScrollRail={rail}
                activeId={scrollBarActiveId}
                activeSubId={scrollBarActiveSubId}
                onLinkSelect={setScrollBarSelectedId}
              />
              <div className="theme-hmenu-page__body">
                <p className="type-caption font-mono type-faint mb-2">barScrollRail=&quot;{rail}&quot;</p>
                <h3 className="type-h4">{scrollBarContent.title}</h3>
                <p className="type-body-sm type-muted mt-2 max-w-prose">{scrollBarContent.body}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>
      </MenusShowcasePanelGate>

      <MenusShowcasePanelGate panel={panel} show="specialty">
      <section className="space-y-4">
        <p className="type-overline">Stack nav menu</p>
        <p className="type-body-sm type-muted prose-measure">
          Same tiered structure as the horizontal nav — bar tiles use [Button](Button.tsx){' '}
          <code className="type-code">variant=&quot;stack&quot;</code> (icon above label). Sections
          open the same sub-panel on click — no chevron on the tile.
        </p>
        <Card variant="outline" className="theme-hmenu-page">
          <StackNavMenu
            label="Stack nav example"
            items={pageMenuItems}
            activeId={activeId}
            activeSubId={activeSubId}
            onLinkSelect={setSelectedId}
          />
          <div className="theme-hmenu-page__body">
            <h3 className="type-h4">{content.title}</h3>
            <p className="type-body-sm type-muted mt-2 max-w-prose">{content.body}</p>
          </div>
        </Card>
      </section>
      </MenusShowcasePanelGate>

      <MenusShowcasePanelGate panel={panel} show="layout">
      <section className="space-y-4">
        <p className="type-overline">Page shell</p>
        <Card variant="outline" className="theme-hmenu-page">
          <HorizontalMenu
            label="Example site"
            items={pageMenuItems}
            activeId={activeId}
            activeSubId={activeSubId}
            onLinkSelect={setSelectedId}
          />
          <div className="theme-hmenu-page__body">
            <h3 className="type-h4">{content.title}</h3>
            <p className="type-body-sm type-muted mt-2 max-w-prose">{content.body}</p>
          </div>
        </Card>
      </section>
      </MenusShowcasePanelGate>
    </div>
  )
}
