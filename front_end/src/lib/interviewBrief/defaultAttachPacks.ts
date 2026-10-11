/** Built-in analysis.attachPacks map — shelf reset + legacy expand (not Creator UI). */

import { discussionTemplateIdsFromCatalog } from './analysisTemplateCatalog'

export const BUILTIN_ATTACH_PACK_IDS = [
  'pack.shallow',
  'pack.talk',
  'pack.star',
  'pack.conflict',
  'pack.design',
  'pack.coding',
  'pack.form_gate',
] as const

export type BuiltinAttachPackId = (typeof BUILTIN_ATTACH_PACK_IDS)[number]

export const DEFAULT_ATTACH_PACKS: Record<string, string[]> = {
  'pack.shallow': [],
  'pack.talk': ['iv.delivery.v1', 'iv.content.v1', 'synth.topic.v1'],
  'pack.star': ['iv.delivery.v1', 'iv.star.v1', 'synth.topic.v1'],
  'pack.conflict': ['iv.delivery.v1', 'iv.ownership.v1', 'synth.topic.v1'],
  'pack.design': ['iv.delivery.v1', 'iv.tradeoff.v1', 'synth.topic.v1'],
  'pack.coding': [
    'mark.code.tests.v1',
    'mark.code.method.v1',
    'mark.code.structure.v1',
    'synth.tool.v1',
  ],
  'pack.form_gate': ['mark.form.key.v1'],
}

/** Discussion-relevant template ids — from analysisTemplateCatalog.json. */
export const DISCUSSION_TEMPLATE_IDS = discussionTemplateIdsFromCatalog()

export function isBuiltinAttachPack(packId: string): boolean {
  return (BUILTIN_ATTACH_PACK_IDS as readonly string[]).includes(packId)
}

export { attachOverlapWarnings } from './analysisTemplateCatalog'