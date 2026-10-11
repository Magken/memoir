export type AssistSituationCaps = {
  spoilers?: boolean
  write?: boolean
}

/**
 * Whole-assignment asks (Coach/Copilot must not dump the full solution).
 * Keep in sync with Edge `interview-copilot-edit/allowlist.ts` WHOLE_ASSIGNMENT_RE.
 */
export const WHOLE_SOLUTION_ASK_RE =
  /\b(solve (it|this|the (problem|challenge|task|exercise)|for me)|give me the (full |complete |entire )?(solution|code|answer)|tell me the (full |complete )?(answer|solution)|what'?s the answer|what is the answer|write (it|the (whole |entire |complete )?(code|solution|essay|program)|everything) for me|do (it|the whole|everything) for me|implement (everything|the entire|the whole)|complete (solution|the (task|assignment|challenge))|just (give|write|do) (me )?the (code|solution|answer)|entire solution|whole (program|essay|assignment|document|solution|thing)|all files|all (the )?answers|pass the (hidden )?tests)\b/i

/** A specific helper, loop, question, file, or quoted span — not "everything". */
export const NAMED_ASSIST_SLICE_RE =
  /\b(for[- ]?loop|while[- ]?loop|this (function|helper|method|class|loop|branch|case|part|section)|(?:the )?(function|helper|method|loop) \w+|how to implement \w+|question\s*\d+|item\s*\d+|heading|paragraph|src\/[\w./-]+|solve\.\w+|only (the|this) \w+|the part (that|where|which)|stop condition|\w+\.(ts|js|tsx|jsx|go|py|java|rs|c|cpp))\b/i

export function isWholeSolutionAsk(text: string): boolean {
  const t = String(text ?? '')
  if (!WHOLE_SOLUTION_ASK_RE.test(t)) return false
  return !hasNamedAssistSlice(t)
}

export function hasNamedAssistSlice(text: string): boolean {
  const t = String(text ?? '')
  if (NAMED_ASSIST_SLICE_RE.test(t)) return true
  return /["'`][^"'`\n]{6,}["'`]/.test(t)
}

/**
 * Infer stage-assist situation from candidate text.
 * Hard gate: refuse_spoiler when spoilers are off (Assistant / None).
 * Coach / Copilot (`caps.spoilers`) may hint a named slice — never the whole solution.
 * Whole-assignment asks with spoilers on → `narrow_slice` (ask which part).
 * Edge few-shots still carry craft — FE only soft-routes.
 */
export function inferAssistSituation(
  text: string,
  caps?: AssistSituationCaps | null,
):
  | 'navigate'
  | 'restate'
  | 'marking'
  | 'refuse_spoiler'
  | 'narrow_slice'
  | 'clarify' {
  const t = text.toLowerCase().trim()
  const honorSpoilers = Boolean(caps?.spoilers)

  // Short yes / continue after an open ask — stay in clarify (never refuse).
  if (
    /^(yes|yep|yeah|yup|sure|ok|okay|please|pls|go on|continue|go ahead)(\s+(please|pls|thanks|thank you))?[.!?]*$/i.test(
      t,
    )
  ) {
    return 'clarify'
  }

  if (
    /\b(give me the answer|tell me the answer|what should i (pick|say|write|choose)|correct option|fill (it|this) in|fix my code|pass the tests|solve (it|this|for me)|write (it|my|the|this) for me)\b/.test(
      t,
    ) ||
    isWholeSolutionAsk(t)
  ) {
    if (!honorSpoilers) return 'refuse_spoiler'
    if (hasNamedAssistSlice(t)) return 'clarify'
    return 'narrow_slice'
  }

  if (
    /\b(give me a hint|just a hint|a little hint|first step|am i on the right track|is my (approach|code|answer) (ok|right|correct)|which (data structure|algorithm)|which options? (are wrong|can i eliminate)|start the function|write a stub)\b/.test(
      t,
    )
  ) {
    if (!honorSpoilers) return 'refuse_spoiler'
    if (hasNamedAssistSlice(t)) return 'clarify'
    return 'narrow_slice'
  }

  if (
    /\b(where|how do i (open|find|get to)|file tree|editor|timer|right peel|left|canvas|question list|progress)\b/.test(
      t,
    )
  ) {
    return 'navigate'
  }

  if (/\b(what does|mean|restate|in plain|explain (the|this|that)|confused|confusing|unclear|wording)\b/.test(t)) {
    return 'restate'
  }

  if (
    /\b(mark(ed|ing)?|rubric|score|how (am i|are we) (graded|scored|marked)|word limit|required)\b/.test(
      t,
    )
  ) {
    return 'marking'
  }

  return 'clarify'
}
