import {
  AppWindow,
  ChevronDown,
  Hash,
  LayoutTemplate,
  MessageSquare,
  Network,
  Sparkles,
  Tags,
  Type,
} from 'lucide-react'
import { registerFlowElements } from '../flowEditor/flowElementRegistry'
import type { FlowElementDefinition, FlowPort } from '../flowEditor/types'
import { MOCKUP_TOOLKIT, type MockupKind, type MockupNodeConfig } from './types'

const PORTS: FlowPort[] = [
  { id: 'in', direction: 'in', label: 'from' },
  { id: 'out', direction: 'out', label: 'to' },
]

function config(partial: MockupNodeConfig): MockupNodeConfig {
  return partial
}

function mockupElement(
  kind: MockupKind,
  partial: Pick<FlowElementDefinition, 'label' | 'paletteSection' | 'icon' | 'defaultConfig'>,
): FlowElementDefinition {
  return {
    ...partial,
    kind: `mockup.${kind}`,
    category: 'display',
    contentRenderer: 'mockup',
    collapsible: true,
    previewWhenCollapsed: true,
    defaultSize: 'lg',
    allowPortEdit: false,
    defaultPorts: PORTS,
    toolkits: MOCKUP_TOOLKIT,
  }
}

export const MOCKUP_ELEMENTS: FlowElementDefinition[] = [
  mockupElement('title', {
    label: 'Title',
    paletteSection: 'Titles',
    icon: Type,
    defaultConfig: config({
      kicker: 'Section',
      title: 'Display title',
      body: 'Short supporting line.',
    }),
  }),
  mockupElement('gleam', {
    label: 'Gleam card',
    paletteSection: 'Titles',
    icon: Sparkles,
    defaultConfig: config({
      kicker: 'Signature',
      title: 'Gleam surface',
      body: 'Accent shine across the card.',
      gleam: true,
    }),
  }),
  mockupElement('expand', {
    label: 'Expand fold',
    paletteSection: 'Structure',
    icon: ChevronDown,
    defaultConfig: config({
      kicker: 'Detail',
      title: 'Folded body',
      body: 'Extra copy lives behind the fold.',
      defaultOpen: false,
    }),
  }),
  mockupElement('window', {
    label: 'Window',
    paletteSection: 'Structure',
    icon: AppWindow,
    defaultConfig: config({
      kicker: 'app.vurify.org',
      title: 'Product window',
      body: 'Page copy inside fake chrome.',
    }),
  }),
  mockupElement('pills', {
    label: 'Icon pills',
    paletteSection: 'Labels',
    icon: Tags,
    defaultConfig: config({
      title: 'Stage kit',
      iconId: 'layers',
      pills: 'Talk, Form, Coding',
    }),
  }),
  mockupElement('callout', {
    label: 'Callout',
    paletteSection: 'Labels',
    icon: MessageSquare,
    defaultConfig: config({
      iconId: 'shield',
      title: 'Callout title',
      body: 'Short supporting note.',
    }),
  }),
  mockupElement('step', {
    label: 'Step',
    paletteSection: 'Diagram',
    icon: Hash,
    defaultConfig: config({
      step: '01',
      title: 'Named beat',
      body: 'What happens in this step.',
    }),
  }),
  mockupElement('hub', {
    label: 'Hub',
    paletteSection: 'Diagram',
    icon: Network,
    defaultConfig: config({
      kicker: 'Orchestrator',
      title: 'Hub',
      body: 'Branches read as satellites.',
    }),
  }),
  mockupElement('metric', {
    label: 'Metric',
    paletteSection: 'Diagram',
    icon: LayoutTemplate,
    defaultConfig: config({
      metric: '4',
      kicker: 'Beats',
      title: 'Caption',
      body: 'Outcome without a chart.',
    }),
  }),
]

let registered = false

export function ensureMockupElementsRegistered(): void {
  if (registered) return
  registerFlowElements(MOCKUP_ELEMENTS)
  registered = true
}
