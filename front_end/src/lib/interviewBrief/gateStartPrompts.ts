import codingBank from './examples/gate-start-prompts/coding.json'
import docBank from './examples/gate-start-prompts/doc.json'
import formBank from './examples/gate-start-prompts/form.json'
import talkBank from './examples/gate-start-prompts/talk.json'

/** Sample start-prompt kinds (matches Creator tool / talk dialects). */
export type GateStartPromptKind = 'talk' | 'form' | 'coding' | 'doc'

export type GateStartPromptSample = {
  id: string
  kind: GateStartPromptKind
  startPrompt: string
}

const BANKS: Record<GateStartPromptKind, readonly GateStartPromptSample[]> = {
  talk: talkBank as GateStartPromptSample[],
  form: formBank as GateStartPromptSample[],
  coding: codingBank as GateStartPromptSample[],
  doc: docBank as GateStartPromptSample[],
}

/** Map landing `kindLabel` → sample bank kind. */
export function gateKindFromLandingLabel(kindLabel: string): GateStartPromptKind {
  switch (kindLabel) {
    case 'Form':
      return 'form'
    case 'Coding':
      return 'coding'
    case 'Writing':
      return 'doc'
    default:
      return 'talk'
  }
}

export function listGateStartPrompts(kind: GateStartPromptKind): readonly GateStartPromptSample[] {
  return BANKS[kind] ?? []
}

/** Pick a random sample opener for the arriving gate kind (harness). */
export function pickRandomStartPrompt(
  kind: GateStartPromptKind,
  random: () => number = Math.random,
): GateStartPromptSample {
  const bank = listGateStartPrompts(kind)
  if (bank.length === 0) {
    return {
      id: `${kind}.fallback`,
      kind,
      startPrompt: 'Continue when you are ready for this stage.',
    }
  }
  const idx = Math.min(bank.length - 1, Math.max(0, Math.floor(random() * bank.length)))
  return bank[idx]!
}
