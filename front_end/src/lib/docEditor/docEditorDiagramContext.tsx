import { createContext, useContext, type ReactNode, type RefObject } from 'react'

type DocEditorDiagramContextValue = {
  defaultHeightRef: RefObject<number>
  showViewOptions: boolean
}

const DocEditorDiagramContext = createContext<DocEditorDiagramContextValue | null>(null)

export function DocEditorDiagramProvider({
  children,
  showViewOptions,
  defaultHeightRef,
}: {
  children: ReactNode
  showViewOptions: boolean
  defaultHeightRef: RefObject<number>
}) {
  return (
    <DocEditorDiagramContext.Provider value={{ defaultHeightRef, showViewOptions }}>
      {children}
    </DocEditorDiagramContext.Provider>
  )
}

export function useDocEditorDiagramOptions(): DocEditorDiagramContextValue {
  const value = useContext(DocEditorDiagramContext)
  if (!value) {
    return {
      defaultHeightRef: { current: 480 },
      showViewOptions: true,
    }
  }
  return value
}
