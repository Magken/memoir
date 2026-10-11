import {
  countAnswerSeekingAsks,
  ensureTalkMarkdownEmphasisSpacing,
  stripToFinalAsk,
} from './stripToFinalAsk'

export { countAnswerSeekingAsks, ensureTalkMarkdownEmphasisSpacing, stripToFinalAsk }

/** Homework/agenda register that overrode conversational mid-opens. */
export function softenDemandingRegister(text: string): string {
  return text
    .replace(/^We're now on\b/gim, "Let's talk about")
    .replace(/(^|\n)I need (a specific|one concrete|you to|a real)\b/gim, "$1I'm hoping for $2")
    .trim()
}

/**
 * FE mirror of Edge scrubContinuingDayOpen — strip day-1 re-intro on later Talk opens.
 */
export function scrubContinuingDayOpen(text: string): string {
  let t = text.replace(/[\u2014\u2013]/g, '-').trim()
  t = t.replace(/^Hi\b[^.?!]{0,120}\bI'?m\b[^.?!]+[.?!]\s*/i, '')
  t = t.replace(/^Hi\b[^.?!]{0,80}[.?!]\s*/i, '')
  t = t.replace(/^I'?m\s+\w+[^.?!]*your interviewer for today[.?!]\s*/i, '')
  t = t.replace(/\bI'?m\s+\w+,\s+your interviewer for today[.?!]\s*/gi, '')
  t = t.replace(/^Thanks for joining[.?!]\s*/i, '')
  t = t.replace(/\bThanks for joining[.?!]\s*/gi, '')
  t = t.replace(/^Good to meet you[.?!]\s*/i, '')
  t = t.replace(/^Nice to meet you[.?!]\s*/i, '')
  t = t.replace(/^\w+\s+here\s*-\s*\w+[^.?!]*[.?!]\s*/i, '')
  t = t.replace(/^I noticed you'?re\b[^.?!]+[.?!]\s*/i, '')
  t = t.replace(/^I noticed your\b[^.?!]+[.?!]\s*/i, '')
  t = t.replace(/^Looking at your work at\b[^.?!]+,\s*/i, '')
  t = t.replace(/\bIs \w+ the right name to use\??\s*/gi, '')
  t = t.replace(/^Still \w+[^.?!]*\??\s*/i, '')
  t = t.replace(
    /\bIn these conversations?,?\s+I('ll| will) ask about real (experiences|situations)[^.?!]*[.?!]\s*/gi,
    '',
  )
  t = t.replace(
    /\bI('ll| will) ask about real (experiences|situations)[^.?!]*(no single right answer|there isn'?t one right answer)[^.?!]*[.?!]\s*/gi,
    '',
  )
  t = t.replace(
    /\b(this is|these are) (a )?behavioral[^.?!]*(follow-?ups?)[^.?!]*[.?!]\s*/gi,
    '',
  )
  t = t.replace(
    /\bthere (isn'?t|is no) (one |a )?single right answer[^.?!]*[.?!]\s*/gi,
    '',
  )
  t = t.replace(/\band I may dig[^.?!]*follow-?ups?[^.?!]*[.?!]\s*/gi, '')
  t = t.replace(/^We're starting with\b[^.?!]+[.?!]\s*/i, '')
  t = softenDemandingRegister(t)
  t = t.replace(/^This part is about how you\b[^.?!]+[.?!]\s*/i, '')
  t = t.replace(/^This part is about\b[^.?!]*(take responsibility|drive results|strong answers)[^.?!]*[.?!]\s*/i, '')
  t = t.replace(/^This section matters\b[^.?!]+[.?!]\s*/i, '')
  t = t.replace(/^Strong answers\b[^.?!]+[.?!]\s*/i, '')
  t = t.replace(/^Welcome to the (discussion|talk|coding|form|writing) section\b[^.?!]*[.?!]\s*/i, '')
  t = t.replace(/^Can you (please )?(briefly )?describe\b/i, 'Tell me about')
  t = t.replace(/^Describe a recent\b/i, 'Walk me through a recent')
  t = t.replace(/^Describe\b/i, 'Walk me through')
  t = t.replace(/^Earlier you\b[^.?!]+[.?!]\s*Now[,.]?\s+/i, '')
  // Preserve Markdown newlines — never flatten ### / lists / > to one line.
  return ensureTalkMarkdownEmphasisSpacing(
    t
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]{2,}/g, ' ')
      .trim(),
  )
}

export function looksLikeDay1Reintro(text: string): boolean {
  const t = text.replace(/\s+/g, ' ').trim()
  if (!t) return false
  if (/^Hi\b/i.test(t)) return true
  if (/\bI'?m\b.+\byour interviewer for today\b/i.test(t)) return true
  if (/\bThanks for joining\b/i.test(t)) return true
  if (/\bIs \w+ the right name to use\b/i.test(t)) return true
  if (/\bIn these conversations?,?\s+I('ll| will) ask about real\b/i.test(t)) return true
  return false
}
