import {
  Braces,
  FileCode2,
  FileImage,
  FileJson,
  FileText,
  FolderArchive,
  Image,
  Network,
  Printer,
  Sheet,
  Sigma,
  type LucideIcon,
} from 'lucide-react'
import type { EditorKind, FormatId } from './types'

export type ExportMenuItem = {
  id: FormatId | string
  label: string
  icon: LucideIcon
}

const CODE_EXPORT: ExportMenuItem[] = [
  { id: 'envelope-json', label: 'Editor context JSON', icon: FileJson },
  { id: 'native-json', label: 'Workspace JSON', icon: Braces },
  { id: 'zip', label: 'ZIP archive', icon: FolderArchive },
]

const DOC_EXPORT: ExportMenuItem[] = [
  { id: 'envelope-json', label: 'Editor context JSON', icon: FileJson },
  { id: 'native-json', label: 'Lexical JSON', icon: Braces },
  { id: 'markdown', label: 'Markdown', icon: FileText },
  { id: 'html', label: 'HTML', icon: FileCode2 },
  { id: 'pdf', label: 'PDF', icon: Printer },
]

const GRID_EXPORT: ExportMenuItem[] = [
  { id: 'envelope-json', label: 'Editor context JSON', icon: FileJson },
  { id: 'native-json', label: 'Sheet JSON', icon: Braces },
  { id: 'csv', label: 'CSV', icon: Sheet },
]

const DRAW_EXPORT: ExportMenuItem[] = [
  { id: 'envelope-json', label: 'Editor context JSON', icon: FileJson },
  { id: 'excalidraw', label: 'Excalidraw JSON', icon: FileCode2 },
  { id: 'png', label: 'PNG', icon: Image },
  { id: 'svg', label: 'SVG', icon: FileImage },
]

const MARKDOWN_EXPORT: ExportMenuItem[] = [
  { id: 'envelope-json', label: 'Editor context JSON', icon: FileJson },
  { id: 'md', label: 'Markdown', icon: FileText },
  { id: 'tex', label: 'LaTeX', icon: Sigma },
]

const MERMAID_EXPORT: ExportMenuItem[] = [
  { id: 'envelope-json', label: 'Editor context JSON', icon: FileJson },
  { id: 'mmd', label: 'Mermaid source', icon: Network },
  { id: 'svg', label: 'SVG', icon: FileImage },
  { id: 'png', label: 'PNG', icon: Image },
]

const FLOW_EXPORT: ExportMenuItem[] = [
  { id: 'envelope-json', label: 'Editor context JSON', icon: FileJson },
  { id: 'native-json', label: 'Flow JSON', icon: Braces },
  { id: 'png', label: 'PNG', icon: Image },
]

const FORCE_EXPORT: ExportMenuItem[] = [
  { id: 'envelope-json', label: 'Editor context JSON', icon: FileJson },
  { id: 'native-json', label: 'Graph JSON', icon: Braces },
  { id: 'svg', label: 'SVG', icon: FileImage },
  { id: 'png', label: 'PNG', icon: Image },
]

const BOT_EXPORT: ExportMenuItem[] = [
  { id: 'envelope-json', label: 'Editor context JSON', icon: FileJson },
  { id: 'native-json', label: 'Chat snapshot JSON', icon: Braces },
]

const DM_EXPORT: ExportMenuItem[] = [
  { id: 'envelope-json', label: 'Editor context JSON', icon: FileJson },
  { id: 'native-json', label: 'Chat snapshot JSON', icon: Braces },
]

const CALENDAR_EXPORT: ExportMenuItem[] = [
  { id: 'envelope-json', label: 'Editor context JSON', icon: FileJson },
  { id: 'native-json', label: 'Calendar snapshot JSON', icon: Braces },
]

const TESTFORM_EXPORT: ExportMenuItem[] = [
  { id: 'envelope-json', label: 'Editor context JSON', icon: FileJson },
  { id: 'native-json', label: 'Test form JSON', icon: Braces },
]

export function exportMenuItemsForKind(kind: EditorKind): ExportMenuItem[] {
  switch (kind) {
    case 'doc':
      return DOC_EXPORT
    case 'grid':
      return GRID_EXPORT
    case 'draw':
      return DRAW_EXPORT
    case 'markdown':
      return MARKDOWN_EXPORT
    case 'mermaid':
      return MERMAID_EXPORT
    case 'code':
      return CODE_EXPORT
    case 'flow':
      return FLOW_EXPORT
    case 'force':
      return FORCE_EXPORT
    case 'bot':
      return BOT_EXPORT
    case 'dm':
      return DM_EXPORT
    case 'calendar':
      return CALENDAR_EXPORT
    case 'testform':
      return TESTFORM_EXPORT
    default:
      return []
  }
}

