import type { PageSetup } from '../../docEditor/pageSetup'
import {
  buildDrawOrgChartScene,
  buildDrawPlatformArchitectureScene,
} from './drawComplexScenes'

/** Rich Lexical state — headings, lists, quote, code, formatted text. */
export const DOC_LEXICAL_COMPLEX = {
  root: {
    children: [
      {
        children: [
          {
            detail: 0,
            format: 0,
            mode: 'normal',
            style: '',
            text: 'Quarterly rollout brief',
            type: 'text',
            version: 1,
          },
        ],
        direction: 'ltr',
        format: '',
        indent: 0,
        type: 'heading',
        version: 1,
        tag: 'h1',
      },
      {
        children: [
          {
            detail: 0,
            format: 1,
            mode: 'normal',
            style: '',
            text: 'Priority',
            type: 'text',
            version: 1,
          },
          {
            detail: 0,
            format: 0,
            mode: 'normal',
            style: '',
            text: ' — ship editor-context I/O with ',
            type: 'text',
            version: 1,
          },
          {
            detail: 0,
            format: 2,
            mode: 'normal',
            style: '',
            text: 'lossless',
            type: 'text',
            version: 1,
          },
          {
            detail: 0,
            format: 0,
            mode: 'normal',
            style: '',
            text: ' grid and draw paths.',
            type: 'text',
            version: 1,
          },
        ],
        direction: 'ltr',
        format: '',
        indent: 0,
        type: 'paragraph',
        version: 1,
        textFormat: 0,
        textStyle: '',
      },
      {
        children: [
          {
            children: [
              {
                detail: 0,
                format: 0,
                mode: 'normal',
                style: '',
                text: 'Wire titlebar export menus',
                type: 'text',
                version: 1,
              },
            ],
            direction: 'ltr',
            format: '',
            indent: 0,
            type: 'listitem',
            version: 1,
            value: 1,
          },
          {
            children: [
              {
                detail: 0,
                format: 0,
                mode: 'normal',
                style: '',
                text: 'Add conversion regression script',
                type: 'text',
                version: 1,
              },
            ],
            direction: 'ltr',
            format: '',
            indent: 0,
            type: 'listitem',
            version: 1,
            value: 2,
          },
        ],
        direction: 'ltr',
        format: '',
        indent: 0,
        type: 'list',
        version: 1,
        listType: 'bullet',
        start: 1,
        tag: 'ul',
      },
      {
        children: [
          {
            detail: 0,
            format: 0,
            mode: 'normal',
            style: '',
            text: 'Measure adoption in theme showcases.',
            type: 'text',
            version: 1,
          },
        ],
        direction: 'ltr',
        format: '',
        indent: 0,
        type: 'quote',
        version: 1,
      },
      {
        children: [
          {
            detail: 0,
            format: 0,
            mode: 'normal',
            style: '',
            text: 'const envelope = createEnvelope("doc", payload)',
            type: 'text',
            version: 1,
          },
        ],
        direction: 'ltr',
        format: '',
        indent: 0,
        type: 'code',
        version: 1,
        language: 'typescript',
      },
    ],
    direction: 'ltr',
    format: '',
    indent: 0,
    type: 'root',
    version: 1,
  },
}

export const DOC_PAGE_SETUP_COMPLEX: PageSetup = {
  pageSize: 'Letter',
  orientation: 'landscape',
  marginInches: 0.75,
}

export const GRID_SHEET_COMPLEX = {
  columns: [
    { id: 'sku', title: 'SKU', width: 96 },
    { id: 'name', title: 'Product name', width: 180 },
    { id: 'qty', title: 'Qty', width: 72 },
    { id: 'unit', title: 'Unit price', width: 96 },
    { id: 'region', title: 'Region', width: 110 },
    { id: 'status', title: 'Status', width: 100 },
  ],
  rows: [
    ['SKU-100', 'Noise-cancelling headset', '42', '149.99', 'NA-East', 'In stock'],
    ['SKU-220', 'Mechanical keyboard, RGB', '18', '89.50', 'EU-West', 'Low stock'],
    ['SKU-305', 'USB-C hub "Pro"', '120', '34.00', 'APAC', 'In stock'],
    ['SKU-410', '4K webcam', '7', '199.00', 'NA-West', 'Backorder'],
    ['SKU-512', 'Standing desk mat', '65', '49.99', 'LATAM', 'In stock'],
    ['SKU-601', 'Monitor arm (dual)', '31', '129.00', 'EU-East', 'In stock'],
    ['SKU-702', 'Docking station', '15', '249.00', 'NA-East', 'Discontinued'],
    ['SKU-815', 'Webcam light', '88', '29.99', 'APAC', 'In stock'],
  ],
}

