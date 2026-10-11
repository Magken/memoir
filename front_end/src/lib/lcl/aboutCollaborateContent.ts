/**
 * About Text inset copy. No em dashes in reader copy.
 */

import { splitAboutDisplayTitle } from './aboutHomeContent'

export const ABOUT_COLLAB_DISPLAY = 'Collaborate with us'

export const ABOUT_COLLAB_INTRO =
  'We try to make collaborations as simple as possible. Propose projects, and together we explore and see how they fit.'

/** Two rows: Collaborate / with us. */
export function aboutCollabTitleRows(title = ABOUT_COLLAB_DISPLAY): readonly [string, string] {
  const lines = splitAboutDisplayTitle(title)
  if (lines.length === 2) return lines
  return [lines[0], '']
}

/** One nest row. The collaboration documents are not here yet. */
export const ABOUT_COLLAB_SOON = 'Coming soon'
