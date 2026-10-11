/**
 * Type layout specimens.
 */

export const LCL_TYPE_SPECIMENS = [
  'Decode',
  'Marker',
  'Strike',
  'Case',
  'Quote',
  'Notes',
] as const

export type LclTypeSpecimen = (typeof LCL_TYPE_SPECIMENS)[number]

export const LCL_TYPE_COPY = {
  decode: 'HARBOR LIGHT',
  marker: 'the quiet heat of the lamp',
  strikeOld: 'coal',
  strikeNew: 'oil',
  strikeLead: 'the light was',
  strikeTail: 'fired',
  caseWord: 'Harbor',
  quote: 'Keep the lamp winding. The water does not wait.',
  quoteBy: 'I. Marren, Vey Point',
  notes: 'The north channel still takes its heading from here.',
  footnote: 'Ansel, 1874 log.',
} as const
