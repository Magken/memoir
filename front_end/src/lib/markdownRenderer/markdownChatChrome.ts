import { createContext, useContext } from 'react'

export type MarkdownChatChrome = {
  onWorkspacePathClick?: (path: string) => void
}

export const MarkdownChatChromeContext = createContext<MarkdownChatChrome>({})

export function useMarkdownChatChrome(): MarkdownChatChrome {
  return useContext(MarkdownChatChromeContext)
}
