/** Display face catalog — Codrops on-scroll type faces → free self-hosted Fontsource families */

export type DisplayFaceRole = 'serif' | 'sans' | 'display' | 'stencil' | 'mono' | 'variable'

export type DisplayFace = {
  id: number
  label: string
  /** Original Codrops/Adobe face this free family stands in for. */
  codropsName: string
  /** Self-hosted Fontsource family stack applied as --font-display. */
  cssFamily: string
  /** Free Fontsource family that renders this face. */
  family: string
  role: DisplayFaceRole
  sample: string
}

export type DisplayTypeTreatment = {
  id: string
  label: string
  sourceClass: string
  sample: string
  purpose: string
  /** Display-scale title treatments vs simple body/text specimens. */
  scale?: 'display' | 'text'
}

export const DISPLAY_FACES: readonly DisplayFace[] = [
  { id: 1, label: 'Wayfinder', codropsName: 'wayfinder-cf', cssFamily: "'Cormorant Garamond', Georgia, serif", family: 'Cormorant Garamond', role: 'serif', sample: 'have fallen' },
  { id: 2, label: 'Campaign', codropsName: 'campaign-serif', cssFamily: "'Libre Baskerville', Georgia, serif", family: 'Libre Baskerville', role: 'serif', sample: 'Heavenly' },
  { id: 3, label: 'Area', codropsName: 'area-normal', cssFamily: "'DM Sans', system-ui, sans-serif", family: 'DM Sans', role: 'sans', sample: 'Blooming' },
  { id: 4, label: 'Campaign italic', codropsName: 'campaign-serif italic', cssFamily: "'Libre Baskerville', Georgia, serif", family: 'Libre Baskerville', role: 'serif', sample: 'pleasure' },
  { id: 5, label: 'Zedou', codropsName: 'zedou', cssFamily: "'Oswald', system-ui, sans-serif", family: 'Oswald', role: 'display', sample: 'MEGASCRAPERS' },
  { id: 6, label: 'Afronaut', codropsName: 'afronaut', cssFamily: "'Fredoka', system-ui, sans-serif", family: 'Fredoka', role: 'display', sample: 'meaning dramatic' },
  { id: 7, label: 'Hoss Round', codropsName: 'hoss-round-wide', cssFamily: "'Nunito', system-ui, sans-serif", family: 'Nunito', role: 'sans', sample: 'The blossoms Intentionally' },
  { id: 8, label: 'Monotalic', codropsName: 'monotalic', cssFamily: "'Space Mono', ui-monospace, monospace", family: 'Space Mono', role: 'mono', sample: 'midnight' },
  { id: 9, label: 'Aziga', codropsName: 'aziga', cssFamily: "'Bebas Neue', system-ui, sans-serif", family: 'Bebas Neue', role: 'display', sample: 'Night Time' },
  { id: 10, label: 'Norman Stencil', codropsName: 'norman-stencil', cssFamily: "'Black Ops One', system-ui, sans-serif", family: 'Black Ops One', role: 'stencil', sample: 'Unintelligible' },
  { id: 11, label: 'Neighbor', codropsName: 'neighbor', cssFamily: "'Archivo Black', system-ui, sans-serif", family: 'Archivo Black', role: 'display', sample: 'Futuristic' },
  { id: 12, label: 'Halogen', codropsName: 'halogen', cssFamily: "'Anton', system-ui, sans-serif", family: 'Anton', role: 'display', sample: 'Moon Liberation Life' },
  { id: 13, label: 'Marlide', codropsName: 'marlide-display-variable', cssFamily: "'Playfair Display', Georgia, serif", family: 'Playfair Display', role: 'variable', sample: 'Feel because you have a heart' },
  { id: 14, label: 'June Expt', codropsName: 'june-expt-variable', cssFamily: "'Syne', system-ui, sans-serif", family: 'Syne', role: 'variable', sample: 'Experiment' },
  { id: 15, label: 'June Expt alternate', codropsName: 'june-expt-variable STYL 100', cssFamily: "'Syne', system-ui, sans-serif", family: 'Syne', role: 'variable', sample: 'Embrace' },
  { id: 16, label: 'Inge', codropsName: 'inge-variable', cssFamily: "'Instrument Serif', Georgia, serif", family: 'Instrument Serif', role: 'variable', sample: 'SURRENDER TO REALITY' },
  { id: 17, label: 'Antipoda', codropsName: 'antipoda-variable', cssFamily: "'Outfit', system-ui, sans-serif", family: 'Outfit', role: 'variable', sample: 'Width play' },
  { id: 18, label: 'Vinila', codropsName: 'vinila-variable', cssFamily: "'Fraunces', Georgia, serif", family: 'Fraunces', role: 'variable', sample: 'remains Light' },
  { id: 19, label: 'Nagel', codropsName: 'nagel-variable', cssFamily: "'Bricolage Grotesque', system-ui, sans-serif", family: 'Bricolage Grotesque', role: 'variable', sample: 'Cosmic' },
  { id: 20, label: 'Borax', codropsName: 'borax-variable', cssFamily: "'Bodoni Moda', Georgia, serif", family: 'Bodoni Moda', role: 'variable', sample: 'Beauty Love' },
  { id: 21, label: 'Gigantic', codropsName: 'gigantic', cssFamily: "'Teko', system-ui, sans-serif", family: 'Teko', role: 'display', sample: 'INTENSE NATURE' },
  { id: 22, label: 'Capsule', codropsName: 'capsule', cssFamily: "'Unbounded', system-ui, sans-serif", family: 'Unbounded', role: 'display', sample: 'WAKING DEEPER' },
  { id: 23, label: 'Arsenica', codropsName: 'arsenica-variable', cssFamily: "'Cormorant Infant', Georgia, serif", family: 'Cormorant Infant', role: 'variable', sample: 'Existence Symphony' },
  // Lab additions — odd / imaginative free Fontsource faces for exploration (not Codrops stand-ins)
  { id: 24, label: 'Foldit', codropsName: 'lab', cssFamily: "'Foldit', system-ui, sans-serif", family: 'Foldit', role: 'variable', sample: 'origami signal' },
  { id: 25, label: 'Moirai', codropsName: 'lab', cssFamily: "'Moirai One', system-ui, sans-serif", family: 'Moirai One', role: 'display', sample: 'fate thread' },
  { id: 26, label: 'Glitch', codropsName: 'lab', cssFamily: "'Rubik Glitch', system-ui, sans-serif", family: 'Rubik Glitch', role: 'display', sample: 'BROKEN SIGNAL' },
  { id: 27, label: 'Monoton', codropsName: 'lab', cssFamily: "'Monoton', system-ui, sans-serif", family: 'Monoton', role: 'display', sample: 'NEON PARADE' },
  { id: 28, label: 'Megrim', codropsName: 'lab', cssFamily: "'Megrim', system-ui, sans-serif", family: 'Megrim', role: 'display', sample: 'wireframe dream' },
  { id: 29, label: 'Plaster', codropsName: 'lab', cssFamily: "'Plaster', system-ui, sans-serif", family: 'Plaster', role: 'display', sample: 'CAST RELIC' },
  { id: 30, label: 'Grenze Gotisch', codropsName: 'lab', cssFamily: "'Grenze Gotisch', Georgia, serif", family: 'Grenze Gotisch', role: 'serif', sample: 'Midnight Codex' },
  { id: 31, label: 'Major Mono', codropsName: 'lab', cssFamily: "'Major Mono Display', ui-monospace, monospace", family: 'Major Mono Display', role: 'mono', sample: 'odd machinery' },
  { id: 32, label: 'Bungee Shade', codropsName: 'lab', cssFamily: "'Bungee Shade', system-ui, sans-serif", family: 'Bungee Shade', role: 'display', sample: 'STACKED ECHO' },
  { id: 33, label: 'Codystar', codropsName: 'lab', cssFamily: "'Codystar', system-ui, sans-serif", family: 'Codystar', role: 'display', sample: 'dotted orbit' },
  { id: 34, label: 'Frijole', codropsName: 'lab', cssFamily: "'Frijole', system-ui, sans-serif", family: 'Frijole', role: 'display', sample: 'spicy myth' },
  { id: 35, label: 'Wallpoet', codropsName: 'lab', cssFamily: "'Wallpoet', system-ui, sans-serif", family: 'Wallpoet', role: 'stencil', sample: 'alley stencil' },
  // Lab — elegant / futuristic (Megrim-adjacent geometry with more weight)
  { id: 36, label: 'Orbitron', codropsName: 'lab', cssFamily: "'Orbitron', system-ui, sans-serif", family: 'Orbitron', role: 'display', sample: 'ORBIT GATE' },
  { id: 37, label: 'Tomorrow', codropsName: 'lab', cssFamily: "'Tomorrow', system-ui, sans-serif", family: 'Tomorrow', role: 'display', sample: 'forward signal' },
  { id: 38, label: 'Turret Road', codropsName: 'lab', cssFamily: "'Turret Road', system-ui, sans-serif", family: 'Turret Road', role: 'display', sample: 'TURRET LINE' },
  { id: 39, label: 'Goldman', codropsName: 'lab', cssFamily: "'Goldman', system-ui, sans-serif", family: 'Goldman', role: 'display', sample: 'GOLDEN GRID' },
  { id: 40, label: 'Audiowide', codropsName: 'lab', cssFamily: "'Audiowide', system-ui, sans-serif", family: 'Audiowide', role: 'display', sample: 'AUDIO WAVE' },
  { id: 41, label: 'Oxanium', codropsName: 'lab', cssFamily: "'Oxanium', system-ui, sans-serif", family: 'Oxanium', role: 'display', sample: 'oxide horizon' },
  { id: 42, label: 'Aldrich', codropsName: 'lab', cssFamily: "'Aldrich', system-ui, sans-serif", family: 'Aldrich', role: 'display', sample: 'wireframe solid' },
  { id: 43, label: 'Space Grotesk', codropsName: 'lab', cssFamily: "'Space Grotesk', system-ui, sans-serif", family: 'Space Grotesk', role: 'sans', sample: 'Quiet Futures' },
  { id: 44, label: 'Bruno Ace', codropsName: 'lab', cssFamily: "'Bruno Ace', system-ui, sans-serif", family: 'Bruno Ace', role: 'display', sample: 'ACE VECTOR' },
  { id: 45, label: 'Jura', codropsName: 'lab', cssFamily: "'Jura', system-ui, sans-serif", family: 'Jura', role: 'display', sample: 'geometry held' },
  { id: 46, label: 'Italiana', codropsName: 'lab', cssFamily: "'Italiana', Georgia, serif", family: 'Italiana', role: 'serif', sample: 'Evening Atlas' },
  { id: 47, label: 'Marcellus', codropsName: 'lab', cssFamily: "'Marcellus', Georgia, serif", family: 'Marcellus', role: 'serif', sample: 'Marble Quiet' },
  { id: 48, label: 'Gilda Display', codropsName: 'lab', cssFamily: "'Gilda Display', Georgia, serif", family: 'Gilda Display', role: 'serif', sample: 'Soft Empire' },
  { id: 49, label: 'Cinzel', codropsName: 'lab', cssFamily: "'Cinzel', Georgia, serif", family: 'Cinzel', role: 'serif', sample: 'STONE ORBIT' },
]

