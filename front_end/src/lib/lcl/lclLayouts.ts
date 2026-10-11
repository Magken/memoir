/**
 * Toolkit LCL layout manifests. The constructor dropdown lists each layout
 * and the features it shows. Non-base features may appear in at most one
 * layout unless the element lists the extra layout in `sharedWith`. At most
 * two shared features per layout.
 */
import { LCL_ELEMENT_BY_ID, type LclElementId } from './lclElements'
import type { LclSceneId } from './lclScenes'

export const LCL_LAYOUT_IDS = ['reference', 'ledger', 'reel', 'atlas', 'type'] as const
export type LclLayoutId = (typeof LCL_LAYOUT_IDS)[number]

export const LCL_SHARED_FEATURES_MAX = 2

export type LclLayoutManifest = {
  id: LclLayoutId
  label: string
  blurb: string
  scene: LclSceneId
  features: readonly LclElementId[]
}

export const LCL_LAYOUTS: readonly LclLayoutManifest[] = [
  {
    id: 'reference',
    label: 'Reference',
    blurb: 'Title, crumb, list, and prose links',
    scene: 'preview',
    features: ['option-list', 'prose-steps', 'inline-expand-link'],
  },
  {
    id: 'ledger',
    label: 'Ledger',
    blurb: 'Tables that reflow when you pick or hover a row',
    scene: 'ledger',
    features: [
      'table',
      'table-reflow',
      'row-expand',
      'column-spotlight',
      'sort-header',
      'filter-chips',
      'key-value',
      'stat',
      'count-up',
      'kicker',
      'hover-row-preview',
      'media-frame',
    ],
  },
  {
    id: 'reel',
    label: 'Reel',
    blurb: 'Media that leaves before the next frame enters',
    scene: 'reel',
    features: ['media-caption', 'pager', 'thumb-strip', 'wheel-step', 'video-poster', 'media-frame'],
  },
  {
    id: 'atlas',
    label: 'Atlas',
    blurb: 'Sections that change layout on hover',
    scene: 'atlas',
    features: ['hover-columns', 'hover-index-stage', 'term-note', 'timeline', 'orientation-strip'],
  },
  {
    id: 'type',
    label: 'Type',
    blurb: 'Text transforms and editorial type',
    scene: 'type',
    features: [
      'decode-reveal',
      'marker-sweep',
      'strike-replace',
      'case-swap',
      'numbered-heading',
      'pull-quote',
      'footnote-in-place',
      'orientation-strip',
    ],
  },
]

export function lclLayout(id: string): LclLayoutManifest | undefined {
  return LCL_LAYOUTS.find((layout) => layout.id === id)
}

export function parseLclLayoutId(raw: string | null | undefined): LclLayoutId {
  if (raw && LCL_LAYOUT_IDS.includes(raw as LclLayoutId)) return raw as LclLayoutId
  return 'reference'
}

export function lclLayoutMenuDetail(manifest: LclLayoutManifest): string {
  const labels = manifest.features.map((id) => LCL_ELEMENT_BY_ID[id]?.label ?? id)
  if (labels.length <= 3) return labels.join(' · ')
  return `${labels.slice(0, 3).join(' · ')} · +${labels.length - 3}`
}

export function lclSharedFeatureIds(manifest: LclLayoutManifest): string[] {
  return manifest.features.filter((id) => {
    const extra = LCL_ELEMENT_BY_ID[id]?.sharedWith
    return Boolean(extra?.includes(manifest.id) || extra?.length)
  })
}
