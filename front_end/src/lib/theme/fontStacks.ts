/** Font stack tokens — display / display-sans / body / mono families. */

export type FontStack = {
  name: string
  /** Primary / oversized display. */
  display: string
  /**
   * Secondary / smaller display titles.
   * Falls back to `display` when omitted.
   */
  displaySans?: string
  /** Oversized display weight. Default 600. Megrim ships 400; 700 is the requested bold cut (synthesized). */
  displayWeight?: number
  /** Body + UI. */
  sans: string
  mono: string
}

export const fontStacks = {
  /**
   * Project default — Megrim bold oversized display, Monotalic (Space Mono · face 8)
   * on smaller titles / headings, Hoss Round (Nunito · face 7) for body + UI.
   */
  gras: {
    name: 'GRAS',
    display: "'Megrim', system-ui, sans-serif",
    displaySans: "'Space Mono', ui-monospace, monospace",
    displayWeight: 700,
    sans: "'Nunito', system-ui, sans-serif",
    mono: "'JetBrains Mono', ui-monospace, monospace",
  },
  /**
   * Vurify reference — Cosmic (Bricolage Grotesque · face 19) across title scales,
   * Hoss Round (Nunito · face 7) for body + UI.
   */
  vurify: {
    name: 'Vurify',
    display: "'Bricolage Grotesque', system-ui, sans-serif",
    displaySans: "'Bricolage Grotesque', system-ui, sans-serif",
    sans: "'Nunito', system-ui, sans-serif",
    mono: "'JetBrains Mono', ui-monospace, monospace",
  },
  /** Source Serif 4 display · Source Sans 3 body · JetBrains Mono */
  brand: {
    name: 'Brand',
    display: "'Source Serif 4', Georgia, 'Times New Roman', serif",
    sans: "'Source Sans 3 Variable', 'Source Sans 3', system-ui, sans-serif",
    mono: "'JetBrains Mono', ui-monospace, monospace",
  },
  /** Cormorant Garamond display · DM Sans body · JetBrains Mono */
  editorial: {
    name: 'Editorial',
    display: "'Cormorant Garamond', Georgia, 'Times New Roman', serif",
    sans: "'DM Sans Variable', 'DM Sans', system-ui, sans-serif",
    mono: "'JetBrains Mono', ui-monospace, monospace",
  },
} as const satisfies Record<string, FontStack>

export type FontStackId = keyof typeof fontStacks

export const DEFAULT_FONT_STACK_ID: FontStackId = 'gras'

export const THEME_FONT_STACK_STORAGE_KEY = 'theme_font_stack_v2'
