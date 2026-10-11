/**
 * Copilot intent — not Assist inferAssistSituation.
 * Assist maps "fix my code" to refuse_spoiler; Copilot maps that to edit.
 * Keep in sync with Edge `interview-copilot-edit/inferCopilotIntent.ts`.
 */
import {
  hasNamedAssistSlice,
  isWholeSolutionAsk,
  WHOLE_SOLUTION_ASK_RE,
} from './inferAssistSituation.ts'

export type CopilotIntentKind = 'assist' | 'edit' | 'spoiler' | 'ambiguous'

export type CopilotAssistSituation = 'clarify' | 'navigate' | 'restate' | 'marking' | 'refuse_spoiler'

export type CopilotIntent = {
  kind: CopilotIntentKind
  situation?: CopilotAssistSituation
}

const SPOILER_RE =
  /\b(give me the answer|tell me the answer|what'?s the answer|what is the answer|what should i (pick|say|write|choose)|correct option|pass the hidden tests|write (it|my|the|this) (essay|solution)? for me)\b/i

const NAV_RE =
  /\b(where|how do i (open|find|get to)|file tree|editor|timer|right peel|left|canvas|question list|progress)\b/i

const RESTATE_RE =
  /\b(what does|mean|restate|in plain|explain (the|this|that)|confused|confusing|unclear|wording|how should i approach|am i on the right track)\b/i

const MARKING_RE =
  /\b(mark(ed|ing)?|rubric|score|how (am i|are we) (graded|scored|marked)|word limit|required)\b/i

const HELP_RE =
  /\b(help me|please help|can you help|i('m| am) stuck|not sure what|assist me)\b/i

const EDIT_RE =
  /\b(fill|mark|insert|delete|remove|take out|cut out|replace|return|create (a )?file|set_response|hunk|fix (the |this )?(typeerror|error)|implement in )\b/i

const PUT_IN_EDITOR_RE =
  /\b(put (this|it|that) in (the )?(editor|file)|put it in|apply (it|this|that)|propose an edit|propose (a |the )?change|add this to (the )?(editor|file)|write (this|it|the code) (into|in) (the )?(editor|file)|just write (the |this )?code|pls just write the code|write the code|write and add|add it|do the code)\b/i

const PUT_IN_DOC_RE =
  /\b(add|put|insert)\s+(it|this|that)\s+(to|in|into)\s+(the )?(document|essay|editor|file|answer)\b/i

const ESSAY_PROOF_RE =
  /\b(proofread|fix (the |my )?(spell(ing)?|typos?)|add (a )?(citation|bibliograph)|bibliograph)\b/i

const ESSAY_DELETE_RE =
  /\b(remove|delete|take out|cut out|get rid of)\b[\s\S]{0,80}\b(section|heading|paragraph|sentence|that|this|it|them|those)\b/i

const ADD_HELPER_RE =
  /\b(add|insert|edit|implement|fix|write|create|put)\s+(?:a |the |my )?(?:\w+\s+){0,3}(guard|helper|function|method|hunk|file|loop|counter|incrementer)\b/i

const AMBIGUOUS_RE = /\b(help me with this|can you do this|look at this|do this for me)\b/i

const VAGUE_EDIT_INTENT_RE =
    /^(please|pls)?\s*(just\s+)?(fix|implement|do|complete|solve|write)\s+(this|it|the (problem|solution|code|essay)|the code)[\s.!?]*$/i

/** Everyday Copilot write asks — Coach/Assistant (`write: false`) stay speech. */
function wantsCopilotEditAsk(
  t: string,
  caps?: { spoilers?: boolean; write?: boolean } | null,
): boolean {
  if (caps?.write === false) return false
  if (PUT_IN_EDITOR_RE.test(t) || ADD_HELPER_RE.test(t)) return true
  if (PUT_IN_DOC_RE.test(t) || ESSAY_PROOF_RE.test(t) || ESSAY_DELETE_RE.test(t)) return true
  if (
    !/\bwhat (have i|did i) (written|wrote|write)\b/i.test(t) &&
    (/^(please|pls)\s+(write|add|insert|put|type)\b/i.test(t) ||
      (/\b(document|essay|answer section)\b/i.test(t) && /\b(write|add|insert|put|edit)\b/i.test(t)))
  ) {
    return true
  }
  if (
    /\bhelpers?\b/i.test(t) &&
    /\b(write|add|put|edit|implement|template|sample|file|function)\b/i.test(t)
  ) {
    return true
  }
  if (
    hasNamedAssistSlice(t) &&
    /\b(help|add|edit|implement|fix|insert|guard|change|update|patch|put|write|create|return|increment)\b/i.test(t)
  ) {
    return true
  }
  if (
    /\b(increment(?:s|er|al)?|count(?:s|er|ing)?)\b/i.test(t) &&
    (/\d{1,5}\s*(?:to|-)\s*\d{1,5}/.test(t) ||
      /one\s+to\s+/i.test(t) ||
      /(?:two|three|four|five|six|seven|eight|nine)\s+hundred/i.test(t))
  ) {
    return true
  }
  if (/\b(for[- ]?loop|loop(?:s|ing)?)\b/i.test(t) && /\b\d{1,5}\s+times\b/i.test(t)) {
    return true
  }
  if (
    /\bcase\s+statement\b/i.test(t) ||
    (/\bcases\b/i.test(t) && /\bhelpers?\b/i.test(t) && !/\bsample cases?\b/i.test(t))
  ) {
    return true
  }
  return false
}

export function inferCopilotIntent(
  text: string,
  caps?: { spoilers?: boolean; write?: boolean } | null,
): CopilotIntent {
  const t = String(text ?? '').trim()
  if (!t) return { kind: 'assist', situation: 'clarify' }

  if (isWholeSolutionAsk(t) || (WHOLE_SOLUTION_ASK_RE.test(t) && !hasNamedAssistSlice(t))) {
    if (caps?.write === false && caps?.spoilers) return { kind: 'assist', situation: 'clarify' }
    if (caps?.write === false) return { kind: 'spoiler', situation: 'refuse_spoiler' }
    if (caps?.write) return { kind: 'edit' }
    if (/\b(what'?s the answer|what is the answer|tell me the answer|give me the answer)\b/i.test(t)) {
      if (caps?.spoilers) return { kind: 'assist', situation: 'clarify' }
      return { kind: 'spoiler', situation: 'refuse_spoiler' }
    }
    return { kind: 'edit' }
  }

  if (SPOILER_RE.test(t) && !EDIT_RE.test(t)) {
    if (caps?.write && !hasNamedAssistSlice(t)) return { kind: 'edit' }
    if (caps?.spoilers) return { kind: 'assist', situation: 'clarify' }
    return { kind: 'spoiler', situation: 'refuse_spoiler' }
  }
  if (/\bwrite the whole essay for me\b/i.test(t)) {
    if (caps?.write) return { kind: 'edit' }
    if (caps?.spoilers) return { kind: 'assist', situation: 'clarify' }
    return { kind: 'spoiler', situation: 'refuse_spoiler' }
  }

  if (AMBIGUOUS_RE.test(t) && !EDIT_RE.test(t) && !RESTATE_RE.test(t) && !wantsCopilotEditAsk(t, caps)) {
    return { kind: 'ambiguous' }
  }

  if (wantsCopilotEditAsk(t, caps)) {
    return { kind: 'edit' }
  }

  if (NAV_RE.test(t) && !EDIT_RE.test(t)) {
    return { kind: 'assist', situation: 'navigate' }
  }
  if (MARKING_RE.test(t) && !EDIT_RE.test(t)) {
    return { kind: 'assist', situation: 'marking' }
  }
  if (RESTATE_RE.test(t) && !EDIT_RE.test(t)) {
    return { kind: 'assist', situation: 'restate' }
  }
  if (HELP_RE.test(t) && !EDIT_RE.test(t)) {
    return { kind: 'assist', situation: 'clarify' }
  }

  if (
    EDIT_RE.test(t) ||
    VAGUE_EDIT_INTENT_RE.test(t) ||
    WHOLE_SOLUTION_ASK_RE.test(t) ||
    /\bfix (this|it|my code)\b/i.test(t) ||
    /\bimplement this\b/i.test(t) ||
    /\b(make it work|just do it|finish it|complete it|solve it)\b/i.test(t)
  ) {
    return { kind: 'edit' }
  }

  if (
    /^(yes|yep|yeah|yup|sure|ok|okay|please|pls|go on|continue|go ahead)(\s+(please|pls))?[\s.!?]*$/i.test(
      t,
    )
  ) {
    return { kind: 'assist', situation: 'clarify' }
  }

  return { kind: 'assist', situation: 'clarify' }
}
