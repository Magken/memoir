/**
 * Shared sitting-inject fixture thread — $0 hop trace + opt-in live audit.
 * Receipts must never appear in any hop pack.
 */

export const ASK1 =
  'Please help me write a simple sample case statement template in the Python helper function file'
export const ASK2 = 'what did I ask'
export const CORRECTION = 'I said in the python helper function file'
export const OPENER = 'Welcome to this coding section.'
export const WRONG_FILE = 'Proposed a hunk in src/solve.ts.'
export const RECEIPT = 'accepted · src/solve.ts · updateCache'

export const SITTING_INJECT_THREAD = [
  { role: 'assistant', text: OPENER },
  { role: 'candidate', text: ASK1 },
  { role: 'assistant', text: WRONG_FILE },
  { role: 'assistant', text: RECEIPT },
  { role: 'candidate', text: ASK2 },
]

export const SITTING_INJECT_LIVE_DOC = {
  kind: 'coding',
  generation: 1,
  snapshotHash: 'h',
  selection: { path: 'src/solve.ts' },
  coding: {
    activeId: 'src/solve.ts',
    files: [
      { path: 'src/solve.ts', content: 'export function updateCache() {\n  return cache\n}\n' },
      { path: 'src/helpers.py', content: 'def is_newer_version(current, incoming):\n    return False\n' },
    ],
  },
}

export const SITTING_INJECT_CONTRACT = {
  phaseId: 'ph.code',
  title: 'Two sum',
  kind: 'coding',
  purpose: 'Solve the visible sample.',
  identity: 'Copilot peel',
  may: 'Propose one named part into the sitting editor.',
  mustNot: 'Must not be used when they only asked for explain - that is Assistant.',
}
