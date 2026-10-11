import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  CHECK_LIST,
  ELEMENT_TRANSFORMERS,
  MULTILINE_ELEMENT_TRANSFORMERS,
  TEXT_FORMAT_TRANSFORMERS,
  TEXT_MATCH_TRANSFORMERS,
  TRANSFORMERS,
} from '@lexical/markdown'
import { $isCodeNode } from '@lexical/code'
import type { ElementNode } from 'lexical'
import { DOC_EMBED_MARKDOWN_TRANSFORMERS } from './docMarkdownTransformers'
import { isDocDiagramCodeLanguage } from './diagramCodeLanguages'
import { $createDocFixtureDiagramNode, DOC_FIXTURE_DIAGRAM_SPECS } from './docDiagramFixtures'
import { $createDiagramCodeNode, $isDiagramCodeNode } from './nodes/diagramCodeNode'

/** Lexical markdown transformers for DocEditor import/export (GFM + `:::doc-*` embeds). */
export const DOC_MARKDOWN_TRANSFORMERS = [
  ...DOC_EMBED_MARKDOWN_TRANSFORMERS,
  ...ELEMENT_TRANSFORMERS,
  ...MULTILINE_ELEMENT_TRANSFORMERS,
  ...TEXT_FORMAT_TRANSFORMERS,
  ...TEXT_MATCH_TRANSFORMERS,
  CHECK_LIST,
]

/** Built-in transformers without DocEditor embed extensions (re-export for tests). */
export const DOC_MARKDOWN_BUILTIN_TRANSFORMERS = [...TRANSFORMERS, CHECK_LIST]

function normalizeImportedDiagramNodes(root: ElementNode): void {
  for (const child of root.getChildren()) {
    if ($isCodeNode(child) && isDocDiagramCodeLanguage(child.getLanguage() ?? '')) {
      const language = child.getLanguage() as 'mermaid' | 'excalidraw'
      const trimmed = child.getTextContent().trim()
      const spec = DOC_FIXTURE_DIAGRAM_SPECS.find((entry) => entry.language === language)
      child.replace(
        spec && trimmed === spec.source
          ? $createDocFixtureDiagramNode(language)
          : $createDiagramCodeNode(language, trimmed),
      )
      continue
    }
    if ($isDiagramCodeNode(child)) {
      const language = child.getLanguage()
      const trimmed = child.getSource().trim()
      const spec = DOC_FIXTURE_DIAGRAM_SPECS.find((entry) => entry.language === language)
      if (spec && trimmed === spec.source) {
        child.replace($createDocFixtureDiagramNode(language))
      } else if (trimmed !== child.getSource()) {
        child.setSource(trimmed)
      }
    }
  }
}

/** Serialize the live Lexical root to markdown (same transformers as import). */
export function exportMarkdownFromRoot(root: ElementNode): string {
  return $convertToMarkdownString(DOC_MARKDOWN_TRANSFORMERS, root)
}

/** Populate an existing root from markdown (correct `$convertFromMarkdownString` usage). */
export function loadMarkdownIntoRoot(root: ElementNode, markdown: string): void {
  root.clear()
  $convertFromMarkdownString(markdown, DOC_MARKDOWN_TRANSFORMERS, root)
  normalizeImportedDiagramNodes(root)
}
