/**
 * Candidate-turn signal classifiers for local Talk decide.
 * Compose utterances come from Edge interview-talk-turn — not a FE sample bank.
 *
 * Signals classify speech acts so compose can pick craft packs — never hardcode
 * a canned reply per greeting string.
 */
import type { CandidateSignal } from './talkTypes'

/** Strip trailing smash punctuation so "hi'" / "hello." still classify cleanly. */
function normalizeCandidateText(t: string): string {
  return t
    .trim()
    .replace(/^['"`]+|['"`.,!?\]})]+$/g, '')
    .trim()
}

/**
 * Short phatic / social turns (greeting, thanks, wellbeing, brief apology).
 * Principle: this is conversation, not smash-key noise — compose must meld, not ignore.
 */
function looksSocialRapport(t: string): boolean {
  const trimmed = normalizeCandidateText(t)
  if (!trimmed) return false
  const words = trimmed.split(/\s+/).filter(Boolean)
  if (words.length > 12) return false
  // Speech-act shapes only — not a reply script for any one string.
  if (
    /^(hi+|hii+|hello|hey+|yo|howdy|hiya|sup|good\s*(morning|afternoon|evening)|thanks?(?:\s+you)?|thank\s+you|thx|ty|cheers|sorry|my\s+bad|excuse\s+me|one\s+(sec|second|moment)|hang\s+on|hold\s+on|how\s+are\s+you(?:\s+doing)?|how'?s\s+it\s+going|what'?s\s+up|nice\s+to\s+meet\s+you|good\s+to\s+(be\s+here|meet\s+you)|i'?m\s+(here|ready)|ok(?:ay)?\s+(thanks|then))\b/i.test(
      trimmed,
    )
  ) {
    return true
  }
  if (
    words.length <= 12 &&
    /\b(how are you(?: doing)?|how'?s it going|nice to meet you|good to (?:be here|meet you)|thanks(?: you)?|thank you)\b/i.test(
      trimmed,
    )
  ) {
    return true
  }
  return false
}

/** Yeah / ok / sure — thin agreement, not smash noise. */
function looksPhaticAck(t: string): boolean {
  const trimmed = normalizeCandidateText(t)
  return /^(yes|yeah|yep|yup|no|nah|nope|ok|okay|sure|maybe|right|alright|k)[.!?]?$/i.test(
    trimmed,
  )
}

const WEAK_CONTENT = new Set([
  'stuff',
  'things',
  'somehow',
  'various',
  'basically',
  'something',
  'handled',
  'worked',
  'happened',
  'together',
  'shipped',
  'decided',
  'doing',
  'trying',
  'going',
  'kind',
  'sort',
  'team',
  'group',
  'nothing',
  'whatever',
])

/** A named hook (project, incident, metric) — not hedges / weak verbs. */
export function looksContentHook(text: string): boolean {
  const t = normalizeCandidateText(text)
  if (!t) return false
  if (/\d/.test(t)) return true
  const words = t.split(/\s+/).filter(Boolean)
  return words.some((w) => {
    const n = w.replace(/[^a-z]/gi, '').toLowerCase()
    return n.length >= 6 && !WEAK_CONTENT.has(n)
  })
}

export function candidateWordCount(text: string): number {
  return normalizeCandidateText(text).split(/\s+/).filter(Boolean).length
}

/**
 * 1–3 word replies, phatic acks, empty non-answers, or hedge-only lines
 * with no named hook. Compose should stretch (elastic), not ownership-deepen.
 */
export function isThinUtterance(
  text: string,
  signals: readonly string[] = [],
): boolean {
  if (
    signals.includes('social_rapport') ||
    signals.includes('gibberish') ||
    signals.includes('meta_clarify') ||
    signals.includes('ask_for_example')
  ) {
    return false
  }
  const words = candidateWordCount(text)
  if (looksPhaticAck(text) || words <= 3) return true
  if (signals.includes('non_answer') && words <= 6) return true
  if (signals.includes('vague') && words < 8 && !looksContentHook(text)) return true
  return false
}

const NOT_A_NAME = new Set([
  'nothing',
  'whatever',
  'skip',
  'pass',
  'idk',
  'none',
  'n/a',
  'na',
  'boredom',
  'boredorm',
  'life',
  'stuff',
  'things',
  'yes',
  'yeah',
  'yep',
  'yup',
  'no',
  'nah',
  'nope',
  'ok',
  'okay',
  'sure',
  'maybe',
  'right',
  'alright',
])

function extractOfferedName(text: string): string | null {
  const t = normalizeCandidateText(text)
  const labeled =
    t.match(
      /\b(?:call me|it'?s|use|i(?:'?m| am))\s+([A-Za-z][A-Za-z'-]{0,23})\b/i,
    )
  if (labeled) {
    const n = labeled[1]?.trim()
    if (n && !NOT_A_NAME.has(n.toLowerCase())) return n
  }
  const words = t.split(/\s+/).filter(Boolean)
  if (words.length === 1) {
    const n = words[0].replace(/[^A-Za-z'-]/g, '')
    if (n.length >= 2 && n.length <= 24 && !NOT_A_NAME.has(n.toLowerCase())) return n
  }
  if (words.length === 2 && /^(no|nah|nope)$/i.test(words[0])) {
    const n = words[1].replace(/[^A-Za-z'-]/g, '')
    if (n.length >= 2 && n.length <= 24 && !NOT_A_NAME.has(n.toLowerCase())) return n
  }
  return null
}

export type NameCheckReplyKind = 'affirm' | 'reject' | 'name' | 'other'

/** Classify the candidate reply to "Is {preferred} the right name to use?" */
export function classifyNameCheckReply(text: string): {
  kind: NameCheckReplyKind
  name?: string
} {
  const t = normalizeCandidateText(text)
  if (!t) return { kind: 'other' }
  const offered = extractOfferedName(t)
  if (offered) return { kind: 'name', name: offered }
  if (
    /^(yes|yeah|yep|yup|ya|sure|ok|okay|correct|right|that'?s fine|that is fine|it is)[.!?]?$/i.test(
      t,
    )
  ) {
    return { kind: 'affirm' }
  }
  if (
    /^(no|nah|nope|not really|not that|wrong)[.!?]?$/i.test(t) ||
    /^(no|nah|nope)\b/i.test(t)
  ) {
    return { kind: 'reject' }
  }
  return { kind: 'other' }
}

function looksGibberish(t: string): boolean {
  const trimmed = normalizeCandidateText(t)
  if (!trimmed) return true
  if (looksSocialRapport(trimmed)) return false
  if (looksPhaticAck(trimmed)) return false
  if (looksContentHook(trimmed)) return false
  if (/^(sdf+|asdf+|qwer+|zxcv+|aaa+|bbb+|xxx+|test+|lmao+|hhh+|mmm+)$/i.test(trimmed)) {
    return true
  }
  const words = trimmed.split(/\s+/).filter(Boolean)
  if (words.length <= 2) {
    const letters = trimmed.replace(/[^a-z]/gi, '')
    if (letters.length > 0 && letters.length < 6) {
      const vowels = (letters.match(/[aeiou]/gi) || []).length
      if (vowels / letters.length < 0.2) return true
    }
    if (
      words.every(
        (w) =>
          w.length <= 5 &&
          !/^(yes|no|ok|i|me|we|my|n\/a|idk|none|pass)$/i.test(w) &&
          !/\d/.test(w),
      ) &&
      !/\b(i|we|my|our)\b/i.test(trimmed)
    ) {
      return true
    }
  }
  return false
}

function looksNonAnswer(t: string): boolean {
  const trimmed = normalizeCandidateText(t)
  if (looksSocialRapport(trimmed)) return false
  if (looksPhaticAck(trimmed)) return false
  if (
    /^(idk|i don'?t know|not sure|no idea|nothing|n\/a|na|pass|skip|whatever|dunno)[.!?]?$/i.test(
      trimmed,
    )
  ) {
    return true
  }
  if (looksContentHook(trimmed)) return false
  if (trimmed.split(/\s+/).length <= 3 && !/\b(i|we|my)\b/i.test(trimmed) && !/\d/.test(trimmed)) {
    return !/^(yes|no|ok)[.!?]?$/i.test(trimmed)
  }
  return false
}

function looksMetaClarify(t: string): boolean {
  return /\b(which project|which (one|role|team|job)|what (are|do) you (mean|saying|asking)|what do you mean|can you (repeat|rephrase|clarify)|i (do not|don'?t) (follow|understand)|huh\??|who are you|who'?s interviewing|are you (a |an )?(bot|human|ai|real)|what am i (here|doing) for|why (am i|are we|do we) (here|doing)|what is this (for|about)|what('s| is) the point( of (this|the interview))?|what are we doing here|is this (recorded|timed)|how long (is|will) this|do i have to answer|did you (not |already )?ask|you did( not|'?t)? ask|you (already |just )?ask(ed)?|you (said|asked) (that|this) already|(feels?|seem)s? repetitive|ask(ing)? (this|that) again)\b/i.test(
    t,
  )
}

function looksAskForExample(t: string): boolean {
  return /\b(can you (give|share) (an |a )?(example|sample)|for example\??|like what\??|what do you mean by|give me an example|show me what you mean)\b/i.test(
    t,
  )
}

export function classifyCandidateSignals(text: string): CandidateSignal[] {
  const t = text.trim()
  const signals: CandidateSignal[] = []
  if (looksSocialRapport(t)) signals.push('social_rapport')
  if (looksGibberish(t)) signals.push('gibberish')
  if (looksNonAnswer(t)) signals.push('non_answer')
  if (looksMetaClarify(t)) signals.push('meta_clarify')
  if (looksAskForExample(t)) signals.push('ask_for_example')
  if (t.length < 48) signals.push('short')
  if (/\bwe\b|\bour\b|\bteam\b/i.test(t) && !/\bi\b|\bmy\b/i.test(t)) {
    signals.push('collective_we')
  }
  if (/\?/.test(t)) signals.push('question')
  if (
    /\b(stuff|things|somehow|various|basically|kind of|sort of)\b/i.test(t) ||
    (t.length < 90 &&
      !/\d/.test(t) &&
      !looksContentHook(t) &&
      !looksPhaticAck(t) &&
      !signals.includes('gibberish') &&
      !signals.includes('social_rapport'))
  ) {
    signals.push('vague')
  }
  if (
    !signals.includes('short') &&
    !signals.includes('vague') &&
    !signals.includes('gibberish') &&
    !signals.includes('non_answer') &&
    !signals.includes('social_rapport')
  ) {
    signals.push('substantive')
  }
  return signals
}
