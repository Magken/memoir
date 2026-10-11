import { forwardRef, useImperativeHandle } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $getRoot, type SerializedEditorState } from 'lexical'
import { buildDocExportHtml } from '../../lib/docEditor/docHtmlExport'
import { openDocExportPrintView } from '../../lib/docEditor/docPdfExport'
import { exportMarkdownFromRoot, loadMarkdownIntoRoot } from '../../lib/docEditor/docMarkdown'
import type { PageSetup } from '../../lib/docEditor/pageSetup'
import { DEFAULT_PAGE_SETUP } from '../../lib/docEditor/pageSetup'
import { EMPTY_LEXICAL_STATE } from '../../lib/editorContext/fixtures'
import { docEditorLoadKind } from '../../lib/docEditor/docEditorLoadKind'

export type DocEditorLexicalBridge = {
  getEditorStateJson: () => SerializedEditorState
  exportMarkdown: () => string
  loadEditorStateJson: (json: unknown, opts?: { markdown?: string }) => void
  exportHtml: (opts: { pageSetup: PageSetup; title: string }) => Promise<string>
  exportPdf: (opts: { pageSetup: PageSetup; title: string }) => Promise<void>
}

export const DocEditorContextBridge = forwardRef<DocEditorLexicalBridge>(function DocEditorContextBridge(_props, ref) {
  const [editor] = useLexicalComposerContext()

  useImperativeHandle(
    ref,
    () => ({
      getEditorStateJson() {
        return editor.getEditorState().toJSON()
      },
      exportMarkdown() {
        return editor.getEditorState().read(() => exportMarkdownFromRoot($getRoot()))
      },
      loadEditorStateJson(json: unknown, opts?: { markdown?: string }) {
        if (opts?.markdown) {
          editor.update(() => {
            loadMarkdownIntoRoot($getRoot(), opts.markdown!)
          })
          return
        }
        const stateJson = json ?? EMPTY_LEXICAL_STATE
        const parsed = editor.parseEditorState(JSON.stringify(stateJson))
        editor.setEditorState(parsed)
      },
      exportHtml(opts) {
        return buildDocExportHtml({ editor, ...opts })
      },
      exportPdf(opts) {
        return openDocExportPrintView({ editor, ...opts })
      },
    }),
    [editor],
  )

  return null
})

export type DocEditorContextPayload = {
  title?: string
  pageSetup?: PageSetup
  lexical?: unknown
  markdown?: string
}

export function resolveDocEditorPayload(
  bridge: DocEditorLexicalBridge | null,
  title: string,
  pageSetup: PageSetup,
): { lexical: SerializedEditorState; pageSetup: PageSetup; title: string; markdown: string } {
  return {
    title,
    pageSetup,
    lexical: bridge?.getEditorStateJson() ?? (EMPTY_LEXICAL_STATE as SerializedEditorState),
    markdown: bridge?.exportMarkdown() ?? '',
  }
}

/** Live Lexical wins on reopen. Markdown-only payloads (Copilot Check, Length & time) still import markdown. */
export function applyDocEditorPayload(
  bridge: DocEditorLexicalBridge | null,
  payload: DocEditorContextPayload,
  setTitle: (title: string) => void,
  setPageSetup: (setup: PageSetup) => void,
) {
  if (payload.title) setTitle(payload.title)
  if (payload.pageSetup) setPageSetup(payload.pageSetup)
  const kind = docEditorLoadKind(payload)
  if (kind === 'lexical') {
    bridge?.loadEditorStateJson(payload.lexical)
    return
  }
  if (kind === 'markdown') {
    bridge?.loadEditorStateJson(null, { markdown: payload.markdown })
  }
}

export const DEFAULT_DOC_PAGE_SETUP = DEFAULT_PAGE_SETUP
