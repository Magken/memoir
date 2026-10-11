import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { CodeEditorSearchHost } from './searchHotwire'

type CodeEditorSearchHostContextValue = {
  activeHost: CodeEditorSearchHost | null
  setHost: (fileId: string, host: CodeEditorSearchHost | null) => void
}

const CodeEditorSearchHostContext = createContext<CodeEditorSearchHostContextValue | null>(null)

type CodeEditorSearchHostProviderProps = {
  activeFileId: string | null
  children: ReactNode
}

export function CodeEditorSearchHostProvider({
  activeFileId,
  children,
}: CodeEditorSearchHostProviderProps) {
  const hostsRef = useRef(new Map<string, CodeEditorSearchHost>())
  const [revision, setRevision] = useState(0)

  const setHost = useCallback((fileId: string, host: CodeEditorSearchHost | null) => {
    if (host) hostsRef.current.set(fileId, host)
    else hostsRef.current.delete(fileId)
    setRevision((value) => value + 1)
  }, [])

  const activeHost = useMemo(() => {
    if (!activeFileId) return null
    return hostsRef.current.get(activeFileId) ?? null
    // revision bumps when any host registers
  }, [activeFileId, revision])

  const value = useMemo(
    () => ({
      activeHost,
      setHost,
    }),
    [activeHost, setHost],
  )

  return (
    <CodeEditorSearchHostContext.Provider value={value}>
      {children}
    </CodeEditorSearchHostContext.Provider>
  )
}

export function useCodeEditorSearchHostContext() {
  return useContext(CodeEditorSearchHostContext)
}

export function useRegisterCodeEditorSearchHost(
  fileId: string,
  enabled: boolean,
  host: CodeEditorSearchHost | null,
) {
  const context = useCodeEditorSearchHostContext()

  useEffect(() => {
    if (!context) return undefined
    if (!enabled || !host) {
      context.setHost(fileId, null)
      return undefined
    }
    context.setHost(fileId, host)
    return () => {
      context.setHost(fileId, null)
    }
  }, [context, enabled, fileId, host])
}
