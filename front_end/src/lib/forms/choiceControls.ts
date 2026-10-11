export const CHOICE_SIZES = ['xs', 'sm', 'md', 'lg'] as const

export type ChoiceSize = (typeof CHOICE_SIZES)[number]

export type ChoiceOption = {
  value: string
  label: string
}

export function choiceIndex(value: string, options: readonly ChoiceOption[]): number {
  const index = options.findIndex((opt) => opt.value === value)
  return index < 0 ? 0 : index
}

export function clampChoiceIndex(index: number, count: number): number {
  if (count <= 0) return 0
  return Math.max(0, Math.min(count - 1, index))
}
