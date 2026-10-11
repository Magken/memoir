/**
 * ISO country dial codes — spacing hints for phoneFormat (longest-prefix match).
 * Labels stay text-only (no flag emoji). Dial is digits without `+`.
 */

export type CountryDialCode = {
  /** Lowercase ISO 3166-1 alpha-2 */
  iso: string
  name: string
  /** ITU dial digits without leading `+` */
  dial: string
}

export const COUNTRY_DIAL_CODES: readonly CountryDialCode[] = [
  { iso: 'au', name: 'Australia', dial: '61' },
  { iso: 'at', name: 'Austria', dial: '43' },
  { iso: 'be', name: 'Belgium', dial: '32' },
  { iso: 'bj', name: 'Benin', dial: '229' },
  { iso: 'br', name: 'Brazil', dial: '55' },
  { iso: 'bf', name: 'Burkina Faso', dial: '226' },
  { iso: 'cm', name: 'Cameroon', dial: '237' },
  { iso: 'ca', name: 'Canada', dial: '1' },
  { iso: 'td', name: 'Chad', dial: '235' },
  { iso: 'ci', name: "Côte d'Ivoire", dial: '225' },
  { iso: 'cd', name: 'DR Congo', dial: '243' },
  { iso: 'eg', name: 'Egypt', dial: '20' },
  { iso: 'et', name: 'Ethiopia', dial: '251' },
  { iso: 'fr', name: 'France', dial: '33' },
  { iso: 'de', name: 'Germany', dial: '49' },
  { iso: 'gh', name: 'Ghana', dial: '233' },
  { iso: 'in', name: 'India', dial: '91' },
  { iso: 'ie', name: 'Ireland', dial: '353' },
  { iso: 'it', name: 'Italy', dial: '39' },
  { iso: 'jp', name: 'Japan', dial: '81' },
  { iso: 'ke', name: 'Kenya', dial: '254' },
  { iso: 'lr', name: 'Liberia', dial: '231' },
  { iso: 'ml', name: 'Mali', dial: '223' },
  { iso: 'mx', name: 'Mexico', dial: '52' },
  { iso: 'ma', name: 'Morocco', dial: '212' },
  { iso: 'nl', name: 'Netherlands', dial: '31' },
  { iso: 'ne', name: 'Niger', dial: '227' },
  { iso: 'ng', name: 'Nigeria', dial: '234' },
  { iso: 'pt', name: 'Portugal', dial: '351' },
  { iso: 'rw', name: 'Rwanda', dial: '250' },
  { iso: 'sn', name: 'Senegal', dial: '221' },
  { iso: 'sg', name: 'Singapore', dial: '65' },
  { iso: 'za', name: 'South Africa', dial: '27' },
  { iso: 'es', name: 'Spain', dial: '34' },
  { iso: 'se', name: 'Sweden', dial: '46' },
  { iso: 'ch', name: 'Switzerland', dial: '41' },
  { iso: 'tz', name: 'Tanzania', dial: '255' },
  { iso: 'tg', name: 'Togo', dial: '228' },
  { iso: 'ug', name: 'Uganda', dial: '256' },
  { iso: 'ae', name: 'United Arab Emirates', dial: '971' },
  { iso: 'gb', name: 'United Kingdom', dial: '44' },
  { iso: 'us', name: 'United States', dial: '1' },
  { iso: 'zm', name: 'Zambia', dial: '260' },
  { iso: 'zw', name: 'Zimbabwe', dial: '263' },
] as const

export function getCountryDialCode(iso: string): CountryDialCode | undefined {
  return COUNTRY_DIAL_CODES.find((entry) => entry.iso === iso)
}
