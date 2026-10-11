import {
  AlignLeft,
  CheckSquare,
  Circle,
  CircleDot,
  ClipboardList,
  Hash,
  Lightbulb,
  ListChecks,
  ListOrdered,
  MessageSquareText,
  Table2,
  TextCursorInput,
  Type,
} from 'lucide-react'
import type { CascadeMenuItem } from '../../lib/menus/cascadeMenu'
import type { TestFormQuestionKind, TestFormShortTextFormat } from '../../lib/testForm'

export const KIND_EDGE_OPTIONS: {
  kind: TestFormQuestionKind
  label: string
  icon: typeof Type
}[] = [
  { kind: 'short_text', label: 'Short answer', icon: Type },
  { kind: 'essay', label: 'Paragraph', icon: AlignLeft },
  { kind: 'mcq_single', label: 'Multiple choice', icon: CircleDot },
  { kind: 'mcq_multi', label: 'Checkboxes', icon: ListChecks },
  { kind: 'dropdown', label: 'Dropdown', icon: ListOrdered },
  { kind: 'fill_blank', label: 'Fill blank', icon: TextCursorInput },
  { kind: 'ordinal', label: 'Linear scale', icon: Hash },
  { kind: 'ordinal_grid', label: 'Multiple-choice grid', icon: Table2 },
]

const SHORT_FORMAT_OPTIONS: { format: TestFormShortTextFormat; label: string }[] = [
  { format: 'text', label: 'Text' },
  { format: 'number', label: 'Number' },
  { format: 'email', label: 'Email' },
  { format: 'phone', label: 'Phone' },
  { format: 'date', label: 'Date' },
]

const POINTS_PRESETS = [0, 1, 2, 5, 10]

export type QuestionEdgeContext = {
  kind: TestFormQuestionKind
  required: boolean
  descriptionOpen: boolean
  tipOpen: boolean
  inputFormat?: TestFormShortTextFormat
  points?: number
}

export type QuestionEdgeAction =
  | { type: 'kind'; kind: TestFormQuestionKind }
  | { type: 'add-description' }
  | { type: 'add-tip' }
  | { type: 'open-marking' }
  | { type: 'set-required'; required: boolean }
  | { type: 'format'; format: TestFormShortTextFormat }
  | { type: 'points'; points: number }

/** VurifyViewer-style edge menu — disable rows already present; no checkboxes. */
export function buildQuestionEdgeItems(ctx: QuestionEdgeContext): CascadeMenuItem[] {
  const items: CascadeMenuItem[] = [
    {
      id: 'group:kind',
      label: 'Question type',
      icon: MessageSquareText,
      children: KIND_EDGE_OPTIONS.map((row) => ({
        id: `kind:${row.kind}`,
        label: row.label,
        icon: row.icon,
        disabled: ctx.kind === row.kind,
      })),
    },
    {
      id: 'band:description',
      label: 'Add description',
      icon: AlignLeft,
      disabled: ctx.descriptionOpen,
    },
    {
      id: 'band:tip',
      label: 'Add tip',
      icon: Lightbulb,
      disabled: ctx.tipOpen,
    },
    {
      id: 'panel:marking',
      label: 'Edit marking',
      icon: ClipboardList,
    },
    {
      id: 'flag:required',
      label: 'Required',
      icon: CheckSquare,
      disabled: ctx.required,
    },
    {
      id: 'flag:optional',
      label: 'Optional',
      icon: Circle,
      disabled: !ctx.required,
    },
    {
      id: 'group:points',
      label: 'Points',
      icon: Hash,
      children: POINTS_PRESETS.map((n) => ({
        id: `points:${n}`,
        label: String(n),
        disabled: (ctx.points ?? 1) === n,
      })),
    },
  ]

  if (ctx.kind === 'short_text') {
    items.splice(1, 0, {
      id: 'group:format',
      label: 'Input format',
      icon: Type,
      children: SHORT_FORMAT_OPTIONS.map((row) => ({
        id: `format:${row.format}`,
        label: row.label,
        disabled: (ctx.inputFormat ?? 'text') === row.format,
      })),
    })
  }

  return items
}

export function parseQuestionEdgeAction(id: string): QuestionEdgeAction | null {
  if (id.startsWith('kind:')) {
    return { type: 'kind', kind: id.slice(5) as TestFormQuestionKind }
  }
  if (id === 'band:description') return { type: 'add-description' }
  if (id === 'band:tip') return { type: 'add-tip' }
  if (id === 'panel:marking') return { type: 'open-marking' }
  if (id === 'flag:required') return { type: 'set-required', required: true }
  if (id === 'flag:optional') return { type: 'set-required', required: false }
  if (id.startsWith('format:')) {
    return { type: 'format', format: id.slice(7) as TestFormShortTextFormat }
  }
  if (id.startsWith('points:')) {
    const points = Number(id.slice(7))
    if (!Number.isFinite(points)) return null
    return { type: 'points', points }
  }
  return null
}
