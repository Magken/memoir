import { Children, isValidElement, type ReactElement, type ReactNode } from 'react'

export function buttonGroupItems(children: ReactNode): ReactElement[] {
  return Children.toArray(children).filter(isValidElement) as ReactElement[]
}

export function buttonGroupItemActive(props: Record<string, unknown>): boolean {
  if (props.active === true) return true
  const pressed = props['aria-pressed']
  if (pressed === true || pressed === 'true') return true
  const checked = props['aria-checked']
  if (checked === true || checked === 'true') return true
  return false
}

export function buttonGroupSelectedIndex(items: readonly ReactElement[]): number {
  const index = items.findIndex((item) => buttonGroupItemActive(item.props as Record<string, unknown>))
  return index < 0 ? 0 : index
}
