import { useRef, useState } from 'react'
import { FlowEditor, type FlowEditorHandle } from '../FlowEditor'
import { Card } from '../Card'
import { ChartCard } from '../ChartCard'
import { FLOW_WORKFLOW_MATH } from '../../lib/flowEditor/workflowBundles/mathSolver'
import { FLOW_WORKFLOW_QUESTIONNAIRE } from '../../lib/flowEditor/workflowBundles/questionnaire'
import { EditorContextDemoBar } from '../editorContextParts/EditorContextDemoBar'
import { EditorFeatureTable } from './EditorFeatureTable'
import { Button } from '../Button'

export function FlowEditorShowcase() {
  const editorRef = useRef<FlowEditorHandle>(null)
  const [prototypeId, setPrototypeId] = useState<'math-solver' | 'questionnaire'>('math-solver')

  return (
    <div className="space-y-8">
      <p className="type-body-sm type-muted prose-measure">
        Full React Flow workbench — palette drag-drop, inspector, edge types/styles, reconnect, auto-layout,
        and MCP context derived from the element registry.
      </p>

      <EditorFeatureTable kind="flow" />

      <div className="flex flex-wrap items-center gap-2">
        <span className="type-label">Prototype</span>
        <Button
          size="xs"
          variant={prototypeId === 'math-solver' ? 'tray' : 'ghost'}
          aria-pressed={prototypeId === 'math-solver'}
          onClick={() => setPrototypeId('math-solver')}
        >
          Math solver
        </Button>
        <Button
          size="xs"
          variant={prototypeId === 'questionnaire' ? 'tray' : 'ghost'}
          aria-pressed={prototypeId === 'questionnaire'}
          onClick={() => setPrototypeId('questionnaire')}
        >
          Questionnaire
        </Button>
      </div>

      <EditorContextDemoBar targetKind="flow" runtimeRef={editorRef} />

      <FlowEditor
        key={prototypeId}
        ref={editorRef}
        prototypeId={prototypeId}
        initialTitle={prototypeId === 'math-solver' ? 'Math solver pipeline' : 'Questionnaire flow'}
        className="theme-flow-editor--showcase"
      />

      <div className="space-y-3">
        <p className="type-label">Embed previews</p>
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard title="Math solver" badge="flow">
            <FlowEditor
              variant="embed"
              flow={FLOW_WORKFLOW_MATH}
              className="theme-flow-editor--showcase-embed"
            />
          </ChartCard>
          <Card variant="outline">
            <div className="space-y-3 p-3">
              <p className="type-h5">Questionnaire</p>
              <p className="type-caption type-muted">Branching Q&A flow with derived MCP tools.</p>
              <FlowEditor
                variant="embed"
                flow={FLOW_WORKFLOW_QUESTIONNAIRE}
                className="theme-flow-editor--showcase-embed"
              />
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
