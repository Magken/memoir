import { ensureWebsitePlannerElementsRegistered } from './elements'
import { ensureWebsitePlannerTemplatesRegistered } from './templates'

export * from './types'
export * from './elements'
export * from './analyzePlan'
export * from './draftStore'
export * from './starters'
export * from './templates'

/** Register palette elements + templates for the website-plan toolkit. */
export function ensureWebsitePlannerToolkit(): void {
  ensureWebsitePlannerElementsRegistered()
  ensureWebsitePlannerTemplatesRegistered()
}

ensureWebsitePlannerToolkit()