export const DEMO_SCENARIOS: Record<EditorKind, import('./types').DemoScenario[]> = {
  doc: [
    { id: 'doc-native', label: 'Native JSON→Doc', sourceKind: 'doc', sourceFormat: 'native-json', fixtureId: 'doc.lexical.full' },
    { id: 'doc-md', label: 'Markdown→Doc', sourceKind: 'markdown', sourceFormat: 'markdown', fixtureId: 'doc.markdown.full' },
    { id: 'doc-csv', label: 'CSV→Doc', sourceKind: 'grid', sourceFormat: 'csv', fixtureId: 'grid.csv.complex' },
    { id: 'doc-mmd', label: 'Mermaid→Doc', sourceKind: 'mermaid', sourceFormat: 'mermaid', fixtureId: 'doc.mermaid.fixture' },
  ],
  grid: [
    { id: 'grid-native', label: 'Native JSON→Grid', sourceKind: 'grid', sourceFormat: 'native-json', fixtureId: 'grid.sheet.complex' },
    { id: 'grid-csv', label: 'CSV→Grid', sourceKind: 'grid', sourceFormat: 'csv', fixtureId: 'grid.csv.complex' },
    { id: 'grid-envelope', label: 'Envelope→Grid', sourceKind: 'grid', sourceFormat: 'envelope-json', fixtureId: 'grid.sheet.complex' },
  ],
  draw: [
    { id: 'draw-native', label: 'Native JSON→Draw', sourceKind: 'draw', sourceFormat: 'excalidraw', fixtureId: 'draw.excalidraw.complex' },
    { id: 'draw-mmd', label: 'Mermaid→Draw', sourceKind: 'mermaid', sourceFormat: 'mermaid', fixtureId: 'mermaid.sample.complex' },
    { id: 'draw-cross', label: 'Cross org→Draw', sourceKind: 'draw', sourceFormat: 'excalidraw', fixtureId: 'cross.org-chart.draw.complex' },
  ],
  markdown: [
    { id: 'md-native', label: 'Native MD→Markdown', sourceKind: 'markdown', sourceFormat: 'markdown', fixtureId: 'markdown.sample.complex' },
    { id: 'md-mmd', label: 'Mermaid→Markdown', sourceKind: 'mermaid', sourceFormat: 'mermaid', fixtureId: 'mermaid.sample.complex' },
    { id: 'md-cross', label: 'Cross org→Markdown', sourceKind: 'markdown', sourceFormat: 'markdown', fixtureId: 'cross.org-chart.markdown.complex' },
  ],
  mermaid: [
    { id: 'mmd-native', label: 'Native MMD→Mermaid', sourceKind: 'mermaid', sourceFormat: 'mermaid', fixtureId: 'mermaid.sample.complex' },
    { id: 'mmd-md', label: 'Markdown→Mermaid', sourceKind: 'markdown', sourceFormat: 'markdown', fixtureId: 'cross.org-chart.markdown.complex' },
    { id: 'mmd-draw', label: 'Draw→Mermaid', sourceKind: 'draw', sourceFormat: 'excalidraw', fixtureId: 'draw.excalidraw.complex' },
  ],
  code: [
    { id: 'code-native', label: 'Workspace JSON→Code', sourceKind: 'code', sourceFormat: 'native-json', fixtureId: 'code.workspace.sample' },
  ],
  flow: [
    { id: 'flow-math', label: 'Math solver→Flow', sourceKind: 'flow', sourceFormat: 'native-json', fixtureId: 'flow.math-solver.sample' },
    { id: 'flow-questionnaire', label: 'Questionnaire→Flow', sourceKind: 'flow', sourceFormat: 'native-json', fixtureId: 'flow.questionnaire.sample' },
  ],
  force: [
    {
      id: 'force-native',
      label: 'Native JSON→Force',
      sourceKind: 'force',
      sourceFormat: 'native-json',
      fixtureId: 'force.sample.complex',
    },
    {
      id: 'force-envelope',
      label: 'Envelope→Force',
      sourceKind: 'force',
      sourceFormat: 'envelope-json',
      fixtureId: 'force.sample.complex',
    },
  ],
  bot: [
    {
      id: 'bot-native',
      label: 'Native JSON→BotChat',
      sourceKind: 'bot',
      sourceFormat: 'native-json',
      fixtureId: 'bot.seed.sample',
    },
    {
      id: 'bot-envelope',
      label: 'Envelope→BotChat',
      sourceKind: 'bot',
      sourceFormat: 'envelope-json',
      fixtureId: 'bot.seed.sample',
    },
  ],
  dm: [
    {
      id: 'dm-native',
      label: 'Native JSON→DmChat',
      sourceKind: 'dm',
      sourceFormat: 'native-json',
      fixtureId: 'dm.seed.sample',
    },
    {
      id: 'dm-envelope',
      label: 'Envelope→DmChat',
      sourceKind: 'dm',
      sourceFormat: 'envelope-json',
      fixtureId: 'dm.seed.sample',
    },
  ],
  calendar: [
    {
      id: 'calendar-native',
      label: 'Native JSON→Calendar',
      sourceKind: 'calendar',
      sourceFormat: 'native-json',
      fixtureId: 'calendar.seed.sample',
    },
    {
      id: 'calendar-envelope',
      label: 'Envelope→Calendar',
      sourceKind: 'calendar',
      sourceFormat: 'envelope-json',
      fixtureId: 'calendar.seed.sample',
    },
  ],
  testform: [
    {
      id: 'testform-native',
      label: 'Native JSON→TestForm',
      sourceKind: 'testform',
      sourceFormat: 'native-json',
      fixtureId: 'testform.sample',
    },
    {
      id: 'testform-take',
      label: 'Take JSON→TestForm',
      sourceKind: 'testform',
      sourceFormat: 'native-json',
      fixtureId: 'testform.take',
    },
    {
      id: 'testform-envelope',
      label: 'Envelope→TestForm',
      sourceKind: 'testform',
      sourceFormat: 'envelope-json',
      fixtureId: 'testform.sample',
    },
  ],
}
