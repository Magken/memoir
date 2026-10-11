import { DEFAULT_PAGE_SETUP } from '../../docEditor/pageSetup'
import { isEditorContextEnvelope } from '../envelope'
import { DOC_LEXICAL_FIXTURE } from '../fixtures'
import type { DocEditorPayload } from '../types'
import { csvToMarkdownTable } from './grid'

export function convertJsonToDoc(input: unknown): { payload: DocEditorPayload; warnings?: string[] } {
  if (isEditorContextEnvelope(input) && input.kind === 'doc') {
    return { payload: input.payload as DocEditorPayload }
  }
  if (input && typeof input === 'object' && 'lexical' in input) {
    return { payload: input as DocEditorPayload }
  }
  if (input && typeof input === 'object' && 'root' in input) {
    return { payload: { lexical: input, pageSetup: DEFAULT_PAGE_SETUP } }
  }
  return {
    payload: { lexical: DOC_LEXICAL_FIXTURE, pageSetup: DEFAULT_PAGE_SETUP },
    warnings: ['JSON did not match doc shape — loaded sample document.'],
  }
}

export function convertMarkdownToDocPayload(
  markdown: string,
  opts?: { title?: string; pageSetup?: import('../../docEditor/pageSetup').PageSetup },
): { payload: DocEditorPayload & { markdown: string; title?: string }; warnings?: string[] } {
  return {
    payload: {
      pageSetup: opts?.pageSetup ?? DEFAULT_PAGE_SETUP,
      markdown,
      ...(opts?.title ? { title: opts.title } : {}),
    },
  }
}

function isDocMarkdownPayload(input: unknown): input is DocEditorPayload & { markdown: string; title?: string } {
  return (
    input !== null &&
    typeof input === 'object' &&
    'markdown' in input &&
    typeof (input as { markdown?: unknown }).markdown === 'string'
  )
}

export function resolveDocMarkdownImport(input: unknown, text: string | null) {
  if (isDocMarkdownPayload(input)) {
    return {
      payload: {
        pageSetup: input.pageSetup ?? DEFAULT_PAGE_SETUP,
        markdown: input.markdown,
        ...(input.title ? { title: input.title } : {}),
      },
    }
  }
  return convertMarkdownToDocPayload(text ?? String(input))
}

export function convertMermaidToDocPayload(source: string): { payload: DocEditorPayload & { markdown: string }; warnings?: string[] } {
  const markdown = `# Mermaid diagram\n\n\`\`\`mermaid\n${source.trim()}\n\`\`\`\n`
  return convertMarkdownToDocPayload(markdown)
}

export function convertCsvToDocPayload(csv: string): { payload: DocEditorPayload & { markdown?: string }; warnings?: string[] } {
  const table = csvToMarkdownTable(csv)
  const markdown = `# Imported table\n\n${table}\n`
  return convertMarkdownToDocPayload(markdown)
}
