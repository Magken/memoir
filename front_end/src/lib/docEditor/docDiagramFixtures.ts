import { DRAW_SCENE_COMPLEX } from '../editorContext/fixtures/complex'
import type { DocDiagramCodeLanguage } from './diagramCodeLanguages'
import { $createDiagramCodeNode } from './nodes/diagramCodeNode'

/** Excalidraw scene JSON shared by Native JSON→Doc and Markdown→Doc regression fixtures. */
export const DOC_FIXTURE_EXCALIDRAW_SCENE = JSON.stringify(
  {
    type: DRAW_SCENE_COMPLEX.type,
    version: DRAW_SCENE_COMPLEX.version,
    elements: DRAW_SCENE_COMPLEX.elements.slice(0, 3),
    appState: DRAW_SCENE_COMPLEX.appState,
    files: DRAW_SCENE_COMPLEX.files,
  },
  null,
  2,
)

/** Mermaid source shared by Native JSON→Doc and Markdown→Doc regression fixtures. */
export const DOC_FIXTURE_MERMAID_SOURCE = `flowchart LR
  JSON --> Doc
  MD --> Doc
  CSV --> Doc
  MMD --> Doc`

export const DOC_FIXTURE_DIAGRAM_SPECS: ReadonlyArray<{
  language: DocDiagramCodeLanguage
  source: string
}> = [
  { language: 'excalidraw', source: DOC_FIXTURE_EXCALIDRAW_SCENE },
  { language: 'mermaid', source: DOC_FIXTURE_MERMAID_SOURCE },
]

export function $createDocFixtureDiagramNode(language: DocDiagramCodeLanguage) {
  const spec = DOC_FIXTURE_DIAGRAM_SPECS.find((entry) => entry.language === language)
  if (!spec) throw new Error(`Unknown doc fixture diagram language: ${language}`)
  return $createDiagramCodeNode(spec.language, spec.source)
}