export const DISPLAY_FACE_ROLE_OPTIONS = [
  { value: 'all', label: 'All faces' },
  { value: 'serif', label: 'Serif' },
  { value: 'sans', label: 'Sans' },
  { value: 'display', label: 'Display' },
  { value: 'stencil', label: 'Stencil' },
  { value: 'mono', label: 'Mono' },
  { value: 'variable', label: 'Variable-like' },
] as const

/** Non-face typography treatments — Codrops title modifiers plus simple text specimens. */
export const DISPLAY_TYPE_TREATMENTS: readonly DisplayTypeTreatment[] = [
  { id: 'title', label: 'Display title', sourceClass: 'content__title', sample: 'A title in motion', purpose: 'Centered stacked display treatment' },
  { id: 'left', label: 'Left title', sourceClass: 'content__title--left', sample: 'Aligned left', purpose: 'Left-aligned title arrangement' },
  { id: 'right', label: 'Right title', sourceClass: 'content__title--right', sample: 'Aligned right', purpose: 'Right-aligned title arrangement' },
  { id: 'sides', label: 'Split sides', sourceClass: 'content__title--sides', sample: 'Opposing sides', purpose: 'First line starts left; final line ends right' },
  { id: 'height', label: 'Open leading', sourceClass: 'font-height', sample: 'The Routine', purpose: 'Expanded 1.4 line-height' },
  { id: 'height-medium', label: 'Tight leading', sourceClass: 'font-height-medium', sample: 'Feel with heart', purpose: 'Compact 0.9 line-height' },
  { id: 'medium', label: 'Medium display', sourceClass: 'font-medium', sample: 'Liberation', purpose: 'Six-vw source display scale' },
  { id: 'larger', label: 'Oversized display', sourceClass: 'font-larger', sample: 'Human', purpose: 'Twenty-seven-vw source hero scale' },
  { id: 'upper', label: 'Uppercase', sourceClass: 'font-upper', sample: 'Cosmic Symphony', purpose: 'Uppercase transformation' },
  { id: 'sub', label: 'Display subline', sourceClass: 'font-sub', sample: 'Transportation', purpose: 'Smaller separated display line' },
  { id: 'small', label: 'Prose passage', sourceClass: 'font-small', sample: 'Meaning lives between the words.', purpose: 'Small prose treatment used by set two', scale: 'text' },
  { id: 'body', label: 'Regular', sourceClass: 'p', sample: 'Regular body copy for reading.', purpose: 'Plain paragraph text at body scale', scale: 'text' },
  { id: 'subheading', label: 'Subheading', sourceClass: 'h3', sample: 'A clear subheading', purpose: 'Section subheading between title and body', scale: 'text' },
  { id: 'bold', label: 'Bold', sourceClass: 'strong', sample: 'Bold emphasis in a sentence.', purpose: 'Strong / bold weight', scale: 'text' },
  { id: 'italic', label: 'Italic', sourceClass: 'em', sample: 'Italic emphasis in a sentence.', purpose: 'Emphasis / italic style', scale: 'text' },
  { id: 'underline', label: 'Underline', sourceClass: 'u', sample: 'Underlined text for links or stress.', purpose: 'Underline decoration', scale: 'text' },
]

export const THEME_DISPLAY_FACE_OVERRIDE_KEY = 'theme_display_face_override'

export function getDisplayFace(id: number): DisplayFace | undefined {
  return DISPLAY_FACES.find((face) => face.id === id)
}
