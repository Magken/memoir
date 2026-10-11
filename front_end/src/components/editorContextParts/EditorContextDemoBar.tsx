import { useCallback, useState } from 'react'
import { Button } from '../Button'
import { DEFAULT_PAGE_SETUP } from '../../lib/docEditor/pageSetup'
import { createEnvelope } from '../../lib/editorContext/envelope'
import { DEMO_SCENARIOS } from '../../lib/editorContext/exportMenuItems'
import { loadFixture } from '../../lib/editorContext/fixtures'
import { importContext, importFixture } from '../../lib/editorContext/importExportManager'
import type { DemoScenario, EditorKind, EditorPayloadByKind, EditorRuntimeHandle } from '../../lib/editorContext/types'

type EditorContextDemoBarProps = {
  targetKind: EditorKind
  runtimeRef: React.RefObject<EditorRuntimeHandle | null>
  scenarios?: DemoScenario[]
  title?: string
}

function payloadFromFixture(kind: EditorKind, _fixtureId: string, raw: unknown): EditorPayloadByKind[EditorKind] {
  switch (kind) {
    case 'doc':
      return { lexical: raw, pageSetup: DEFAULT_PAGE_SETUP }
    case 'grid':
      return raw as EditorPayloadByKind['grid']
    case 'draw':
      return { scene: raw }
    case 'markdown':
      return { mode: 'markdown', markdown: String(raw), latex: '' }
    case 'mermaid':
      return { source: String(raw) }
    case 'force':
      return { source: String(raw) }
    case 'code':
      return raw as EditorPayloadByKind['code']
    case 'flow':
      return raw as EditorPayloadByKind['flow']
    default:
      return raw as EditorPayloadByKind[EditorKind]
  }
}

export function EditorContextDemoBar({
  targetKind,
  runtimeRef,
  scenarios,
  title = 'Context import demos — loads bundled fixtures via editorContext manager.',
}: EditorContextDemoBarProps) {
  const [lastWarning, setLastWarning] = useState<string | null>(null)
  const rows = scenarios ?? DEMO_SCENARIOS[targetKind]

  const runScenario = useCallback(
    async (scenario: DemoScenario) => {
      const runtime = runtimeRef.current
      if (!runtime) {
        setLastWarning('Editor runtime is not ready.')
        return
      }
      setLastWarning(null)
      let result
      if (scenario.fixtureId === 'doc.lexical.full') {
        const { DOC_FULL_PAYLOAD } = await import('../../lib/docEditor/buildDocLexicalFullFixture')
        result = await importContext(targetKind, DOC_FULL_PAYLOAD, scenario.sourceFormat, runtime)
      } else if (scenario.fixtureId === 'doc.markdown.full') {
        const { DOC_MARKDOWN_FULL_PAYLOAD } = await import('../../lib/docEditor/buildDocMarkdownFullFixture')
        result = await importContext(targetKind, DOC_MARKDOWN_FULL_PAYLOAD, scenario.sourceFormat, runtime)
      } else if (scenario.sourceFormat === 'envelope-json') {
        const raw = loadFixture(scenario.fixtureId)
        const envelope = createEnvelope(
          scenario.sourceKind,
          payloadFromFixture(scenario.sourceKind, scenario.fixtureId, raw),
          { title: scenario.label },
        )
        result = await importContext(targetKind, envelope, 'envelope-json', runtime)
      } else {
        result = await importFixture(targetKind, scenario.fixtureId, scenario.sourceFormat, runtime)
      }
      if (result.warnings?.length) {
        setLastWarning(result.warnings.join(' '))
      } else if (!result.ok) {
        setLastWarning('Import failed.')
      }
    },
    [runtimeRef, targetKind],
  )

  return (
    <div className="theme-editor-context-demo space-y-2">
      <p className="type-caption type-faint">{title}</p>
      <div className="theme-editor-context-demo__row flex flex-wrap gap-2">
        {rows.map((scenario) => (
          <Button key={scenario.id} size="xs" variant="outline" onClick={() => void runScenario(scenario)}>
            {scenario.label}
          </Button>
        ))}
      </div>
      {lastWarning ? (
        <p className="type-caption text-amber-600 dark:text-amber-400" role="status">
          {lastWarning}
        </p>
      ) : null}
    </div>
  )
}
