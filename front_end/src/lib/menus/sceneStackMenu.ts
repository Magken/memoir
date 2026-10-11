import type { IconSvgElement } from '@hugeicons/react'

/** How the right-panel / footer preview composes content. */
export type SceneStackMenuPreviewLayout = 'media' | 'copy' | 'split' | 'pricing' | 'cover'

/** One column in a `split` pathway preview. */
export type SceneStackMenuPreviewColumn = {
  overline?: string
  title: string
  body: string
}

/** Compact tier card in a `pricing` preview. */
export type SceneStackMenuPreviewPricingCard = {
  id: string
  title: string
  price: string
  note: string
}

/**
 * Hover/rest preview for a category or lower-layer link.
 * Default layout is `media` when `image` is set, otherwise `copy`.
 * `cover` = full-bleed image with copy (or split columns) in the foreground.
 */
export type SceneStackMenuPreview = {
  layout?: SceneStackMenuPreviewLayout
  overline?: string
  title: string
  body?: string
  image?: {
    src: string
    alt: string
    /** Default `cover`. Use `contain` for illustrations that should not crop. */
    fit?: 'cover' | 'contain'
  }
  /** Storyset (etc.) credit — static caption, never a link. */
  credit?: string
  columns?: readonly SceneStackMenuPreviewColumn[]
  pricingCards?: readonly SceneStackMenuPreviewPricingCard[]
}

/** Lower-layer icon link inside an active top category. */
export type SceneStackMenuLink = {
  id: string
  label: string
  icon: IconSvgElement
  /** Destination id handed to the shell (scene anchor, route key, etc.). */
  targetId: string
  preview: SceneStackMenuPreview
}

/** Compact utility action shown in the menu footer (Hugeicons glyphs). */
export type SceneStackMenuFooterItem = {
  id: string
  label: string
  icon: IconSvgElement
  targetId: string
  /**
   * External URL for socials (opens in a new tab). When set, click skips
   * `targetId` navigation / booking peel.
   */
  href?: string
  /**
   * VurifyMenuButton variant. Defaults from `iconOnly` when omitted
   * (`icon-only` vs `label`). Use `fill` for Contact / lowest-tier utilities.
   */
  variant?: 'label' | 'fill' | 'icon-only'
  /** Icon-only control (label stays for aria); use for socials. Prefer `variant`. */
  iconOnly?: boolean
  /** Groups utilities vs socials for footer partitioning. */
  group?: 'utility' | 'social'
}

/** Top-layer category tab that owns a lower link group + default preview. */
export type SceneStackMenuCategory = {
  id: string
  label: string
  icon: IconSvgElement
  preview: SceneStackMenuPreview
  items: readonly SceneStackMenuLink[]
}

export function sceneStackMenuPreviewLayout(
  preview: SceneStackMenuPreview,
): SceneStackMenuPreviewLayout {
  if (preview.layout) return preview.layout
  if (preview.pricingCards?.length) return 'pricing'
  if (preview.columns?.length) return 'split'
  if (preview.image) return 'media'
  return 'copy'
}

/** Stable key for preview out→in swaps (menu + footer). */
export function sceneStackMenuPreviewIdentity(
  preview: SceneStackMenuPreview | null | undefined,
): string {
  if (!preview) return ''
  const layout = sceneStackMenuPreviewLayout(preview)
  const img = preview.image?.src ?? ''
  const body = preview.body ?? ''
  const cols = preview.columns?.map((column) => column.title).join('|') ?? ''
  const cards = preview.pricingCards?.map((card) => card.id).join('|') ?? ''
  return `${layout}\0${preview.title}\0${img}\0${body}\0${cols}\0${cards}`
}

export function sceneStackMenuFindCategory(
  categories: readonly SceneStackMenuCategory[],
  categoryId: string | null | undefined,
): SceneStackMenuCategory | undefined {
  if (!categoryId) return categories[0]
  return categories.find((category) => category.id === categoryId) ?? categories[0]
}

export function sceneStackMenuFindLink(
  category: SceneStackMenuCategory | undefined,
  linkId: string | null | undefined,
): SceneStackMenuLink | undefined {
  if (!category || !linkId) return undefined
  return category.items.find((item) => item.id === linkId)
}

/** Preview for hover/focus, falling back to the active category default. */
export function sceneStackMenuResolvePreview(
  category: SceneStackMenuCategory | undefined,
  linkId: string | null | undefined,
): SceneStackMenuPreview | null {
  if (!category) return null
  return sceneStackMenuFindLink(category, linkId)?.preview ?? category.preview
}

/** Home Menu dock — hide during bootstrap / App Stage nav even after Scene 2. */
export function sceneMenuTriggerVisible(input: {
  sceneTwoReached: boolean
  open: boolean
  footerSurface: boolean
  inputLocked: boolean
}): boolean {
  return (
    (input.sceneTwoReached || input.open) &&
    !input.footerSurface &&
    !input.inputLocked
  )
}

/** Footer Close dock — hide during bootstrap / App Stage nav. */
export function sceneMenuFooterTriggerVisible(input: {
  footerSurface: boolean
  inputLocked: boolean
}): boolean {
  return input.footerSurface && !input.inputLocked
}
