import { ensureMockupElementsRegistered } from './elements'
import { ensureMockupTemplatesRegistered } from './templates'

export * from './types'
export * from './catalog'
export * from './scenes'
export * from './motions'
export * from './elements'
export * from './starters'
export * from './templates'

export function ensureMockupToolkit(): void {
  ensureMockupElementsRegistered()
  ensureMockupTemplatesRegistered()
}

ensureMockupToolkit()
