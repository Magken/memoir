/**
 * Deterministic Assessor Aid first bubble when Edge open is unavailable.
 * Hiring-manager read from this pack. Never a product tour or empty greeter.
 */
import type { AssessorAidReport } from './buildAssessorAidReport'

const TOUR =
  /\b(Happy to (help|walk)|Want me to|marking rail|sticky cards?|which grain|overlay|This pack is in front of you|This pack is the)\b/i

/** Results pack has enough of this attempt to speak a first bubble. */
export function aidReportIsReady(report: AssessorAidReport | null | undefined): boolean {
  if (!report) return false
  return Boolean(
    String(report.overallPercent ?? '').trim() ||
      String(report.thesis ?? report.summary ?? '').trim() ||
      (report.sections?.length ?? 0) > 0 ||
      (report.strengths?.length ?? 0) > 0 ||
      (report.risks?.length ?? 0) > 0 ||
      (report.followUps?.length ?? 0) > 0,
  )
}

export function composeAssessorAidOpenerUtterance(input: {
  report?: AssessorAidReport | null
  title?: string
}): string {
  const report = input.report ?? null
  const overall = String(report?.overallPercent ?? '').trim()
  const thesis = String(report?.thesis ?? report?.summary ?? '').trim()
  const hold = String(report?.strengths?.[0] ?? '').trim()
  const risk = String(report?.risks?.[0] ?? '').trim()
  const next = String(report?.followUps?.[0] ?? '').trim()
  const openSection =
    report?.sections?.find((row) => row.reading) || report?.sections?.[0] || null
  const leftover = String(openSection?.summary ?? '').trim()
  const sectionTitle = String(openSection?.title ?? '').trim()

  const leadParts = [overall ? `${overall} overall` : '', thesis].filter(Boolean)
  let lead = leadParts.join('. ')
  if (!lead && leftover) {
    lead = sectionTitle ? `${sectionTitle} leftover: ${leftover}` : leftover
  }

  const bullets = [
    hold ? `- **Hold** - ${hold}` : '',
    risk ? `- **Risk** - ${risk}` : '',
    next ? `- **Next** - ${next}` : '',
  ].filter(Boolean)

  if (!lead && !bullets.length) return ''

  const sentence = lead ? (/[.?!]$/.test(lead) ? lead : `${lead}.`) : ''
  const text = [
    "I'm Assessor Aid.",
    sentence,
    ...bullets,
    '',
    'Where do you want to start?',
  ]
    .filter((row) => row !== '')
    .join('\n')
    .replace(/[\u2014\u2013]/g, '-')
    .replace(/[ \t]+\n/g, '\n')
    .trim()

  if (TOUR.test(text)) return ''
  return text
}
