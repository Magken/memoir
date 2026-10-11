import type { LucideIcon } from 'lucide-react'
import type { CvSectionKind } from '../../lib/cvApi'
import {
  CV_SECTION_KINDS,
  SECTION_KIND_ICONS,
  SECTION_KIND_LABELS,
} from './types'

export type SectionInsertPlacement = 'before' | 'after'

export type SectionAddPick = {
  placement: SectionInsertPlacement
  kind: CvSectionKind
}

/** Footer chips — one tray icon per section kind (append; reorder via TOC). */
export const SECTION_ADD_KIND_BUTTONS: readonly {
  kind: CvSectionKind
  label: string
  tooltip: string
  icon: LucideIcon
}[] = CV_SECTION_KINDS.map((kind) => ({
  kind,
  label: SECTION_KIND_LABELS[kind],
  tooltip: `Add ${SECTION_KIND_LABELS[kind]}`,
  icon: SECTION_KIND_ICONS[kind],
}))
