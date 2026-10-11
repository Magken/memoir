import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

/** Layout-owned CV slots — never set by the format tray. */
export type FieldRole =
  | 'display'
  | 'lead'
  | 'section'
  | 'entry'
  | 'org'
  | 'date'
  | 'body'
  | 'list'
  | 'meta'

type FormatContextValue = {
  focusedFieldId: string | null
  setFocusedFieldId: (id: string | null) => void
}

const FormatContext = createContext<FormatContextValue | null>(null)

export function ViewerFormatProvider({ children }: { children: ReactNode }) {
  const [focusedFieldId, setFocusedFieldId] = useState<string | null>(null)

  const value = useMemo<FormatContextValue>(
    () => ({ focusedFieldId, setFocusedFieldId }),
    [focusedFieldId],
  )

  return <FormatContext.Provider value={value}>{children}</FormatContext.Provider>
}

export function useViewerFormat(): FormatContextValue {
  const ctx = useContext(FormatContext)
  if (!ctx) {
    return {
      focusedFieldId: null,
      setFocusedFieldId: () => undefined,
    }
  }
  return ctx
}

export function fieldSlotClassName(role: FieldRole | undefined): string {
  return ['theme-vurify-viewer__field', role ? `theme-vurify-viewer__field--${role}` : '']
    .filter(Boolean)
    .join(' ')
}
