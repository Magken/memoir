export const CARD_CORNER_GEOMETRIES = [
  'square',
  'sharp',
  'round',
  'soft',
  'asymmetric',
  'tab',
  'chamfer',
  'notch',
] as const

export type CardCornerGeometry = (typeof CARD_CORNER_GEOMETRIES)[number]

export const DEFAULT_CARD_CORNER_GEOMETRY: CardCornerGeometry = 'square'

const cornerClass: Record<CardCornerGeometry, string> = {
  square: '',
  sharp: 'theme-card--corner-sharp',
  round: 'theme-card--corner-round',
  soft: 'theme-card--corner-soft',
  asymmetric: 'theme-card--corner-asymmetric',
  tab: 'theme-card--corner-tab',
  chamfer: 'theme-card--corner-chamfer',
  notch: 'theme-card--corner-notch',
}

export function cornerGeometryClass(geometry: CardCornerGeometry): string {
  return cornerClass[geometry]
}
