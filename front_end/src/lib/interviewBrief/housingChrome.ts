/**
 * Creator-2 Contents housing chrome — Overview then Templates.
 * Same JSON as compose meta; not spine phases. Distinct from result `__result_overview__`.
 */
import { CREATOR_OVERVIEW_SECTION_ID } from './creatorOverviewTags'

export const ANALYSIS_TEMPLATES_SECTION_ID = '__analysis_templates__'
export const RESULT_OVERVIEW_SECTION_ID = '__result_overview__'

export const HOUSING_CHROME_TITLES: Readonly<Record<string, string>> = {
  [CREATOR_OVERVIEW_SECTION_ID]: 'Overview',
  [ANALYSIS_TEMPLATES_SECTION_ID]: 'Templates',
}

export function housingChromeTitle(id: string): string | undefined {
  const key = String(id ?? '').trim()
  return HOUSING_CHROME_TITLES[key]
}

/** Seed Open/Scroll labels so housing ids never humanize as "creator overview". */
export function seedHousingChromeTitles(map: Map<string, string> = new Map()): Map<string, string> {
  for (const [id, title] of Object.entries(HOUSING_CHROME_TITLES)) {
    if (!map.has(id)) map.set(id, title)
  }
  return map
}
