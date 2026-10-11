/**
 * Local list of packages under projects/. The /projects page reads this file.
 * When you add or rename a folder in projects/, add or rename the row here
 * in the same session.
 */
export type ProjectIndexEntry = {
  slug: string
  title: string
  summary: string
  folder: string
}

export const PROJECT_INDEX: ProjectIndexEntry[] = [
  {
    slug: 'gras_to_text',
    title: 'gras_to_text',
    summary: 'Measure a text and render how it is written.',
    folder: 'projects/gras_to_text/',
  },
]
