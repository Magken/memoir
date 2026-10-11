import type { MockupKind, MockupNodeConfig } from './types'

export type MockupCatalogEntry = {
  id: string
  kind: MockupKind
  name: string
  group: 'Titles' | 'Motion' | 'Structure' | 'Labels' | 'Diagram'
  purpose: string
  sample: MockupNodeConfig
}

export const MOCKUP_CATALOG: readonly MockupCatalogEntry[] = [
  {
    id: 'title-kicker',
    kind: 'title',
    name: 'Title + kicker',
    group: 'Titles',
    purpose: 'Display heading with a short overline — section titles on a mockup canvas.',
    sample: {
      kicker: 'Candidate day',
      title: 'Verified grading',
      body: 'Score traces stay attached to the work, not a separate spreadsheet.',
    },
  },
  {
    id: 'gleam-card',
    kind: 'gleam',
    name: 'Gleam card',
    group: 'Motion',
    purpose: 'Raised surface with a slow accent shine. Reduced-motion users see a still card.',
    sample: {
      kicker: 'Signature',
      title: 'Gleam surface',
      body: 'A light sweep across theme tokens — no hardcoded accent hex.',
      gleam: true,
    },
  },
  {
    id: 'expand-fold',
    kind: 'expand',
    name: 'Expand / contract',
    group: 'Structure',
    purpose: 'Folded body with matched open and close (CSS grid 0fr / 1fr).',
    sample: {
      kicker: 'Detail',
      title: 'What the scorer saw',
      body: 'Rubric notes, evidence clips, and the decision package sit behind the fold so the diagram stays quiet until you need them.',
      defaultOpen: false,
    },
  },
  {
    id: 'window-chrome',
    kind: 'window',
    name: 'Window chrome',
    group: 'Structure',
    purpose: 'Fake browser bar around a page title — product-in-product mockups.',
    sample: {
      kicker: 'app.vurify.org/interview',
      title: 'Interview stage',
      body: 'Talk, form, and tool panes compose in the same shell.',
    },
  },
  {
    id: 'icon-pills',
    kind: 'pills',
    name: 'Icon + pill tags',
    group: 'Labels',
    purpose: 'VurifyIcon with Tag pills — capability chips, not clickable Chip buttons.',
    sample: {
      title: 'Stage kit',
      iconId: 'layers',
      pills: 'Talk, Form, Coding, Writing',
    },
  },
  {
    id: 'callout',
    kind: 'callout',
    name: 'Icon callout',
    group: 'Labels',
    purpose: 'Icon, title, and a short body — callouts beside a hub or step.',
    sample: {
      iconId: 'shield',
      title: 'Evidence stays with the score',
      body: 'Reviewers open the same package the model graded — no copy-paste into a second tool.',
    },
  },
  {
    id: 'step',
    kind: 'step',
    name: 'Numbered step',
    group: 'Diagram',
    purpose: 'Ordinal beat for linear mockup flows.',
    sample: {
      step: '02',
      title: 'Score',
      body: 'Rubric marks land on the same artifact the candidate submitted.',
    },
  },
  {
    id: 'hub',
    kind: 'hub',
    name: 'Accent hub',
    group: 'Diagram',
    purpose: 'Orchestrator node — slightly accent-washed so branches read as satellites.',
    sample: {
      kicker: 'Orchestrator',
      title: 'Verified grading',
      body: 'Capture, score, review, and report share one package.',
    },
  },
  {
    id: 'metric',
    kind: 'metric',
    name: 'Metric tile',
    group: 'Diagram',
    purpose: 'Large figure plus caption — outcomes without a chart.',
    sample: {
      metric: '4',
      kicker: 'Beats',
      title: 'Capture → report',
      body: 'One package, four named steps.',
    },
  },
]

export const MOCKUP_CATALOG_GROUPS: readonly MockupCatalogEntry['group'][] = [
  'Titles',
  'Motion',
  'Structure',
  'Labels',
  'Diagram',
]
