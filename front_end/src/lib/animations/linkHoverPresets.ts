/** Codrops Line Hover Styles — theme port presets */

export const LINK_HOVER_PRESETS = [
  { id: 'metis', label: 'Metis', purpose: 'Underline scales in from the left', needsSvg: undefined, sample: 'About us' },
  { id: 'io', label: 'Io', purpose: 'Dual underlines cross on hover', needsSvg: undefined, sample: 'Shop the look' },
  { id: 'thebe', label: 'Thebe', purpose: 'Thick top line + delayed bottom', needsSvg: undefined, sample: 'Track package' },
  { id: 'leda', label: 'Leda', purpose: 'Text slides out; data-text slides in', needsSvg: undefined, sample: 'Our Philosophy' },
  { id: 'ersa', label: 'Ersa', purpose: 'Center strike + scale-up text', needsSvg: undefined, sample: 'Downloads' },
  { id: 'elara', label: 'Elara', purpose: 'Underline splits via clip-path', needsSvg: undefined, sample: 'Studio' },
  { id: 'dia', label: 'Dia', purpose: 'Two fading underlines stagger in', needsSvg: undefined, sample: 'Portfolio' },
  { id: 'kale', label: 'Kale', purpose: 'Block line animates up then settles', needsSvg: undefined, sample: 'Explore more' },
  { id: 'carpo', label: 'Carpo', purpose: 'Top grows, bottom shrinks', needsSvg: undefined, sample: 'Blog' },
  { id: 'helike', label: 'Helike', purpose: 'Glitch text + glitch line', needsSvg: undefined, sample: 'Discover' },
  { id: 'mneme', label: 'Mneme', purpose: 'Cover wipe then thin underline', needsSvg: undefined, sample: 'Inquiries' },
  { id: 'iocaste', label: 'Iocaste', purpose: 'SVG wave slides under text', needsSvg: 'wave' as const, sample: 'Learn more' },
  { id: 'herse', label: 'Herse', purpose: 'SVG arc stroke draws on hover', needsSvg: 'arc' as const, sample: 'Sign up' },
  { id: 'carme', label: 'Carme', purpose: 'SVG scribble stroke draws', needsSvg: 'scribble' as const, sample: 'Writings' },
  { id: 'eirene', label: 'Eirene', purpose: 'Pill underline flattens; text drops', needsSvg: undefined, sample: 'Contact' },
] as const

export type LinkHoverPresetId = (typeof LINK_HOVER_PRESETS)[number]['id']
export type LinkHoverSvgKind = NonNullable<(typeof LINK_HOVER_PRESETS)[number]['needsSvg']>
