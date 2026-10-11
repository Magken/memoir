import type { ReactNode } from 'react'

export type ArrangementCategory =
  | 'landing'
  | 'hero'
  | 'pricing'
  | 'wayfinding'
  | 'state'
  | 'section'
  | 'article'
  | 'ui'
  | 'quote'
  | 'meta'
  | 'motion'

export type TextArrangement = {
  id: string
  category: ArrangementCategory
  name: string
  purpose: string
  reference: string
  stack: string
  preview: ReactNode
}

export const textDisplayCategoryOptions = [
  { value: 'all', label: 'All arrangements' },
  { value: 'landing', label: 'Landing pages' },
  { value: 'hero', label: 'Hero & landing' },
  { value: 'motion', label: 'Motion & bands' },
  { value: 'pricing', label: 'Pricing & offers' },
  { value: 'wayfinding', label: 'Wayfinding & nav' },
  { value: 'state', label: 'Empty & status' },
  { value: 'section', label: 'Section headers' },
  { value: 'article', label: 'Article & editorial' },
  { value: 'ui', label: 'UI & panels' },
  { value: 'quote', label: 'Quotes & emphasis' },
  { value: 'meta', label: 'Meta & bylines' },
] as const
