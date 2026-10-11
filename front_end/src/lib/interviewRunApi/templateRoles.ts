/**
 * Analysis template interpretation roles — grade vs collect vs narrative.
 * Built-ins from catalog; custom templates follow outputKind rules.
 */
import { catalogTemplate } from '../interviewBrief/analysisTemplateCatalog'
import { isOrderedQualityEnum } from './ordinalMaps'

export type TemplateInterpretationRole =
  | 'grade.dimensions'
  | 'grade.passFail'
  | 'grade.scalar'
  | 'grade.enum'
  | 'collect.taxonomy'
  | 'collect.enum'
  | 'collect.targets'
  | 'collect.scalar'
  | 'narrative.paragraph'
  | 'narrative.rollup'

export type DecisionSoftBucket = string

export type TemplateRoleMeta = {
  role: TemplateInterpretationRole
  /** Soft Decision bucket when role is grade.* (formMark = gate only). */
  decisionBucket: string | null
  outputKind: string
}

const BUILTIN: Record<string, TemplateRoleMeta> = {
  'iv.delivery.v1': {
    role: 'grade.dimensions',
    decisionBucket: 'interviewDelivery',
    outputKind: 'dimensions',
  },
  'iv.question.v1': {
    role: 'grade.dimensions',
    decisionBucket: 'interviewDelivery',
    outputKind: 'dimensions',
  },
  'iv.content.v1': {
    role: 'grade.dimensions',
    decisionBucket: 'interviewContent',
    outputKind: 'dimensions',
  },
  'iv.star.v1': {
    role: 'grade.dimensions',
    decisionBucket: 'interviewContent',
    outputKind: 'dimensions',
  },
  'iv.ownership.v1': {
    role: 'grade.dimensions',
    decisionBucket: 'interviewContent',
    outputKind: 'dimensions',
  },
  'iv.tradeoff.v1': {
    role: 'grade.dimensions',
    decisionBucket: 'interviewContent',
    outputKind: 'dimensions',
  },
  'synth.topic.v1': {
    role: 'narrative.paragraph',
    decisionBucket: null,
    outputKind: 'paragraph',
  },
  'synth.tool.v1': {
    role: 'narrative.paragraph',
    decisionBucket: null,
    outputKind: 'paragraph',
  },
  'mark.form.key.v1': {
    role: 'grade.passFail',
    decisionBucket: 'formMark',
    outputKind: 'passFail',
  },
  'mark.form.reasoning.v1': {
    role: 'narrative.paragraph',
    decisionBucket: null,
    outputKind: 'paragraph',
  },
  'mark.code.tests.v1': {
    role: 'grade.passFail',
    decisionBucket: 'codingTests',
    outputKind: 'passFail',
  },
  'mark.code.method.v1': {
    role: 'grade.dimensions',
    decisionBucket: 'codingMethod',
    outputKind: 'dimensions',
  },
  'mark.code.structure.v1': {
    role: 'grade.dimensions',
    decisionBucket: 'codingMethod',
    outputKind: 'dimensions',
  },
  'mark.code.approach.v1': {
    role: 'grade.dimensions',
    decisionBucket: 'codingMethod',
    outputKind: 'dimensions',
  },
  'mark.code.authorship.v1': {
    role: 'grade.dimensions',
    decisionBucket: 'codingMethod',
    outputKind: 'dimensions',
  },
  'mark.assist.use.v1': {
    role: 'grade.dimensions',
    decisionBucket: 'codingMethod',
    outputKind: 'dimensions',
  },
  'mark.doc.essay.v1': {
    role: 'grade.dimensions',
    decisionBucket: 'essay',
    outputKind: 'dimensions',
  },
  'mark.doc.approach.v1': {
    role: 'grade.dimensions',
    decisionBucket: 'essay',
    outputKind: 'dimensions',
  },
  'mark.doc.authorship.v1': {
    role: 'grade.dimensions',
    decisionBucket: 'essay',
    outputKind: 'dimensions',
  },
  'mark.doc.brief.v1': {
    role: 'grade.scalar',
    decisionBucket: 'essay',
    outputKind: 'scalar',
  },
  'rollup.attempt.v1': {
    role: 'narrative.rollup',
    decisionBucket: null,
    outputKind: 'paragraph',
  },
  'sig.security.v1': {
    role: 'collect.scalar',
    decisionBucket: null,
    outputKind: 'scalar',
  },
  'sig.clarity.v1': {
    role: 'collect.scalar',
    decisionBucket: null,
    outputKind: 'scalar',
  },
}

export function resolveTemplateRole(
  templateId: string,
  opts?: {
    outputKind?: string | null
    enumValues?: readonly string[]
    gradeable?: boolean
    decisionBucket?: string | null
  },
): TemplateRoleMeta {
  const builtin = BUILTIN[templateId]
  if (builtin) {
    return {
      ...builtin,
      ...(opts?.decisionBucket !== undefined
        ? { decisionBucket: opts.decisionBucket }
        : {}),
    }
  }

  const entry = catalogTemplate(templateId)
  const outputKind = (opts?.outputKind || entry?.outputKind || 'paragraph').trim()
  const enumValues = opts?.enumValues ?? entry?.enumValues ?? []

  if (templateId.startsWith('sig.')) {
    return { role: 'collect.scalar', decisionBucket: null, outputKind: outputKind || 'scalar' }
  }
  if (outputKind === 'dimensions') {
    return {
      role: 'grade.dimensions',
      decisionBucket: opts?.decisionBucket ?? 'interviewContent',
      outputKind,
    }
  }
  if (outputKind === 'passFail') {
    return {
      role: 'grade.passFail',
      decisionBucket: opts?.decisionBucket ?? 'formMark',
      outputKind,
    }
  }
  if (outputKind === 'scalar') {
    return {
      role: 'grade.scalar',
      decisionBucket: opts?.decisionBucket ?? 'interviewContent',
      outputKind,
    }
  }
  if (outputKind === 'taxonomy') {
    return { role: 'collect.taxonomy', decisionBucket: null, outputKind }
  }
  if (outputKind === 'enum') {
    const ordered =
      opts?.gradeable === true || isOrderedQualityEnum(enumValues)
    return {
      role: ordered ? 'grade.enum' : 'collect.enum',
      decisionBucket: ordered ? opts?.decisionBucket ?? 'interviewContent' : null,
      outputKind,
    }
  }
  if (templateId.startsWith('rollup.')) {
    return { role: 'narrative.rollup', decisionBucket: null, outputKind: 'paragraph' }
  }
  return { role: 'narrative.paragraph', decisionBucket: null, outputKind }
}

export function isGradeRole(role: TemplateInterpretationRole): boolean {
  return role.startsWith('grade.')
}

export function builtinTemplateIds(): string[] {
  return Object.keys(BUILTIN)
}
