import { languageFromPath, resolveEditorLanguage } from './languageFromPath'

/** Word completions from sibling workspace files (Python/Go/etc. have no TS worker). */

const IDENT = /\b[A-Za-z_][A-Za-z0-9_]*\b/g
const SKIP = new Set([
  'if', 'else', 'elif', 'for', 'while', 'def', 'class', 'return', 'import', 'from',
  'true', 'false', 'none', 'null', 'var', 'let', 'const', 'function', 'this',
])

const EXTRA_LANGS = [
  'python',
  'go',
  'java',
  'csharp',
  'cpp',
  'c',
  'rust',
  'ruby',
  'kotlin',
  'swift',
  'php',
  'scala',
  'dart',
  'lua',
  'r',
  'haskell',
  'elixir',
  'perl',
  'fsharp',
  'clojure',
  'shell',
] as const

type WorkspaceFile = { path: string; language: string; content: string }

type MonacoApi = {
  languages: {
    registerCompletionItemProvider: (
      lang: string,
      provider: {
        triggerCharacters?: string[]
        provideCompletionItems: (...args: never[]) => unknown
      },
    ) => { dispose: () => void }
    CompletionItemKind?: { Function?: number; Variable?: number }
  }
}

let installed = new WeakSet<object>()

function identifiersIn(content: string): string[] {
  const out = new Set<string>()
  const text = String(content ?? '')
  for (const match of text.matchAll(IDENT)) {
    const word = match[0]
    if (word.length < 2 || SKIP.has(word.toLowerCase())) continue
    out.add(word)
  }
  return [...out]
}

export function installWorkspaceCompletions(
  monaco: MonacoApi,
  getFiles: () => readonly WorkspaceFile[],
): void {
  if (installed.has(monaco as object)) return
  installed.add(monaco as object)
  const kindFn = monaco.languages.CompletionItemKind?.Function ?? 1
  const kindVar = monaco.languages.CompletionItemKind?.Variable ?? 6

  const provide = (
    model: { getLanguageId?: () => string; getWordUntilPosition: (pos: unknown) => { word: string; startColumn: number; endColumn: number } },
    position: { lineNumber: number; column: number },
  ) => {
    const lang = model.getLanguageId?.() ?? ''
    const word = model.getWordUntilPosition(position)
    const prefix = word.word.toLowerCase()
    const seen = new Set<string>()
    const suggestions: Array<Record<string, unknown>> = []
    for (const file of getFiles()) {
      const fileLang = resolveEditorLanguage(file.path, file.language)
      if (fileLang !== lang && languageFromPath(file.path) !== lang) continue
      for (const ident of identifiersIn(file.content)) {
        if (prefix && !ident.toLowerCase().startsWith(prefix)) continue
        if (seen.has(ident)) continue
        seen.add(ident)
        suggestions.push({
          label: ident,
          kind: ident[0] === ident[0]?.toLowerCase() ? kindVar : kindFn,
          insertText: ident,
          detail: file.path,
          range: {
            startLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endLineNumber: position.lineNumber,
            endColumn: word.endColumn,
          },
        })
      }
    }
    return { suggestions }
  }

  for (const lang of EXTRA_LANGS) {
    monaco.languages.registerCompletionItemProvider(lang, {
      triggerCharacters: ['.', '_'],
      provideCompletionItems: ((model: unknown, position: unknown) =>
        provide(
          model as Parameters<typeof provide>[0],
          position as Parameters<typeof provide>[1],
        )) as (model: never, position: never) => unknown,
    })
  }
}
