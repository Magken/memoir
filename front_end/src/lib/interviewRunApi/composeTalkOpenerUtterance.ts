import type { TalkContext, TalkOpenBeat } from './talkTypes'

/** Punctuate a probe/ask string so it reads as a finished sentence. */
export function punctuateAsk(raw: string, fallback = 'When you are ready, continue.'): string {
  const ask = raw.replace(/\s+/g, ' ').trim()
  if (!ask) return fallback
  if (/[.?!]$/.test(ask)) return ask
  return `${ask}.`
}

/** Stable pick among phrasings so peel openers vary without feeling scripted. */
function pickVariant(seed: string, variants: readonly string[]): string {
  let h = 0
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return variants[h % variants.length]!
}

/**
 * Authored probe goals are sometimes assessor-facing ("Learn what they…", "Describe…").
 * Speak to the candidate instead — never dump rubric voice into the peel.
 */
export function toSpokenProbeAsk(raw: string, fallback = 'When you are ready, continue.'): string {
  let t = raw.replace(/\s+/g, ' ').trim()
  if (!t) return fallback
  t = t
    .replace(/^Can you (please )?(briefly )?(describe|tell|walk|explain)\b/i, (_m, _a, _b, verb: string) => {
      const v = String(verb).toLowerCase()
      if (v === 'describe') return 'Tell me about'
      if (v === 'explain' || v === 'walk') return 'Walk me through'
      return 'Tell me'
    })
    .replace(/^Learn what they\b/i, 'What have you')
    .replace(/^Learn what the candidate\b/i, 'What have you')
    .replace(/^Briefly describe\b/i, 'Tell me about')
    .replace(/^Describe\b/i, 'Walk me through')
    .replace(/^Surface\b/i, 'Tell me about')
    .replace(/^Extract\b/i, 'Walk me through')
    .replace(/^Assess\b/i, 'Tell me about')
    .replace(/\bthey have been\b/gi, 'you have been')
    .replace(/\bthey\b/gi, 'you')
    .replace(/\btheir\b/gi, 'your')
    .replace(/\bthe candidate\b/gi, 'you')
  t = t.replace(/\bWhat have you have been\b/i, 'What have you been')
  if (!/[.?!]$/.test(t) && /^(what|tell|walk|when|how|why|where|who|describe|explain|briefly)\b/i.test(t)) {
    return `${t.replace(/[.?!]$/, '')}?`
  }
  return punctuateAsk(t, fallback)
}

