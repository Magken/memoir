import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { DocEditorInsertModalRequest } from './docEditorInsertModalTypes'

type DocEditorInsertModalContextValue = {
  request: DocEditorInsertModalRequest | null
  openInsertModal: (request: DocEditorInsertModalRequest) => void
  closeInsertModal: () => void
}

const DocEditorInsertModalContext = createContext<DocEditorInsertModalContextValue | null>(null)

export function DocEditorInsertModalProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<DocEditorInsertModalRequest | null>(null)

  const openInsertModal = useCallback((next: DocEditorInsertModalRequest) => {
    setRequest(next)
  }, [])

  const closeInsertModal = useCallback(() => {
    setRequest(null)
  }, [])

  const value = useMemo(
    () => ({ request, openInsertModal, closeInsertModal }),
    [request, openInsertModal, closeInsertModal],
  )

  return (
    <DocEditorInsertModalContext.Provider value={value}>{children}</DocEditorInsertModalContext.Provider>
  )
}

export function useDocEditorInsertModal(): DocEditorInsertModalContextValue {
  const context = useContext(DocEditorInsertModalContext)
  if (!context) {
    throw new Error('useDocEditorInsertModal must be used within DocEditorInsertModalProvider')
  }
  return context
}