export const GRID_CSV_COMPLEX = `SKU,Product name,Qty,Unit price,Region,Status
SKU-100,Noise-cancelling headset,42,149.99,NA-East,In stock
SKU-220,"Mechanical keyboard, RGB",18,89.50,EU-West,Low stock
SKU-305,"USB-C hub ""Pro""",120,34.00,APAC,In stock
SKU-410,4K webcam,7,199.00,NA-West,Backorder`

export const DRAW_SCENE_COMPLEX = buildDrawPlatformArchitectureScene()

export const DRAW_SCENE_ORG_COMPLEX = buildDrawOrgChartScene()

export const MARKDOWN_COMPLEX = `# Quarterly rollout

Cross-format **editor context** checks cover doc, grid, draw, markdown, and mermaid hosts.

## Checklist

1. Titlebar Save is a single ghost icon
2. Export menu rows show per-format icons
3. Regression script covers every conversion edge

> Blockquote: partial markdown fidelity is expected for custom Lexical embeds.

\`\`\`typescript
import { importContext } from './importExportManager'
\`\`\`

| SKU | Region | Status |
| --- | --- | --- |
| SKU-100 | NA-East | In stock |
| SKU-220 | EU-West | Low stock |

\`\`\`mermaid
flowchart LR
  CSV --> Grid
  Grid --> Doc
  Mermaid --> Draw
\`\`\`
`

export const MARKDOWN_LATEX_COMPLEX = String.raw`\documentclass{article}
\title{Editor Context Export}
\author{Theme Showcase}
\begin{document}
\maketitle
\section{Goals}
Exercise \textbf{LaTeX} export with full document properties.
\end{document}
`

export const MERMAID_COMPLEX = `flowchart TB
  subgraph intake["Intake & ingestion"]
    A[CSV upload] --> B[Parse & validate]
    C[Markdown / MDX] --> D[AST transform]
    E[Mermaid source] --> F[Diagram lexer]
    B --> G{Schema OK?}
    G -->|yes| H[Sheet model]
    G -->|no| I[Error tray]
    F --> J[Flowchart IR]
    D --> K[MD preview AST]
  end

  subgraph editors["Editor workbenches"]
    H --> L[DataGridEditor]
    J --> M[DrawCanvas]
    K --> N[MarkdownRenderer]
    O[Lexical JSON] --> P[DocEditor]
    Q[Workspace JSON] --> R[CodeEditor]
    L --> S[Cell edit + fill]
    M --> T[Excalidraw scene]
    N --> U[Split preview]
    P --> V[Page setup + embeds]
    R --> W[Monaco tabs + ZIP]
  end

  subgraph spine["Context spine"]
    L --> X{Envelope}
    M --> X
    N --> X
    P --> X
    R --> X
    X --> Y[importExportManager]
    Y --> Z[routeImport]
    Z --> AA[Per-kind adapter]
  end

  subgraph mcp["MCP stub"]
    AB[editor://catalog/kind] --> AC[Feature matrix]
    AD[editor_context_import] --> Y
    Y --> AE[editor_context_export]
    AF[editor://fixture/id] --> AD
  end

  subgraph export["Export formats"]
    AA --> AG[doc: html pdf md]
    AA --> AH[grid: csv json]
    AA --> AI[draw: excalidraw png]
    AA --> AJ[code: zip json]
    AA --> AK[md / mmd text]
  end

  I -.-> AD
  AE --> AL[Download tray]
  AC -.-> M
  style intake fill:#e7f5ff,stroke:#1971c2
  style editors fill:#ebfbee,stroke:#2f9e44
  style spine fill:#fff3bf,stroke:#e67700
  style mcp fill:#f3d9fa,stroke:#9c36b5
  style export fill:#ffe8cc,stroke:#d9480f
`
