/**
 * Footer links on `/`. No em dashes in reader copy.
 */

export const FOOTER_HOME_LABEL = 'home'

export const FOOTER_LINKS = [
  { id: 'who', label: 'who are we ?' },
  { id: 'work', label: 'how we work' },
  { id: 'collaborate', label: 'Collaborate with us' },
  { id: 'projects', label: 'Projects' },
] as const

export type FooterLinkId = (typeof FOOTER_LINKS)[number]['id']

export const FOOTER_MARK = 'GRAS'

export const FOOTER_COPYRIGHT = '© 2026'
