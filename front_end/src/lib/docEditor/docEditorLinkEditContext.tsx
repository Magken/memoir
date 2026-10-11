import { createContext, useContext, type Dispatch, type FC, type ReactNode, type SetStateAction } from 'react'

type DocEditorLinkEditContextValue = {
  isLinkEditMode: boolean
  setIsLinkEditMode: Dispatch<SetStateAction<boolean>>
}

const DocEditorLinkEditContext = createContext<DocEditorLinkEditContextValue | null>(null)

type DocEditorLinkEditProviderProps = {
  value: DocEditorLinkEditContextValue
  children: ReactNode
}

export const DocEditorLinkEditProvider: FC<DocEditorLinkEditProviderProps> = function DocEditorLinkEditProvider({
  value,
  children,
}) {
  return <DocEditorLinkEditContext.Provider value={value}>{children}</DocEditorLinkEditContext.Provider>
}

export function useDocEditorLinkEdit(): DocEditorLinkEditContextValue {
  const context = useContext(DocEditorLinkEditContext)
  if (!context) {
    throw new Error('useDocEditorLinkEdit must be used within DocEditorLinkEditProvider')
  }
  return context
}
