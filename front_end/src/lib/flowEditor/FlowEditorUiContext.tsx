import { createContext, useContext, type ReactNode } from 'react'
import type { FlowLayoutMode } from './reactFlowBridge'
import type { FlowPort, FlowToolkitId } from './types'

export type FlowEditorUiContextValue = {
  /** Active palette / template toolkit. */
  toolkit: FlowToolkitId
  layoutMode: FlowLayoutMode
  /** Last directed layout — used when layoutMode is `free`. */
  lastDirectedLayout: Exclude<FlowLayoutMode, 'free'>
  isContentExpanded: (nodeId: string) => boolean
  setContentExpanded: (nodeId: string, expanded: boolean) => void
  updateNodeLabel: (nodeId: string, label: string) => void
  updateGroupLabel: (groupId: string, label: string) => void
  updateNodeNotes: (nodeId: string, notes: string) => void
  updateGroupNotes: (groupId: string, notes: string) => void
  updateDocumentNotes: (notes: string) => void
  updateNodeConfig: (nodeId: string, config: Record<string, unknown>) => void
  updatePortLabel: (nodeId: string, portId: string, label: string) => void
  addPort: (nodeId: string, direction: FlowPort['direction']) => void
  removePort: (nodeId: string, portId: string) => void
  /** Spawn a quick-action child and connect parent out → child in. */
  runQuickAction: (nodeId: string, actionId: string) => void
  duplicateNode: (nodeId: string) => void
  deleteNode: (nodeId: string) => void
  portHasEdges: (nodeId: string, portId: string) => boolean
  /** Label of the node connected from this source handle, if any. */
  connectedTargetLabel: (nodeId: string, sourceHandle: string) => string | null
}

const FlowEditorUiContext = createContext<FlowEditorUiContextValue | null>(null)

export function FlowEditorUiProvider({
  value,
  children,
}: {
  value: FlowEditorUiContextValue
  children: ReactNode
}) {
  return <FlowEditorUiContext.Provider value={value}>{children}</FlowEditorUiContext.Provider>
}

export function useFlowEditorUi(): FlowEditorUiContextValue {
  const ctx = useContext(FlowEditorUiContext)
  if (!ctx) {
    return {
      toolkit: 'default',
      layoutMode: 'free',
      lastDirectedLayout: 'LR',
      isContentExpanded: () => false,
      setContentExpanded: () => undefined,
      updateNodeLabel: () => undefined,
      updateGroupLabel: () => undefined,
      updateNodeNotes: () => undefined,
      updateGroupNotes: () => undefined,
      updateDocumentNotes: () => undefined,
      updateNodeConfig: () => undefined,
      updatePortLabel: () => undefined,
      addPort: () => undefined,
      removePort: () => undefined,
      runQuickAction: () => undefined,
      duplicateNode: () => undefined,
      deleteNode: () => undefined,
      portHasEdges: () => false,
      connectedTargetLabel: () => null,
    }
  }
  return ctx
}
