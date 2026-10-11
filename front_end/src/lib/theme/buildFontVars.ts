import type { CSSProperties } from 'react'
import type { FontStack } from './fontStacks'

/** Maps font stack → `--font-*` CSS custom properties (synced on `<html>`). */
export function buildFontVars(stack: FontStack): CSSProperties {
  return {
    '--font-display': stack.display,
    '--font-display-sans': stack.displaySans ?? stack.display,
    '--font-display-weight': String(stack.displayWeight ?? 600),
    '--font-sans': stack.sans,
    '--font-mono': stack.mono,
  } as CSSProperties
}
