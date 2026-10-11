export type PickerOption = {
  value: string
  label: string
  disabled?: boolean
}

export type DateInputSeparator = '-' | '/'

export function detectDateSeparator(value: string): DateInputSeparator {
  const slash = value.indexOf('/')
  const dash = value.indexOf('-')
  if (slash >= 0 && (dash < 0 || slash < dash)) return '/'
  if (dash >= 0) return '-'
  return '-'
}

/** Insert `-` or `/` while typing — digits only, max YYYY-MM-DD / YYYY/MM/DD */
export function formatDateInputText(value: string): string {
  const sep = detectDateSeparator(value)
  const digits = value.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 4) return digits
  if (digits.length <= 6) return `${digits.slice(0, 4)}${sep}${digits.slice(4)}`
  return `${digits.slice(0, 4)}${sep}${digits.slice(4, 6)}${sep}${digits.slice(6)}`
}

/** Insert `:` while typing — digits only, max HH:MM */
export function formatTimeInputText(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}:${digits.slice(2)}`
}

export function isoDateComparable(parts: { year: number; month: number; day: number }): number {
  return parts.year * 10000 + (parts.month + 1) * 100 + parts.day
}

export function isValidIsoDate(value: string): boolean {
  return parseIsoDate(value) !== null
}

export function compareIsoDateStrings(a: string, b: string): number | null {
  const left = parseIsoDate(a)
  const right = parseIsoDate(b)
  if (!left || !right) return null
  return isoDateComparable(left) - isoDateComparable(right)
}

export const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const

export function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate()
}

export function parseIsoDate(value: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})[-/](\d{2})[-/](\d{2})$/.exec(value.trim())
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2]) - 1
  const day = Number(match[3])
  const parsed = new Date(year, month, day)

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month ||
    parsed.getDate() !== day
  ) {
    return null
  }

  return { year, month, day }
}

export function formatIsoDate(year: number, monthIndex: number, day: number): string {
  const month = String(monthIndex + 1).padStart(2, '0')
  const dayPart = String(day).padStart(2, '0')
  return `${year}-${month}-${dayPart}`
}

export function parseTimeValue(value: string): { hour: number; minute: number } | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value)
  if (!match) return null

  const hour = Number(match[1])
  const minute = Number(match[2])
  if (hour > 23 || minute > 59) return null
  return { hour, minute }
}

export function formatTimeValue(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

export function buildMonthOptions(): PickerOption[] {
  return MONTH_LABELS.map((label, index) => ({
    value: String(index),
    label,
  }))
}

export function buildYearOptions(minYear: number, maxYear: number): PickerOption[] {
  const options: PickerOption[] = []
  for (let year = minYear; year <= maxYear; year += 1) {
    options.push({ value: String(year), label: String(year) })
  }
  return options
}

export function buildDayOptions(year: number, monthIndex: number): PickerOption[] {
  const total = daysInMonth(year, monthIndex)
  return Array.from({ length: total }, (_, index) => {
    const day = index + 1
    return { value: String(day), label: String(day).padStart(2, '0') }
  })
}

export function buildHourOptions(): PickerOption[] {
  return Array.from({ length: 24 }, (_, hour) => ({
    value: String(hour),
    label: String(hour).padStart(2, '0'),
  }))
}

/** 12-hour clock values — `12`, `1` … `11` */
export function buildHour12Options(): PickerOption[] {
  return Array.from({ length: 12 }, (_, index) => {
    const hour12 = index === 0 ? 12 : index
    return {
      value: String(hour12),
      label: String(hour12).padStart(2, '0'),
    }
  })
}

export function buildMeridiemOptions(): PickerOption[] {
  return [
    { value: 'am', label: 'AM' },
    { value: 'pm', label: 'PM' },
  ]
}

export function hour12From24(hour24: number): number {
  const hour = hour24 % 12
  return hour === 0 ? 12 : hour
}

export function isPmHour(hour24: number): boolean {
  return hour24 >= 12
}

export function hour24From12(hour12: number, pm: boolean): number {
  if (pm) return hour12 === 12 ? 12 : hour12 + 12
  return hour12 === 12 ? 0 : hour12
}

export type TimePickerParts = {
  hour12: number
  minute: number
  meridiem: 'am' | 'pm'
}

export function timePartsFromValue(value: string): TimePickerParts {
  const parsed = parseTimeValue(value) ?? parseTimeValue(defaultTimeValue())!
  return {
    hour12: hour12From24(parsed.hour),
    minute: parsed.minute,
    meridiem: isPmHour(parsed.hour) ? 'pm' : 'am',
  }
}

export function formatTimeFromParts(parts: TimePickerParts): string {
  return formatTimeValue(hour24From12(parts.hour12, parts.meridiem === 'pm'), parts.minute)
}

export function hour12LoopLabel(index: number): string {
  return String((index % 12) || 12).padStart(2, '0')
}

export function hour12LoopValue(index: number): string {
  return String((index % 12) || 12)
}

export function minuteLoopLabel(index: number, loopSize = 60): string {
  const minute = index === loopSize ? 0 : index % 60
  return String(minute).padStart(2, '0')
}

export function minuteLoopValue(index: number, loopSize = 60): string {
  return String(index === loopSize ? 0 : index % 60)
}

export function buildMinuteOptions(step = 1): PickerOption[] {
  const options: PickerOption[] = []
  for (let minute = 0; minute < 60; minute += step) {
    options.push({
      value: String(minute),
      label: String(minute).padStart(2, '0'),
    })
  }
  return options
}

export function todayIsoDate(): string {
  const now = new Date()
  return formatIsoDate(now.getFullYear(), now.getMonth(), now.getDate())
}

export function defaultTimeValue(): string {
  return '09:00'
}
