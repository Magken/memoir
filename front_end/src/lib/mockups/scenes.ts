import type { MockupMotionId } from './motions'
import type { WireframeBlockTone } from '../wireframes/wireframeTypes'
import type { WireframeIconId } from '../wireframes/wireframeIcons'

export type MockupSceneLayout = 'stack' | 'split' | 'trio' | 'beats' | 'band'

export type MockupItem =
  | { kind: 'heading'; kicker?: string; title: string }
  | { kind: 'copy'; text: string }
  | { kind: 'row'; icon: WireframeIconId; copy: string; tag?: string }
  | { kind: 'tags'; tags: readonly string[] }
  | { kind: 'skeleton'; lines?: 2 | 3 }
  | { kind: 'divider' }

export type MockupBox = {
  tone?: WireframeBlockTone
  items: readonly MockupItem[]
}

export type MockupScene = {
  id: string
  name: string
  purpose: string
  inspiredBy: string
  layout: MockupSceneLayout
  /** Safe default for deck / motion column — never a shrink that clips type. */
  motion?: MockupMotionId
  masthead?: {
    kicker?: string
    title: string
    align?: 'center' | 'start'
    display?: boolean
  }
  boxes: readonly MockupBox[]
}

export const MOCKUP_SCENES: readonly MockupScene[] = [
  {
    id: 'deck-talk-templates',
    name: 'Discussion templates',
    purpose: 'You author Conversation — probes, targets, and what good sounds like. Not a stock script.',
    inspiredBy: 'Deck · custom templates',
    layout: 'split',
    motion: 'walk',
    masthead: { kicker: 'Conversation', title: 'Templates you write', align: 'start' },
    boxes: [
      {
        tone: 'main',
        items: [
          { kind: 'heading', kicker: 'This brief', title: 'Probe order' },
          { kind: 'divider' },
          { kind: 'row', icon: 'message', copy: 'Open the topic', tag: 'Open' },
          { kind: 'row', icon: 'route', copy: 'Follow the gap', tag: 'Probe' },
          { kind: 'row', icon: 'layers', copy: 'Name the target', tag: 'Close' },
        ],
      },
      {
        tone: 'aside',
        items: [
          { kind: 'heading', kicker: 'Craft', title: 'What good sounds like' },
          { kind: 'copy', text: 'A complete story, not a slogan. You name the target before the interview starts.' },
          { kind: 'divider' },
          { kind: 'tags', tags: ['STAR', 'GAR', 'Custom'] },
        ],
      },
    ],
  },
  {
    id: 'deck-editors',
    name: 'Assessment editors',
    purpose: 'Form, coding, and writing are real editors. Each keeps its own marking on the work.',
    inspiredBy: 'Deck · assessment editors',
    layout: 'trio',
    motion: 'walk',
    masthead: { kicker: 'Assess', title: 'Editors on the path', align: 'start' },
    boxes: [
      {
        tone: 'card',
        items: [
          { kind: 'tags', tags: ['Form'] },
          { kind: 'heading', title: 'Scored questions' },
          { kind: 'copy', text: 'Each item shares one rubric on the form they submit.' },
          { kind: 'divider' },
          { kind: 'row', icon: 'layers', copy: 'Same rubric', tag: 'Mark' },
        ],
      },
      {
        tone: 'card',
        items: [
          { kind: 'tags', tags: ['Coding'] },
          { kind: 'heading', title: 'Work in the editor' },
          { kind: 'copy', text: 'Tests run on the file they leave in the coding stage.' },
          { kind: 'divider' },
          { kind: 'row', icon: 'code', copy: 'Harness on the file', tag: 'Tests' },
        ],
      },
      {
        tone: 'card',
        items: [
          { kind: 'tags', tags: ['Writing'] },
          { kind: 'heading', title: 'A page they own' },
          { kind: 'copy', text: 'Timed writing. Bands sit on the draft, not a recap.' },
          { kind: 'divider' },
          { kind: 'row', icon: 'pen', copy: 'Timed essay', tag: 'Bands' },
        ],
      },
    ],
  },
  {
    id: 'deck-day-kit',
    name: 'One package',
    purpose: 'Talk plus editor work leave as one day — not a chat log and a separate test.',
    inspiredBy: 'Deck · candidate day',
    layout: 'stack',
    motion: 'stagger',
    masthead: { kicker: 'Candidate day', title: 'Conversation and tools together', align: 'start' },
    boxes: [
      {
        tone: 'hero',
        items: [
          { kind: 'heading', title: 'What the interview holds' },
          { kind: 'row', icon: 'message', copy: 'Conversation', tag: 'Live' },
          { kind: 'row', icon: 'layers', copy: 'Form', tag: 'Scored' },
          { kind: 'row', icon: 'code', copy: 'Coding', tag: 'Tool' },
          { kind: 'row', icon: 'pen', copy: 'Writing', tag: 'Timed' },
          { kind: 'divider' },
          { kind: 'tags', tags: ['One package', 'One review'] },
        ],
      },
    ],
  },
  {
    id: 'deck-path',
    name: 'How it lands',
    purpose: 'Capture, score, review, report — the same artifact moves through every beat.',
    inspiredBy: 'Deck · path',
    layout: 'beats',
    motion: 'walk',
    masthead: { kicker: 'Path', title: 'Capture to report', align: 'start' },
    boxes: [
      {
        tone: 'stat',
        items: [
          { kind: 'tags', tags: ['01'] },
          { kind: 'heading', title: 'Capture' },
          { kind: 'copy', text: 'Work lands in the stage kit.' },
          { kind: 'divider' },
          { kind: 'row', icon: 'sparkles', copy: 'Work sample', tag: 'In' },
        ],
      },
      {
        tone: 'stat',
        items: [
          { kind: 'tags', tags: ['02'] },
          { kind: 'heading', title: 'Score' },
          { kind: 'copy', text: 'Marks attach to that same artifact.' },
          { kind: 'divider' },
          { kind: 'row', icon: 'shield', copy: 'Rubric marks', tag: 'On it' },
        ],
      },
      {
        tone: 'stat',
        items: [
          { kind: 'tags', tags: ['03'] },
          { kind: 'heading', title: 'Review' },
          { kind: 'copy', text: 'A person opens what the model marked.' },
          { kind: 'divider' },
          { kind: 'row', icon: 'users', copy: 'Same artifact', tag: 'Open' },
        ],
      },
      {
        tone: 'stat',
        items: [
          { kind: 'tags', tags: ['04'] },
          { kind: 'heading', title: 'Report' },
          { kind: 'copy', text: 'The pack leaves with evidence attached.' },
          { kind: 'divider' },
          { kind: 'row', icon: 'file-text', copy: 'Decision pack', tag: 'Out' },
        ],
      },
    ],
  },
  {
    id: 'deck-scoring',
    name: 'Band scoring',
    purpose: 'Marking takes a cue from IELTS and other standardised tests — bands on the work.',
    inspiredBy: 'Deck · scoring',
    layout: 'split',
    motion: 'walk',
    masthead: { kicker: 'Scoring', title: 'Bands you can defend', align: 'start' },
    boxes: [
      {
        tone: 'main',
        items: [
          { kind: 'heading', kicker: 'Cue', title: 'Standardised tests' },
          { kind: 'divider' },
          { kind: 'row', icon: 'book', copy: 'IELTS-style bands', tag: 'Levels' },
          { kind: 'row', icon: 'chart', copy: 'Shared descriptors', tag: 'Public' },
          { kind: 'row', icon: 'check', copy: 'Same work, same scale', tag: 'Fair' },
        ],
      },
      {
        tone: 'aside',
        items: [
          { kind: 'heading', kicker: 'Vurify keeps', title: 'Score on the artifact' },
          { kind: 'copy', text: 'The level sits on the work. A human marker can still change the call.' },
          { kind: 'divider' },
          { kind: 'tags', tags: ['Rubric', 'Bands', 'Override'] },
        ],
      },
    ],
  },
  {
    id: 'deck-grade',
    name: 'Verified grade',
    purpose: 'Criteria in, harness on the artifact, one pack out. A person can still override.',
    inspiredBy: 'Deck · verified grading',
    layout: 'stack',
    motion: 'gleam',
    masthead: { kicker: 'Read', title: 'The pack a manager opens', align: 'start' },
    boxes: [
      {
        tone: 'hero',
        items: [
          { kind: 'heading', title: 'Verified grading' },
          { kind: 'copy', text: 'Criteria in. Harness on the artifact. One pack out — a reason you can check.' },
          { kind: 'divider' },
          { kind: 'row', icon: 'shield', copy: 'Criteria in', tag: 'Rubric' },
          { kind: 'row', icon: 'file-text', copy: 'Harness on the work', tag: 'Score' },
          { kind: 'row', icon: 'users', copy: 'Human can override', tag: 'Review' },
          { kind: 'tags', tags: ['One package', 'A reason'] },
        ],
      },
    ],
  },
]

export function getMockupScene(id: string): MockupScene | undefined {
  return MOCKUP_SCENES.find((scene) => scene.id === id)
}
