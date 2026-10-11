/**
 * Viewer-facing aliases for Edge CvExtractV2 — keep in lockstep with cvApi / schema.
 */
import type { LucideIcon } from 'lucide-react'
import {
  Award,
  BadgeCheck,
  BookOpen,
  Briefcase,
  FolderKanban,
  GraduationCap,
  HeartHandshake,
  LayoutList,
  Sparkles,
  Users,
} from 'lucide-react'
import type { CvExtractV2, CvSectionKind } from '../../lib/cvApi'

export type VurifyViewerDoc = CvExtractV2
export type VurifyViewerSection = CvExtractV2['sections'][number]
export type VurifyViewerItem = Record<string, unknown>
export type VurifyViewerBasics = CvExtractV2['basics']

export const CV_SECTION_KINDS: readonly CvSectionKind[] = [
  'experience',
  'education',
  'projects',
  'skills',
  'certifications',
  'awards',
  'publications',
  'volunteer',
  'references',
  'custom',
] as const

export const SECTION_KIND_LABELS: Record<CvSectionKind, string> = {
  experience: 'Experience',
  education: 'Education',
  skills: 'Skills',
  projects: 'Projects',
  publications: 'Publications',
  references: 'References',
  awards: 'Awards',
  certifications: 'Certifications',
  volunteer: 'Volunteer',
  custom: 'Custom',
}

export const SECTION_KIND_ICONS: Record<CvSectionKind, LucideIcon> = {
  experience: Briefcase,
  education: GraduationCap,
  skills: Sparkles,
  projects: FolderKanban,
  publications: BookOpen,
  references: Users,
  awards: Award,
  certifications: BadgeCheck,
  volunteer: HeartHandshake,
  custom: LayoutList,
}

export function defaultSectionTitle(kind: CvSectionKind): string {
  return SECTION_KIND_LABELS[kind]
}

export function newId(): string {
  return crypto.randomUUID()
}

export function asString(value: unknown): string {
  if (value == null) return ''
  return String(value)
}

export function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map((v) => String(v ?? ''))
}

export function asBool(value: unknown): boolean {
  return value === true
}
