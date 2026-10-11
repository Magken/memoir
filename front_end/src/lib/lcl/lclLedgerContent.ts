/**
 * Ledger sample: six lights. Frame srcs are local SVG files.
 */

export const LCL_LEDGER_COASTS = ['All', 'North', 'West', 'Isles'] as const
export type LclLedgerCoast = Exclude<(typeof LCL_LEDGER_COASTS)[number], 'All'>

export type LclLedgerView = {
  id: string
  label: string
  src: string
  caption: string
}

export type LclLedgerRow = {
  id: string
  name: string
  coast: LclLedgerCoast
  lit: number
  heightM: number
  rangeNm: number
  keeper: string
  note: string
  views: LclLedgerView[]
}

function frame(file: string): string {
  return new URL(`../../assets/lcl/ledger/${file}`, import.meta.url).href
}

export const LCL_LEDGER_ROWS: readonly LclLedgerRow[] = [
  {
    id: 'vey-point',
    name: 'Vey Point',
    coast: 'North',
    lit: 1791,
    heightM: 38,
    rangeNm: 18,
    keeper: 'I. Marren',
    note: 'A squat white tower on the north cliff. The lamp still uses a clockwork screen.',
    views: [
      { id: 'north', label: 'North face', src: frame('vey-north.svg'), caption: 'White tower against the north cliff.' },
      { id: 'lamp', label: 'Lamp room', src: frame('vey-lamp.svg'), caption: 'Clockwork screen over the lamp.' },
      { id: 'stair', label: 'Stair', src: frame('vey-stair.svg'), caption: 'Iron stair wrapping the shaft.' },
    ],
  },
  {
    id: 'marrow-head',
    name: 'Marrow Head',
    coast: 'West',
    lit: 1820,
    heightM: 52,
    rangeNm: 22,
    keeper: 'R. Solway',
    note: 'Tallest on the west reach. Keepers still sign the log by hand.',
    views: [
      { id: 'north', label: 'North face', src: frame('marrow-north.svg'), caption: 'Tall shaft on the west reach.' },
      { id: 'lamp', label: 'Lamp room', src: frame('marrow-lamp.svg'), caption: 'Fresnel cage above the west water.' },
      { id: 'dusk', label: 'At dusk', src: frame('marrow-dusk.svg'), caption: 'The beam at last light.' },
    ],
  },
  {
    id: 'kestrel-rock',
    name: 'Kestrel Rock',
    coast: 'Isles',
    lit: 1844,
    heightM: 24,
    rangeNm: 14,
    keeper: 'N. Pell',
    note: 'A low light on a skerry. Storms close the landing for weeks.',
    views: [
      { id: 'north', label: 'North face', src: frame('kestrel-north.svg'), caption: 'Low tower on the skerry.' },
      { id: 'lamp', label: 'Lamp room', src: frame('kestrel-lamp.svg'), caption: 'A small cage above a wet deck.' },
      { id: 'stair', label: 'Stair', src: frame('kestrel-stair.svg'), caption: 'Open stair to the lamp.' },
    ],
  },
  {
    id: 'ansel-light',
    name: 'Ansel Light',
    coast: 'North',
    lit: 1874,
    heightM: 41,
    rangeNm: 20,
    keeper: 'E. Wren',
    note: 'Red band on white. The north channel still takes its heading from here.',
    views: [
      { id: 'north', label: 'North face', src: frame('ansel-north.svg'), caption: 'Red band on a white shaft.' },
      { id: 'lamp', label: 'Lamp room', src: frame('ansel-lamp.svg'), caption: 'Glass cage over the north channel.' },
      { id: 'dusk', label: 'At dusk', src: frame('ansel-dusk.svg'), caption: 'The heading light at dusk.' },
    ],
  },
  {
    id: 'tern-spit',
    name: 'Tern Spit',
    coast: 'West',
    lit: 1902,
    heightM: 19,
    rangeNm: 12,
    keeper: 'S. Cale',
    note: 'A short light at the spit. Birds nest in the lee of the store.',
    views: [
      { id: 'north', label: 'North face', src: frame('tern-north.svg'), caption: 'Short light at the spit.' },
      { id: 'lamp', label: 'Lamp room', src: frame('tern-lamp.svg'), caption: 'Open cage above the sand.' },
      { id: 'stair', label: 'Stair', src: frame('tern-stair.svg'), caption: 'Twelve steps to the lamp.' },
    ],
  },
  {
    id: 'hollow-reach',
    name: 'Hollow Reach',
    coast: 'Isles',
    lit: 1960,
    heightM: 33,
    rangeNm: 16,
    keeper: 'T. Voss',
    note: 'Concrete from the last rebuild. The old stone drum still sits beside it.',
    views: [
      { id: 'north', label: 'North face', src: frame('hollow-north.svg'), caption: 'Concrete shaft beside the old drum.' },
      { id: 'lamp', label: 'Lamp room', src: frame('hollow-lamp.svg'), caption: 'Electric cage, still kept by hand.' },
      { id: 'dusk', label: 'At dusk', src: frame('hollow-dusk.svg'), caption: 'The reach at last light.' },
    ],
  },
]

export const LCL_LEDGER_REST_NOTE = 'Point at a light to read it.'
export const LEDGER_LEAVE_KEYS = ['stats', 'tbody', 'thead', 'kicker', 'note'] as const

export function lclLedgerById(id: string): LclLedgerRow | undefined {
  return LCL_LEDGER_ROWS.find((row) => row.id === id)
}

export function lclLedgerFilter(coast: (typeof LCL_LEDGER_COASTS)[number]): readonly LclLedgerRow[] {
  if (coast === 'All') return LCL_LEDGER_ROWS
  return LCL_LEDGER_ROWS.filter((row) => row.coast === coast)
}
