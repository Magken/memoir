/**
 * Atlas hover-column copy and timeline years.
 */

function frame(file: string): string {
  return new URL(`../../assets/lcl/atlas/${file}`, import.meta.url).href
}

export type LclAtlasPanel = {
  id: string
  title: string
  src: string
  lead: string
  body: string
}

export const LCL_ATLAS_PANELS: readonly LclAtlasPanel[] = [
  {
    id: 'tide',
    title: 'Tide',
    src: frame('tide.svg'),
    lead: 'The water writes the day.',
    body: 'Each panel starts as a sideways title. Hover opens the upright note and the frame.',
  },
  {
    id: 'salt',
    title: 'Salt',
    src: frame('salt.svg'),
    lead: 'Air that bites the lamp glass.',
    body: 'Narrow panels keep the sideways title. Only the wide one turns upright.',
  },
  {
    id: 'lamp',
    title: 'Lamp',
    src: frame('lamp.svg'),
    lead: 'A cage above the water.',
    body: 'Click the wide panel to push a crumb and fill the tile.',
  },
  {
    id: 'stone',
    title: 'Stone',
    src: frame('stone.svg'),
    lead: 'The drum the light sits on.',
    body: 'Leaving the tile keeps the last wide panel. It is sticky.',
  },
]

export const LCL_ATLAS_INDEX = ['Tide tables', 'Salt air', 'Lamp glass', 'Stone drum'] as const

export const LCL_ATLAS_TERMS = [
  { id: 'reach', label: 'reach', note: 'A stretch of water a light is built to cover.' },
  { id: 'cage', label: 'cage', note: 'The glass house around the lamp.' },
] as const

export const LCL_ATLAS_YEARS = [
  { year: 1791, label: 'First lamp', count: 1 },
  { year: 1820, label: 'West rebuild', count: 3 },
  { year: 1874, label: 'Red band', count: 5 },
  { year: 1902, label: 'Spit light', count: 8 },
  { year: 1960, label: 'Concrete drum', count: 12 },
] as const
