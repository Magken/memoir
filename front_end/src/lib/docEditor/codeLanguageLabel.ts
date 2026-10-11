import { getCodeLanguageOptions, normalizeCodeLanguage } from '@lexical/code'

const CODE_LANGUAGE_OPTIONS: [string, string][] = getCodeLanguageOptions()

export function codeLanguageDisplayLabel(language: string): string {
  const normalized = normalizeCodeLanguage(language || '')
  return CODE_LANGUAGE_OPTIONS.find(([value]) => value === normalized)?.[1] ?? 'Plain text'
}

export const CODE_LANGUAGE_MENU_ITEMS = CODE_LANGUAGE_OPTIONS.map(([value, name]) => ({
  id: value,
  label: name,
}))
