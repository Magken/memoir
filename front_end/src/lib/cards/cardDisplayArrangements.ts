import type { ReactNode } from 'react'

export type CardArrangementCategory =
  | 'product'
  | 'pricing'
  | 'marketing'
  | 'feature'
  | 'testimonial'
  | 'stat'
  | 'info'
  | 'media'
  | 'layout'

export type CardArrangement = {
  id: string
  category: CardArrangementCategory
  name: string
  purpose: string
  reference: string
  stack: string
  preview: ReactNode
}

export const cardDisplayCategoryOptions = [
  { value: 'all', label: 'All arrangements' },
  { value: 'product', label: 'Product & commerce' },
  { value: 'media', label: 'Media & trust' },
  { value: 'pricing', label: 'Pricing & plans' },
  { value: 'marketing', label: 'Marketing & promos' },
  { value: 'testimonial', label: 'Testimonials' },
  { value: 'feature', label: 'Features & specs' },
  { value: 'stat', label: 'Stats & KPIs' },
  { value: 'info', label: 'Info & help' },
  { value: 'layout', label: 'Layout patterns' },
] as const
