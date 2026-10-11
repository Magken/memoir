export function linkUrlToFieldValue(url: string): string {
  return url.replace(/^https?:\/\//i, '')
}

export function fieldValueToLinkUrl(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}
