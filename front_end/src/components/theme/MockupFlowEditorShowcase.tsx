import { useMemo, useState } from 'react'
import { MockupFlowEditor } from '../MockupFlowEditor'
import { Button } from '../Button'
import {
  createBlankMockupFlow,
  createVerifiedGradingMockupFlow,
  ensureMockupToolkit,
} from '../../lib/mockups'

ensureMockupToolkit()

type StarterId = 'grading' | 'blank'

export function MockupFlowEditorShowcase() {
  const [starter, setStarter] = useState<StarterId>('grading')
  const flow = useMemo(
    () => (starter === 'grading' ? createVerifiedGradingMockupFlow() : createBlankMockupFlow()),
    [starter],
  )

  return (
    <div className="space-y-8">
      <p className="type-body-sm type-muted prose-measure">
        FlowEditor toolkit for composed mockup diagrams. Nodes preview the same blocks as the
        Mockups section while collapsed; expand a node to edit copy, pills, and gleam.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <span className="type-label">Starter</span>
        <Button
          size="xs"
          variant={starter === 'grading' ? 'tray' : 'ghost'}
          aria-pressed={starter === 'grading'}
          onClick={() => setStarter('grading')}
        >
          Verified grading
        </Button>
        <Button
          size="xs"
          variant={starter === 'blank' ? 'tray' : 'ghost'}
          aria-pressed={starter === 'blank'}
          onClick={() => setStarter('blank')}
        >
          Blank
        </Button>
      </div>

      <MockupFlowEditor
        key={starter}
        initialTitle={starter === 'grading' ? 'Verified grading' : 'Untitled mockup flow'}
        flow={flow}
        className="theme-flow-editor--showcase"
      />
    </div>
  )
}
