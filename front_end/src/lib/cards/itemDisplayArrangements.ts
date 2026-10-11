import type { ReactNode } from 'react'

export type ItemDisplayCategory = 'catalog' | 'display' | 'cart' | 'list' | 'picker'

export type ItemDisplayArrangement = {
  id: string
  category: ItemDisplayCategory
  name: string
  purpose: string
  reference: string
  stack: string
  preview: ReactNode
}

export const itemDisplayCategoryOptions = [
  { value: 'all', label: 'All arrangements' },
  { value: 'catalog', label: 'Catalog & grid' },
  { value: 'display', label: 'Display style cards' },
  { value: 'cart', label: 'Cart & checkout' },
  { value: 'list', label: 'List & feed' },
  { value: 'picker', label: 'Pickers & selectors' },
] as const
