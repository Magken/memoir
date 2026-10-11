import { F } from '../catalogFidelity'
import type { TestFormEditorFeature, TestFormFeatureCategory, TestFormFormatId } from './types'

export type {
  TestFormEditorFeature,
  TestFormFeatureCategory,
  TestFormFormatId,
  TestFormFeatureFidelity,
} from './types'

export const TESTFORM_FEATURE_CATEGORY_LABELS: Record<TestFormFeatureCategory, string> = {
  chrome: 'Form chrome',
  interaction: 'Interaction',
  question: 'Question kinds',
  io: 'Context I/O',
}

export const TESTFORM_FORMAT_LABELS: Record<TestFormFormatId, string> = {
  'native-json': 'Test form JSON',
}

export const TESTFORM_EDITOR_FEATURES: TestFormEditorFeature[] = [
  {
    id: 'testform.chrome.modes',
    label: 'Author / Take / Review modes',
    category: 'chrome',
    usable: true,
    notation: 'chrome.mode',
    import: { 'native-json': F.na },
    export: { 'native-json': F.na },
    actions: ['testform.action.set-mode'],
  },
  {
    id: 'testform.chrome.title',
    label: 'Title field',
    category: 'chrome',
    usable: true,
    notation: 'chrome.title',
    import: { 'native-json': F.full },
    export: { 'native-json': F.full },
  },
  {
    id: 'testform.chrome.sections',
    label: 'Section groups (title + hairline)',
    category: 'chrome',
    usable: true,
    notation: 'chrome.sections',
    import: { 'native-json': F.full },
    export: { 'native-json': F.full },
    actions: ['testform.action.add-section', 'testform.action.remove-section'],
  },
  {
    id: 'testform.interaction.hints',
    label: 'Per-question hints',
    category: 'interaction',
    usable: true,
    notation: 'question.hint',
    import: { 'native-json': F.full },
    export: { 'native-json': F.full },
    actions: ['testform.action.set-hint'],
  },
  {
    id: 'testform.interaction.scoring',
    label: 'Score attempt against answer key',
    category: 'interaction',
    usable: true,
    notation: 'attempt.score',
    import: { 'native-json': F.partial },
    export: { 'native-json': F.partial },
    actions: [
      'testform.action.score-attempt',
      'testform.action.clear-attempt',
      'testform.action.strip-key',
    ],
  },
  {
    id: 'testform.question.short-text',
    label: 'Short text',
    category: 'question',
    usable: true,
    notation: 'kind.short_text',
    import: { 'native-json': F.full },
    export: { 'native-json': F.full },
  },
  {
    id: 'testform.question.essay',
    label: 'Essay',
    category: 'question',
    usable: true,
    notation: 'kind.essay',
    import: { 'native-json': F.full },
    export: { 'native-json': F.full },
  },
  {
    id: 'testform.question.mcq',
    label: 'Multiple choice (single / multi)',
    category: 'question',
    usable: true,
    notation: 'kind.mcq',
    import: { 'native-json': F.full },
    export: { 'native-json': F.full },
  },
  {
    id: 'testform.question.fill-blank',
    label: 'Fill in the blank',
    category: 'question',
    usable: true,
    notation: 'kind.fill_blank',
    import: { 'native-json': F.full },
    export: { 'native-json': F.full },
  },
  {
    id: 'testform.question.dropdown',
    label: 'Dropdown',
    category: 'question',
    usable: true,
    notation: 'kind.dropdown',
    import: { 'native-json': F.full },
    export: { 'native-json': F.full },
  },
  {
    id: 'testform.question.ordinal',
    label: 'Linear scale',
    category: 'question',
    usable: true,
    notation: 'kind.ordinal',
    import: { 'native-json': F.full },
    export: { 'native-json': F.full },
  },
  {
    id: 'testform.question.ordinal-grid',
    label: 'Multiple-choice grid',
    category: 'question',
    usable: true,
    notation: 'kind.ordinal_grid',
    import: { 'native-json': F.full },
    export: { 'native-json': F.full },
  },
  {
    id: 'testform.io.native-json',
    label: 'Native JSON import / export',
    category: 'io',
    usable: true,
    notation: 'payload.testform.document',
    import: { 'native-json': F.full },
    export: { 'native-json': F.full },
    actions: ['testform.action.export-take-json'],
    notes: 'Full doc includes answerKey; take export strips it.',
  },
]

export const USABLE_TESTFORM_EDITOR_FEATURES = TESTFORM_EDITOR_FEATURES.filter((f) => f.usable)