/** Drop assessor / scoring meta that must never be spoken to the candidate. */
function stripAssessorPurposeMeta(purpose: string): string {
  const sentences = purpose
    .replace(/[\u2014\u2013]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
  const kept = sentences.filter(
    (s) =>
      !/\b(strong answers|this section matters|shows how you|take responsibility|drive results|challenging situations|scoring|assess(?:es|ment)?|warm-up, not|not a deep technical grill|example quality|this part is about)\b/i.test(
        s,
      ),
  )
  let core = (kept[0] ?? sentences[0] ?? purpose).split(/\s+-\s+/)[0]!.trim()
  core = core
    .replace(/^How the candidate handles\b/i, 'How you handle')
    .replace(/\bthe candidate\b/gi, 'you')
    .replace(/\btheir\b/gi, 'your')
  return core
}

/**
 * Probe hint → candidate-facing expectation (what counts as a usable answer).
 * Leaves room for variety; returns null when hint is empty or pure assessor chrome.
 */
export function toSpokenExpectation(hint: string | null | undefined): string | null {
  let h = String(hint ?? '')
    .replace(/[\u2014\u2013]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
  if (!h) return null
  if (/\b(scoring|rubric|assess(?:es|ment)|template|dimension)\b/i.test(h)) return null

  h = h
    .replace(/^Look for\b/i, "I'm hoping for")
    .replace(/^Ask for\b/i, "I'm hoping for")
    .replace(/^Probe for\b/i, "I'm hoping for")
    .replace(/^Listen for\b/i, "I'm hoping for")
    .replace(/^I need\b/i, "I'm hoping for")
    .replace(/^A short summary is fine\s*-\s*/i, '')
    .replace(/^focus on\b/i, 'focus on')
    .replace(/\bthe candidate\b/gi, 'you')
    .replace(/\bthey\b/gi, 'you')
    .replace(/\btheir\b/gi, 'your')

  if (/^focus on\b/i.test(h)) {
    h = `A good answer will ${h}`
  } else if (!/^(i |i'|we |we'|i'm |a |the |pick |give |include |name |tell )/i.test(h)) {
    h = `I'm hoping for ${h.charAt(0).toLowerCase()}${h.slice(1)}`
  }

  if (!/[.?!]$/.test(h)) h += '.'
  if (h.length > 140) h = `${h.slice(0, 137).replace(/\s+\S*$/, '')}.`
  return h
}

/**
 * Day-1 how-this-works beat (Kaplan-Moss). Must cover: behavioral / real experiences /
 * no single right answer / may dig with follow-ups. Phrasing varies by seed.
 */
export function howThisWorksBeat(seed = 'default'): string {
  return pickVariant(seed, [
    "I'll ask about real situations you've handled - there isn't one right answer, and I may dig with follow-ups.",
    "This is a behavioral conversation: real experiences you've had. No single right answer. I'll follow up when I need more detail.",
    "I'll ask about situations you've lived through. I'm not fishing for a scripted answer, and I may interrupt to dig deeper.",
  ])
}

/**
 * Day-1 short orientation from topic.purpose — spoken invite, not rubric brochure.
 */
export function purposeOrientation(purpose: string, topicLabel: string, seed = 'purpose'): string | null {
  let p = stripAssessorPurposeMeta(purpose)
  if (!p) {
    const label = topicLabel.replace(/\s+/g, ' ').trim()
    if (!label) return null
    return pickVariant(seed, [
      `I'd like to start with ${label.toLowerCase()}.`,
      `We'll start with ${label.toLowerCase()}.`,
      `First up is ${label.toLowerCase()}.`,
    ])
  }
  p = p
    .replace(/^Start with a light conversation about\b/i, "I'd like to start with")
    .replace(/^Start with\b/i, "I'd like to start with")
    .replace(/^Share a concrete story where you\b/i, 'I want a concrete story where you')
    .replace(/^Share\b/i, 'I want')
    .replace(/^Wrap up the interview by inviting your questions\b/i, "I'd like to leave room for your questions")
    .replace(/^Wrap up\b/i, "We'll wrap up with")
    .replace(/^Describe\b/i, 'I want to hear about')
  if (/^How you\b/i.test(p)) {
    p = `I'd like to hear ${p.charAt(0).toLowerCase()}${p.slice(1)}`
  } else if (!/^(i'|i |we'|we |today|next|let|first)/i.test(p)) {
    p = `I want to cover ${p.charAt(0).toLowerCase()}${p.slice(1)}`
  }
  if (!/[.?!]$/.test(p)) p += '.'
  if (p.length > 160) p = `${p.slice(0, 157).replace(/\s+\S*$/, '')}.`
  return p
}

function shortPrevLabel(title: string): string {
  const t = title.replace(/\s+/g, ' ').trim()
  if (!t) return 'that last section'
  const afterColon = t.includes(':') ? t.split(':').slice(1).join(':').trim() : ''
  if (afterColon && afterColon.length >= 8 && afterColon.length <= 48) return afterColon
  if (t.length <= 52) return t
  return 'that last section'
}

/**
 * Mid-interview Talk open: Assist-shaped handoff — name THIS section, then stop.
 * Purpose / hint lectures stay out; the spoken ask carries the probe.
 */
export function midSectionOrientation(_purpose: string, topicLabel: string, seed = 'mid'): string | null {
  const label = topicLabel.replace(/\s+/g, ' ').trim()
  if (label) {
    return pickVariant(seed, [
      `Let's talk about ${label}.`,
      `I'd like to hear about ${label} next.`,
      `Next up is ${label}.`,
    ])
  }
  return pickVariant(seed, [
    "Let's move into the next part of the interview.",
    "I'd like to hear about the next part next.",
    'Next up is the next part of the interview.',
  ])
}

/**
 * Turn a CV rapport hook into a professional bridge into the ask.
 * Research: ease in via resume substance (CASS behavioral guide), not "I noticed you're a Title at Org."
 */
function cvWorkBridge(hook: string): string | null {
  const h = hook.replace(/\s+/g, ' ').trim()
  if (!h) return null
  const at = h.match(/^(.+?)\s+at\s+(.+)$/i)
  if (at) {
    const org = at[2]!.trim()
    return `Looking at your work at ${org},`
  }
  return `Looking at your ${h.replace(/\.$/, '')} work,`
}

function activeProbeHint(ctx: TalkContext): string | null {
  const fromOpener = ctx.opener.hint?.trim()
  if (fromOpener) return fromOpener
  const probe = ctx.topic.probes.find((p) => p.id === ctx.opener.probeId)
  return probe?.hint?.trim() || null
}

/**
 * Deterministic peel opener — one ask per utterance.
 * Day-1 name beat: greet + who + thanks + how-this-works + name check only.
 * Day-1 first probe: greet + who + thanks + how-this-works + purpose + expectation + one probe.
 * Mid-Talk: optional thanks for the prior section + short label invite + one ask
 * (Assist-shaped; no hint lecture, no hyphen glue).
 */
export function composeTalkOpenerUtterance(
  ctx: TalkContext,
  priorMemory?: { bridge?: string; hasMemory?: boolean } | null,
  candidateCv?: {
    preferredName?: string
    displayName?: string
    rapportHook?: string
    hasCv?: boolean
  } | null,
  opts?: { openBeat?: TalkOpenBeat; previousTitle?: string | null },
): string {
  const persona = ctx.persona.name?.trim() || ''
  const preferred = candidateCv?.preferredName?.trim() || ''
  const display = candidateCv?.displayName?.trim() || ''
  const callAs = preferred || display
  const hook = candidateCv?.rapportHook?.trim() || ''
  const continuing = !ctx.isOpening || Boolean(priorMemory?.hasMemory)
  const hasCvDayOpen = Boolean(!continuing && candidateCv?.hasCv)
  const seed = `${ctx.briefId}:${ctx.phaseId}`
  const ask = toSpokenProbeAsk(ctx.opener.text)
  const expect = toSpokenExpectation(activeProbeHint(ctx))

  if (continuing) {
    const prevRaw = opts?.previousTitle?.trim() || ''
    const thanks = prevRaw
      ? pickVariant(seed + 'th', [
          `Thanks for completing ${shortPrevLabel(prevRaw)}.`,
          `Thanks for wrapping up ${shortPrevLabel(prevRaw)}.`,
          `Appreciate you finishing ${shortPrevLabel(prevRaw)}.`,
        ])
      : null
    const section = midSectionOrientation(ctx.topic.purpose, ctx.topic.label, seed)
    return [thanks, section, ask].filter(Boolean).join(' ')
  }

  const purpose = purposeOrientation(ctx.topic.purpose, ctx.topic.label, seed)
  const how = howThisWorksBeat(seed)

  const who = persona
    ? `I'm ${persona}, your interviewer for today.`
    : 'I am your interviewer for today.'
  const greet = callAs && hasCvDayOpen ? `Hi ${callAs}, ${who}` : `Hi, ${who}`

  const thanks = 'Thanks for joining.'

  const needsNameCheck =
    hasCvDayOpen && Boolean(preferred) && Boolean(display) && preferred !== display
  const beat: TalkOpenBeat =
    opts?.openBeat ?? (needsNameCheck ? 'day1_name' : 'day1_first_probe')

  if (beat === 'day1_name' && needsNameCheck) {
    return [greet, thanks, how, `Is ${preferred} the right name to use?`].filter(Boolean).join(' ')
  }

  const workBridge = hasCvDayOpen ? cvWorkBridge(hook) : null

  if (hasCvDayOpen && workBridge) {
    const askCore = ask.replace(/[.?!]$/, '')
    const bridgedAsk = `${workBridge} ${askCore.charAt(0).toLowerCase()}${askCore.slice(1)}?`
    return [greet, thanks, how, purpose, expect, bridgedAsk].filter(Boolean).join(' ')
  }

  return [greet, thanks, how, purpose, expect, ask].filter(Boolean).join(' ')
}

