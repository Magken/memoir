import type { LucideIcon } from 'lucide-react'

export type CascadeMenuItem = {
  id: string
  label: string
  icon?: LucideIcon
  disabled?: boolean
  /** Preference / toggle row — shows theme Checkbox mark (not a nested interactive control) */
  checked?: boolean
  children?: readonly CascadeMenuItem[]
}

export function cascadeItemHasBranch(item: CascadeMenuItem): boolean {
  return Boolean(item.children?.length)
}
