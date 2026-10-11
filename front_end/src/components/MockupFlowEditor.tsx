import { useMemo } from 'react'
import { FlowEditor, type FlowEditorVariant } from './FlowEditor'
import type { FlowLayoutDirection } from '../lib/flowEditor/reactFlowBridge'
import type { FlowDocument } from '../lib/flowEditor/types'
import { createBlankMockupFlow, ensureMockupToolkit } from '../lib/mockups'

ensureMockupToolkit()

type MockupFlowEditorProps = {
  className?: string
  variant?: FlowEditorVariant
  initialTitle?: string
  flow?: FlowDocument
  /** Run dagre once after first paint (deck viewer). */
  autoLayoutOnReady?: FlowLayoutDirection
}

export function MockupFlowEditor({
  className = '',
  variant,
  initialTitle = 'Untitled mockup flow',
  flow,
  autoLayoutOnReady,
}: MockupFlowEditorProps) {
  const seed = useMemo(() => flow ?? createBlankMockupFlow(), [flow])

  return (
    <FlowEditor
      className={['theme-mockup-flow-editor', className].filter(Boolean).join(' ')}
      variant={variant}
      initialTitle={initialTitle}
      flow={seed}
      toolkit="mockup"
      autoLayoutOnReady={autoLayoutOnReady}
    />
  )
}
