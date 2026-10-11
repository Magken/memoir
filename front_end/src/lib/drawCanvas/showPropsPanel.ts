import { DRAW_PROPERTY_TOOLS } from './tools'

export function showDrawPropsPanel(
  activeToolType: string,
  selectedCount: number,
  viewModeEnabled: boolean,
): boolean {
  if (viewModeEnabled) return false
  if (selectedCount > 0) return true
  return DRAW_PROPERTY_TOOLS.has(activeToolType)
}
